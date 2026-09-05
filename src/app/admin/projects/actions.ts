"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { nanoid } from "nanoid";
import { ProjectStatus, ProspectStatus, RevisionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { publishedSiteUrl } from "@/lib/host";
import { requireAdmin } from "@/lib/require-admin";
import { notifyProjectStatus } from "@/lib/email";
import { settleBuildPayment, activateMaintenance, MANUAL_METHODS } from "@/lib/payments";

/**
 * Turns a won prospect into a client project.
 *
 * The portal token is the only thing guarding the client's page, so it's a
 * long random string rather than the project id — ids are sequential-ish and
 * guessable, and this URL gets forwarded around in email.
 */
export async function createProjectFromProspect(prospectId: string) {
  const admin = await requireAdmin();

  const existing = await prisma.project.findUnique({ where: { prospectId } });
  if (existing) redirect(`/admin/projects/${existing.id}`);

  const prospect = await prisma.prospect.findUniqueOrThrow({
    where: { id: prospectId },
    include: { previews: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  const pkg = await prisma.package.findFirst({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  const price = pkg?.price ?? prospect.estimatedPrice ?? 100;
  const monthly = pkg?.monthlyPrice ?? null;

  const project = await prisma.project.create({
    data: {
      portalToken: nanoid(32),
      prospectId: prospect.id,
      previewId: prospect.previews[0]?.id ?? null,
      packageId: pkg?.id ?? null,
      businessName: prospect.businessName,
      contactName: prospect.contactName,
      contactEmail: prospect.email,
      contactPhone: prospect.phone,
      price,
      monthlyPrice: monthly,
      status: ProjectStatus.PAYMENT_PENDING,
      invoices: {
        create: {
          amount: price,
          type: "FULL",
          status: "SENT",
        },
      },
    },
  });

  if (prospect.status !== ProspectStatus.WON) {
    await prisma.prospect.update({
      where: { id: prospect.id },
      data: { status: ProspectStatus.WON },
    });
  }

  await prisma.activity.create({
    data: {
      prospectId: prospect.id,
      type: "SYSTEM",
      description: "Converted to a client project.",
      createdById: admin.id,
    },
  });

  revalidatePath("/admin/projects");
  revalidatePath(`/admin/prospects/${prospect.id}`);
  redirect(`/admin/projects/${project.id}`);
}

export async function updateProjectStatus(projectId: string, status: ProjectStatus) {
  await requireAdmin();

  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      status,
      // Record the moment of approval so the portal can show it.
      ...(status === ProjectStatus.APPROVED ? { approvedAt: new Date() } : {}),
    },
  });

  // Fire-and-forget: the client is told the site is ready, but a mail
  // failure must not make the stage change look like it failed.
  await notifyProjectStatus(projectId, status);

  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath("/admin/projects");
  revalidatePath(`/portal/${project.portalToken}`);
  return project;
}

export async function updateProjectDetails(projectId: string, formData: FormData) {
  await requireAdmin();

  const str = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };
  const num = (k: string) => {
    const v = formData.get(k);
    const n = Number(v);
    return typeof v === "string" && v.trim() && Number.isFinite(n) ? n : null;
  };

  await prisma.project.update({
    where: { id: projectId },
    data: {
      contactName: str("contactName"),
      contactEmail: str("contactEmail"),
      contactPhone: str("contactPhone"),
      price: num("price") ?? 0,
      monthlyPrice: num("monthlyPrice"),
      liveUrl: str("liveUrl"),
      adminNotes: str("adminNotes"),
    },
    select: { portalToken: true },
  }).then((p) => {
    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath(`/portal/${p.portalToken}`);
  });
}

export async function setRevisionStatus(revisionId: string, status: RevisionStatus) {
  await requireAdmin();

  const revision = await prisma.revision.update({
    where: { id: revisionId },
    data: { status, resolvedAt: status === "DONE" ? new Date() : null },
    include: { project: true },
  });

  revalidatePath(`/admin/projects/${revision.projectId}`);
  revalidatePath(`/portal/${revision.project.portalToken}`);
  return revision;
}

export async function addRevisionAsAdmin(projectId: string, formData: FormData) {
  await requireAdmin();

  const description = String(formData.get("description") ?? "").trim();
  if (!description) return;

  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });

  await prisma.revision.create({
    data: { projectId, description: description.slice(0, 3000), requestedBy: "ADMIN" },
  });

  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/portal/${project.portalToken}`);
}

/** Regenerates the portal link, invalidating any copy already sent out. */
export async function rotatePortalToken(projectId: string) {
  await requireAdmin();
  const project = await prisma.project.update({
    where: { id: projectId },
    data: { portalToken: nanoid(32) },
  });
  revalidatePath(`/admin/projects/${projectId}`);
  return project.portalToken;
}

/**
 * Release a customer's web address from their project.
 *
 * A domain can only be attached to one project, so an address left on an old
 * or abandoned project blocks it from being used anywhere else -- and from the
 * portal the client just sees "already connected to another site" with no way
 * forward, because naming the other business to them would leak a different
 * customer's details.
 *
 * The host is deliberately not told to detach: it keeps account-level
 * ownership either way, and adding a released name back is refused as a
 * conflict, which would leave the domain owned but unrouted.
 */
export async function releaseDomain(projectId: string) {
  await requireAdmin();

  const domain = await prisma.domain.findUnique({
    where: { projectId },
    select: { domainName: true },
  });
  if (!domain) return;

  await prisma.domain.delete({ where: { projectId } });

  // Put the site back on the address it can always answer on.
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { preview: { select: { slug: true } } },
  });
  if (project?.preview) {
    await prisma.project.update({
      where: { id: projectId },
      data: { liveUrl: publishedSiteUrl(project.preview.slug) },
    });
  }

  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath("/admin/projects");
}

export async function deleteProject(projectId: string) {
  await requireAdmin();
  await prisma.project.delete({ where: { id: projectId } });
  revalidatePath("/admin/projects");
  redirect("/admin/projects");
}

// ---------------------------------------------------------------------------
// Payments taken outside Stripe
// ---------------------------------------------------------------------------

/**
 * Recording a Venmo, Cash App or cash payment by hand.
 *
 * These run the same settlement functions as the Stripe webhook, so a project
 * paid by hand advances through the pipeline exactly like a card payment --
 * the money arriving somewhere else is the only difference, and the rest of
 * the app never has to know about it.
 *
 * Admin-only, and deliberately not reachable from the portal. The developer
 * shortcut in the portal is the thing this replaces for real use: that one is
 * env-gated and off in production, because anyone holding a portal link could
 * otherwise mark their own project paid.
 */

/** Keeps free text out of the method column. Anything unrecognised is "Other". */
function readMethod(formData: FormData): string {
  const raw = String(formData.get("method") ?? "").trim();
  return (MANUAL_METHODS as readonly string[]).includes(raw) ? raw : "Other";
}

function readReference(formData: FormData): string | null {
  const raw = String(formData.get("reference") ?? "").trim();
  return raw ? raw.slice(0, 200) : null;
}

/**
 * Reads the amount actually received, falling back to what was asked for.
 *
 * A hand-taken payment is not always the invoiced figure -- a haggled price, a
 * partial payment, a rounded-up tip -- and the Payments card totals what was
 * received, so recording the real number keeps that total honest.
 */
function readAmount(formData: FormData, fallback: number): number {
  const raw = Number(String(formData.get("amount") ?? "").trim());
  if (!Number.isFinite(raw) || raw <= 0) return fallback;
  return Math.min(raw, 1_000_000);
}

/** Marks the one-time build fee paid, by whatever means it actually arrived. */
export async function recordManualPayment(projectId: string, formData: FormData) {
  await requireAdmin();

  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: { invoices: { where: { type: "FULL" }, orderBy: { createdAt: "desc" }, take: 1 } },
  });

  let invoice = project.invoices[0];
  if (invoice?.status === "PAID") return; // Already settled; nothing to do.

  const amount = readAmount(formData, Number(project.price));

  // Every project gets a FULL invoice when it is created, but a project
  // restored from an older backup might not have one -- and a payment with no
  // invoice row would vanish from the takings.
  if (!invoice) {
    invoice = await prisma.invoice.create({
      data: { projectId, amount, type: "FULL", status: "SENT" },
    });
  } else {
    await prisma.invoice.update({ where: { id: invoice.id }, data: { amount } });
  }

  await settleBuildPayment(projectId, {
    invoiceId: invoice.id,
    method: readMethod(formData),
    reference: readReference(formData),
  });

  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath("/admin/projects");
  revalidatePath(`/portal/${project.portalToken}`);
  revalidatePath("/admin/dashboard");
}

/**
 * Starts or renews the monthly plan against a payment taken by hand.
 *
 * Without Stripe there is no subscription to renew itself, so this records one
 * month and sets the next billing date a month out. It is a reminder to go and
 * ask for the next one, not an automatic charge.
 */
export async function recordManualMaintenance(projectId: string, formData: FormData) {
  await requireAdmin();

  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: { maintenance: true },
  });
  if (!project.monthlyPrice) return;

  const amount = readAmount(formData, Number(project.monthlyPrice));

  // Renewals count forward from the date already on the plan where there is
  // one, so paying early doesn't quietly cost the client part of a month.
  const from =
    project.maintenance?.nextBillingDate && project.maintenance.nextBillingDate > new Date()
      ? new Date(project.maintenance.nextBillingDate)
      : new Date();
  const next = new Date(from);
  next.setMonth(next.getMonth() + 1);

  await activateMaintenance(projectId, { nextBillingDate: next });

  await prisma.invoice.create({
    data: {
      projectId,
      amount,
      type: "MAINTENANCE",
      status: "PAID",
      paidAt: new Date(),
      method: readMethod(formData),
      reference: readReference(formData),
    },
  });

  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath("/admin/projects");
  revalidatePath(`/portal/${project.portalToken}`);
  revalidatePath("/admin/dashboard");
}

/**
 * Undoes a payment that was recorded by hand.
 *
 * Refuses anything without a `method`, which is the marker this app puts on
 * hand-recorded payments -- so a real Stripe payment can never be unpicked
 * here, where the books would then disagree with Stripe's.
 *
 * The project's stage is left alone. Recording the payment may have moved it
 * on, work may have happened since, and dragging a half-built project back to
 * "payment pending" would lose more than it fixed.
 */
export async function reverseManualPayment(projectId: string, invoiceId: string) {
  await requireAdmin();

  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.projectId !== projectId || !invoice.method) return;

  if (invoice.type === "MAINTENANCE") {
    await prisma.invoice.delete({ where: { id: invoiceId } });
  } else {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: "SENT", paidAt: null, method: null, reference: null },
    });
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath("/admin/projects");
  if (project) revalidatePath(`/portal/${project.portalToken}`);
  revalidatePath("/admin/dashboard");
}
