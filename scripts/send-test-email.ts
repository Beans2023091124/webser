/**
 * Sends one test email through the real code path.
 *
 * Run with no arguments to check the configuration without sending:
 *   npx tsx scripts/send-test-email.ts
 *
 * Run with a recipient to actually send:
 *   npx tsx scripts/send-test-email.ts you@example.com
 *
 * Note the prisma import above the others: nothing loads .env for a plain
 * script, but Prisma's client does it on import, which is what makes
 * process.env.RESEND_API_KEY visible here. Keep it first.
 */
import { prisma } from "../src/lib/prisma";
import { sendEmail, emailConfigured } from "../src/lib/email";

async function main() {
  const to = process.argv[2];

  console.log("RESEND_API_KEY:", process.env.RESEND_API_KEY ? "set" : "MISSING");
  console.log("EMAIL_FROM:    ", process.env.EMAIL_FROM ?? "MISSING");
  console.log("configured:    ", emailConfigured());

  if (!to) {
    console.log("\nNo recipient given, so nothing was sent.");
    console.log("To send: npx tsx scripts/send-test-email.ts you@example.com");
    return;
  }

  console.log(`\nSending to ${to}…`);
  const res = await sendEmail({
    to,
    subject: "Webser test email",
    template: "test",
    html: `<!doctype html><html><body style="font-family:system-ui,sans-serif;padding:24px">
      <p style="font-size:18px;font-weight:700;color:#1463FF;margin:0 0 16px">Webser</p>
      <p style="margin:0 0 12px">If you're reading this, Resend is set up correctly.</p>
      <p style="margin:0;color:#64748b;font-size:14px">Sent from ${process.env.EMAIL_FROM}</p>
    </body></html>`,
  });

  console.log(res.ok ? "Sent." : `Failed: ${res.error}`);
  if (!res.ok) {
    console.log("\nIf this says the domain isn't verified, add Resend's DNS records");
    console.log("in Vercel (Settings > Domains > webser.org > DNS Records) and verify.");
  }

  const last = await prisma.emailLog.findFirst({ orderBy: { sentAt: "desc" } });
  console.log("EmailLog row:", last ? `${last.status} -> ${last.to}` : "none written");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
