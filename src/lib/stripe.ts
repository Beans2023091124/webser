import Stripe from "stripe";

/**
 * Stripe is optional until keys are configured, so every caller has to handle
 * its absence rather than crashing. The admin UI uses `stripeStatus()` to show
 * a setup notice instead of a broken checkout button.
 */
let cached: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  // No apiVersion pin: the installed SDK already targets a matching version,
  // and hard-coding one drifts out of sync on every upgrade.
  if (!cached) cached = new Stripe(key);
  return cached;
}

export type StripeStatus = {
  configured: boolean;
  testMode: boolean;
  webhookConfigured: boolean;
  message?: string;
};

export function stripeStatus(): StripeStatus {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  const webhook = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!key) {
    return {
      configured: false,
      testMode: false,
      webhookConfigured: false,
      message:
        "Add STRIPE_SECRET_KEY to your .env file to take payments. Use a test key (sk_test_…) until you're ready to charge real cards.",
    };
  }

  return {
    configured: true,
    testMode: key.startsWith("sk_test_"),
    webhookConfigured: Boolean(webhook),
    message: webhook
      ? undefined
      : "Payments will work, but without STRIPE_WEBHOOK_SECRET the app can't confirm them automatically — invoices stay unpaid until the webhook is wired up.",
  };
}

/** Absolute base URL for Stripe redirect targets. */
export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function toCents(amount: number | string): number {
  return Math.round(Number(amount) * 100);
}
