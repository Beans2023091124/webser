import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { settleBuildPayment, activateMaintenance } from "@/lib/payments";

/**
 * Stripe webhook.
 *
 * This is the only thing that marks money as received — the browser returning
 * to a success URL proves nothing, since anyone can visit that URL directly.
 * Signature verification is mandatory: without it, a forged POST could mark
 * any invoice paid.
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!stripe || !secret) {
    return new Response("Stripe is not configured", { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  // The raw body is required — parsing it first would break verification.
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "invalid";
    return new Response(`Signature verification failed: ${msg}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const projectId = session.metadata?.projectId;
        const kind = session.metadata?.kind;
        if (!projectId) break;

        // Keep the customer so later charges land on the same Stripe record.
        if (typeof session.customer === "string") {
          await prisma.project.update({
            where: { id: projectId },
            data: { stripeCustomerId: session.customer },
          });
        }

        if (kind === "build") {
          await settleBuildPayment(projectId, {
            invoiceId: session.metadata?.invoiceId || null,
            paymentIntentId:
              typeof session.payment_intent === "string" ? session.payment_intent : null,
          });
        }

        if (kind === "maintenance") {
          await activateMaintenance(projectId, {
            subscriptionId: typeof session.subscription === "string" ? session.subscription : null,
          });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        // Recurring maintenance charge — log it against the project.
        const inv = event.data.object as Stripe.Invoice;
        // `subscription` exists on the API payload but isn't on the SDK's
        // Invoice type in this version, so read it defensively.
        const rawSub = (inv as unknown as Record<string, unknown>).subscription;
        const subId = typeof rawSub === "string" ? rawSub : null;
        if (!subId) break;

        const plan = await prisma.maintenancePlan.findFirst({
          where: { stripeSubscriptionId: subId },
        });
        if (!plan) break;

        await prisma.invoice.create({
          data: {
            projectId: plan.projectId,
            amount: (inv.amount_paid ?? 0) / 100,
            type: "MAINTENANCE",
            status: "PAID",
            paidAt: new Date(),
            stripeInvoiceId: inv.id ?? null,
          },
        });

        const periodEnd = (inv as unknown as Record<string, unknown>).period_end;
        await prisma.maintenancePlan.update({
          where: { id: plan.id },
          data: {
            status: "ACTIVE",
            nextBillingDate:
              typeof periodEnd === "number" ? new Date(periodEnd * 1000) : null,
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const plan = await prisma.maintenancePlan.findFirst({
          where: { stripeSubscriptionId: sub.id },
        });
        if (plan) {
          await prisma.maintenancePlan.update({
            where: { id: plan.id },
            data: { status: "CANCELLED" },
          });
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    // Returning 500 tells Stripe to retry, which is what we want for a
    // transient database problem.
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("[stripe webhook]", event.type, msg);
    return new Response(`Handler error: ${msg}`, { status: 500 });
  }

  return Response.json({ received: true });
}
