import { prisma } from "@/lib/prisma";
import { vercelConfigured } from "@/lib/vercel";

/**
 * The single Settings row, created on first read.
 *
 * Upserting rather than seeding means a fresh database, a restored backup and
 * a branch all behave the same without anyone remembering to run a script.
 */
export async function getSettings() {
  return prisma.settings.upsert({
    where: { id: "app" },
    update: {},
    create: { id: "app" },
  });
}

/**
 * Which integrations this deployment can actually see.
 *
 * Presence only — never a value. The same checks the diagnostics endpoint
 * runs, surfaced where someone would look for them.
 */
export function integrationStatus() {
  const has = (v?: string | null) => Boolean(v?.trim());

  return [
    {
      key: "database",
      label: "Database",
      ready: has(process.env.DATABASE_URL),
      detail: "Neon Postgres. Everything on this page is stored here.",
    },
    {
      key: "email",
      label: "Email (Resend)",
      ready: has(process.env.RESEND_API_KEY) && has(process.env.EMAIL_FROM),
      detail: has(process.env.EMAIL_FROM)
        ? `Sending as ${process.env.EMAIL_FROM}`
        : "Set RESEND_API_KEY and EMAIL_FROM to send client emails.",
    },
    {
      key: "storage",
      label: "File storage (Vercel Blob)",
      ready: has(process.env.BLOB_READ_WRITE_TOKEN),
      detail: has(process.env.BLOB_READ_WRITE_TOKEN)
        ? "Client uploads go to Blob."
        : "Without this, uploads fall back to local disk and fail once deployed.",
    },
    {
      key: "payments",
      label: "Payments (Stripe)",
      ready: has(process.env.STRIPE_SECRET_KEY) && has(process.env.STRIPE_WEBHOOK_SECRET),
      detail: has(process.env.STRIPE_SECRET_KEY)
        ? "Checkout and the maintenance subscription are live."
        : "Needs STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET.",
    },
    {
      key: "ai",
      label: "AI editing (Claude)",
      ready: has(process.env.ANTHROPIC_API_KEY),
      detail: has(process.env.ANTHROPIC_API_KEY)
        ? "Edit with AI and Apply with AI are available."
        : "Set ANTHROPIC_API_KEY to edit sites in plain English.",
    },
    {
      key: "domains",
      label: "Custom domains",
      ready: has(process.env.WEBSER_DEPLOY_HOST),
      detail: has(process.env.WEBSER_DEPLOY_HOST)
        ? `Clients point their domain at ${process.env.WEBSER_DEPLOY_HOST}`
        : "Set WEBSER_DEPLOY_HOST so clients can be shown DNS records.",
    },
    {
      // Split from the row above because pointing DNS at us and being able to
      // answer for the domain are two different things. Without this, every
      // client domain has to be added in Vercel by hand before it will load at
      // all -- a CNAME on its own gets a failed TLS handshake.
      key: "domainAutomation",
      label: "Domain automation",
      ready: vercelConfigured(),
      detail: vercelConfigured()
        ? "Client domains are added to the host automatically when they save one."
        : "Set VERCEL_TOKEN and VERCEL_PROJECT_ID, or add each client domain in Vercel by hand before telling them it is live.",
    },
  ];
}

/** Loud on purpose: this one lets anyone with a portal link mark themselves paid. */
export function devPaymentsWarning(): boolean {
  return process.env.ENABLE_DEV_PAYMENTS === "true" && process.env.NODE_ENV === "production";
}
