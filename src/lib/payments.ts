import { ProjectStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Payment settlement.
 *
 * Both the Stripe webhook and the developer "simulate payment" control call
 * these functions, so testing the dev path exercises exactly the same code
 * that runs when real money arrives — a simulation that took a different
 * route would prove nothing.
 */

/**
 * Whether the developer payment shortcut is available.
 *
 * On by default in development; off in production unless someone deliberately
 * sets ENABLE_DEV_PAYMENTS. A "mark as paid" button reachable in production
 * would let anyone with the portal link get a website for free.
 */
export function devPaymentsEnabled(): boolean {
  if (process.env.ENABLE_DEV_PAYMENTS === "true") return true;
  return process.env.NODE_ENV !== "production";
}

export async function settleBuildPayment(
  projectId: string,
  opts: { invoiceId?: string | null; paymentIntentId?: string | null; customerId?: string | null } = {}
) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { invoices: { where: { type: "FULL" }, orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!project) return null;

  const invoiceId = opts.invoiceId || project.invoices[0]?.id;

  if (invoiceId) {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: "PAID",
        paidAt: new Date(),
        stripePaymentIntentId: opts.paymentIntentId ?? null,
      },
    });
  }

  if (opts.customerId) {
    await prisma.project.update({
      where: { id: projectId },
      data: { stripeCustomerId: opts.customerId },
    });
  }

  // Advance the pipeline, but never drag a project backwards — the build may
  // already be further along than the payment record suggests.
  if (project.status === ProjectStatus.PAYMENT_PENDING) {
    await prisma.project.update({
      where: { id: projectId },
      data: { status: ProjectStatus.INFORMATION_NEEDED },
    });
  }

  return prisma.project.findUnique({ where: { id: projectId } });
}

export async function activateMaintenance(
  projectId: string,
  opts: { subscriptionId?: string | null; nextBillingDate?: Date | null } = {}
) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { maintenance: true },
  });
  if (!project) return null;

  const monthlyPrice = project.monthlyPrice ?? 25;

  if (project.maintenance) {
    await prisma.maintenancePlan.update({
      where: { id: project.maintenance.id },
      data: {
        status: "ACTIVE",
        monthlyPrice,
        stripeSubscriptionId: opts.subscriptionId ?? project.maintenance.stripeSubscriptionId,
        nextBillingDate: opts.nextBillingDate ?? project.maintenance.nextBillingDate,
      },
    });
  } else {
    await prisma.maintenancePlan.create({
      data: {
        projectId,
        monthlyPrice,
        status: "ACTIVE",
        stripeSubscriptionId: opts.subscriptionId ?? null,
        nextBillingDate: opts.nextBillingDate ?? null,
      },
    });
  }

  return prisma.maintenancePlan.findFirst({ where: { projectId } });
}
