"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { nanoid } from "nanoid";
import { ProjectStatus, ProspectStatus, RevisionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { publishedSiteUrl } from "@/lib/host";
import { requireAdmin } from "@/lib/require-admin";
import { notifyProjectStatus } from "@/lib/email";

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
