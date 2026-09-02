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
import { sendEmail, emailConfigured, layout, button } from "../src/lib/email";

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
    // Uses the real shell, so this also shows exactly how clients see it.
    html: layout(`
      <p style="margin:0 0 16px;font-size:20px;font-weight:800;color:#ffffff;line-height:1.3;letter-spacing:-0.01em;">
        Resend is set up correctly.
      </p>
      <p style="margin:0 0 26px;font-size:16px;line-height:1.6;color:#cbd5e1;">
        This is the same template your clients get, sent from ${process.env.EMAIL_FROM}.
      </p>
      ${button(process.env.NEXT_PUBLIC_APP_URL || "https://webser.org", "Open Webser")}
    `),
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
