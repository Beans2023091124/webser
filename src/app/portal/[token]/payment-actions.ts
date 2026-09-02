"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getStripe, appUrl, toCents } from "@/lib/stripe";

export type CheckoutResult = { ok: boolean; url?: string; error?: string; needsSetup?: boolean };

/**
 * Starts Stripe Checkout for the one-time build fee.
 *
 * Called from the client portal, which is authenticated only by the portal
 * token — so the token is the authorisation, and the amount comes from the
 * project record rather than anything the browser sends.
 */
export async function startBuildCheckout(token: string): Promise<CheckoutResult> {
  const stripe = getStripe();
  if (!stripe) {
    return {
      ok: false,
      needsSetup: true,
      error: "Payments aren't set up yet. Please get in touch and we'll send an invoice directly.",
    };
  }

  const project = await prisma.project.findUnique({
    where: { portalToken: token },
    include: { invoices: { where: { type: "FULL" }, orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!project) return { ok: false, error: "We couldn't find that project." };

  const invoice = project.invoices[0];
  if (invoice?.status === "PAID") {
    return { ok: false, error: "This has already been paid — thank you!" };
  }

  const amount = toCents(project.price.toString());
  if (amount < 50) return { ok: false, error: "That amount is too small to charge." };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      // Reusing the customer keeps the later subscription on the same record.
      ...(project.stripeCustomerId
        ? { customer: project.stripeCustomerId }
        : project.contactEmail
        ? { customer_email: project.contactEmail }
        : {}),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amount,
            product_data: {
              name: `Website for ${project.businessName}`,
              description: "One-time design and build fee.",
            },
          },
        },
      ],
      // The webhook needs to know which project and invoice to settle.
      metadata: { projectId: project.id, invoiceId: invoice?.id ?? "", kind: "build" },
      success_url: `${appUrl()}/portal/${token}?paid=1`,
      cancel_url: `${appUrl()}/portal/${token}?cancelled=1`,
    });

    if (invoice && session.url) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { stripeCheckoutUrl: session.url, status: "SENT" },
      });
    }

    return { ok: true, url: session.url ?? undefined };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: `Stripe couldn't start checkout: ${msg}` };
  }
}

/** Starts the recurring maintenance subscription. */
export async function startMaintenanceCheckout(token: string): Promise<CheckoutResult> {
  const stripe = getStripe();
  if (!stripe) {
    return {
      ok: false,
      needsSetup: true,
      error: "Payments aren't set up yet. Please get in touch and we'll arrange it directly.",
    };
  }

  const project = await prisma.project.findUnique({
    where: { portalToken: token },
    include: { maintenance: true },
  });
  if (!project) return { ok: false, error: "We couldn't find that project." };
  if (project.maintenance?.status === "ACTIVE") {
    return { ok: false, error: "Your maintenance plan is already active." };
  }
  if (!project.monthlyPrice) {
    return { ok: false, error: "No maintenance price has been set for this project." };
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      ...(project.stripeCustomerId
        ? { customer: project.stripeCustomerId }
        : project.contactEmail
        ? { customer_email: project.contactEmail }
        : {}),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: toCents(project.monthlyPrice.toString()),
            recurring: { interval: "month" },
            product_data: {
              name: `Website maintenance — ${project.businessName}`,
              description: "Edits, updates, and hosting support. Cancel any time.",
            },
          },
        },
      ],
      metadata: { projectId: project.id, kind: "maintenance" },
      success_url: `${appUrl()}/portal/${token}?subscribed=1`,
      cancel_url: `${appUrl()}/portal/${token}?cancelled=1`,
    });

    return { ok: true, url: session.url ?? undefined };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: `Stripe couldn't start checkout: ${msg}` };
  }
}

/** Server action wrapper so a form can post straight into Checkout. */
export async function goToBuildCheckout(token: string) {
  const res = await startBuildCheckout(token);
  if (res.url) redirect(res.url);
}

export async function goToMaintenanceCheckout(token: string) {
  const res = await startMaintenanceCheckout(token);
  if (res.url) redirect(res.url);
}
