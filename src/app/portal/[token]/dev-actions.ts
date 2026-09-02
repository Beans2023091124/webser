"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { devPaymentsEnabled, settleBuildPayment, activateMaintenance } from "@/lib/payments";

export type DevResult = { ok: boolean; message?: string; error?: string };

/**
 * Developer shortcut that settles a payment without Stripe.
 *
 * It deliberately calls the same settlement functions as the webhook, so
 * walking through this proves out the real post-payment behaviour. The env
 * guard is checked here on the server — hiding the button in the UI is not a
 * control, since anyone can invoke a server action directly.
 */
export async function devMarkBuildPaid(token: string): Promise<DevResult> {
  if (!devPaymentsEnabled()) {
    return { ok: false, error: "Developer payments are disabled." };
  }

  const project = await prisma.project.findUnique({ where: { portalToken: token } });
  if (!project) return { ok: false, error: "Project not found." };

  await settleBuildPayment(project.id, { paymentIntentId: "pi_simulated_dev" });

  revalidatePath(`/portal/${token}`);
  revalidatePath(`/admin/projects/${project.id}`);
  revalidatePath("/admin/projects");
  return { ok: true, message: "Marked as paid. This is a test payment — no money moved." };
}

export async function devStartMaintenance(token: string): Promise<DevResult> {
  if (!devPaymentsEnabled()) {
    return { ok: false, error: "Developer payments are disabled." };
  }

  const project = await prisma.project.findUnique({ where: { portalToken: token } });
  if (!project) return { ok: false, error: "Project not found." };
  if (!project.monthlyPrice) return { ok: false, error: "No monthly price set on this project." };

  const next = new Date();
  next.setMonth(next.getMonth() + 1);

  await activateMaintenance(project.id, {
    subscriptionId: "sub_simulated_dev",
    nextBillingDate: next,
  });
  await prisma.invoice.create({
    data: {
      projectId: project.id,
      amount: project.monthlyPrice,
      type: "MAINTENANCE",
      status: "PAID",
      paidAt: new Date(),
    },
  });

  revalidatePath(`/portal/${token}`);
  revalidatePath(`/admin/projects/${project.id}`);
  revalidatePath("/admin/projects");
  return { ok: true, message: "Maintenance plan activated. Test only — no money moved." };
}

/**
 * Publishes without a working domain, so the tail of the flow can be walked
 * before hosting exists. The real path checks DNS; this one skips that check
 * and nothing else, so what happens after is the production behaviour.
 */
export async function devForceDomainLive(token: string): Promise<DevResult> {
  if (!devPaymentsEnabled()) {
    return { ok: false, error: "Developer payments are disabled." };
  }

  const project = await prisma.project.findUnique({
    where: { portalToken: token },
    include: { domain: true, preview: true },
  });
  if (!project) return { ok: false, error: "Project not found." };

  const domainName = project.domain?.domainName;
  if (domainName) {
    await prisma.domain.update({
      where: { projectId: project.id },
      data: { dnsStatus: "VERIFIED", sslStatus: "ACTIVE", deploymentStatus: "LIVE" },
    });
  }

  await prisma.project.update({
    where: { id: project.id },
    data: {
      status: "LIVE",
      liveUrl: domainName
        ? `https://${domainName}`
        : project.preview
        ? `/p/${project.preview.slug}`
        : null,
    },
  });

  revalidatePath(`/portal/${token}`);
  revalidatePath(`/admin/projects/${project.id}`);
  revalidatePath("/admin/projects");
  return {
    ok: true,
    message: domainName
      ? `Marked ${domainName} as verified and the site as live. DNS was not actually checked.`
      : "Marked as live on the preview address. DNS was not actually checked.",
  };
}

/** Resets a project back to unpaid so the flow can be walked again. */
export async function devResetPayments(token: string): Promise<DevResult> {
  if (!devPaymentsEnabled()) {
    return { ok: false, error: "Developer payments are disabled." };
  }

  const project = await prisma.project.findUnique({ where: { portalToken: token } });
  if (!project) return { ok: false, error: "Project not found." };

  await prisma.invoice.deleteMany({ where: { projectId: project.id, type: "MAINTENANCE" } });
  await prisma.maintenancePlan.deleteMany({ where: { projectId: project.id } });
  await prisma.domain.deleteMany({ where: { projectId: project.id } });
  await prisma.invoice.updateMany({
    where: { projectId: project.id, type: "FULL" },
    data: { status: "SENT", paidAt: null, stripePaymentIntentId: null },
  });
  await prisma.project.update({
    where: { id: project.id },
    data: {
      status: "PAYMENT_PENDING",
      approvedAt: null,
      stripeCustomerId: null,
      liveUrl: null,
    },
  });

  revalidatePath(`/portal/${token}`);
  revalidatePath(`/admin/projects/${project.id}`);
  revalidatePath("/admin/projects");
  return { ok: true, message: "Reset to unpaid. You can walk the flow again from the top." };
}
