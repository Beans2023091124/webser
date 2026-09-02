import { Resend } from "resend";
import { ProjectStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Transactional email.
 *
 * Every send is recorded in EmailLog, including failures, so "did the client
 * ever get told?" is answerable from the database rather than from Resend's
 * dashboard. Nothing here throws: an email problem must never take down the
 * action that triggered it — approving a site is more important than the
 * receipt for approving it.
 */

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());
}

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Shared shell, styled to match the landing page at webser.org.
 *
 * Built from tables rather than divs because Outlook ignores most modern
 * layout CSS, and every colour is inline for the same reason. The dark card
 * mirrors the site; the outer background stays light so the message still
 * reads if a client strips backgrounds.
 */
export function layout(body: string): string {
  const mark = `${appUrl()}/webser-mark.png`;
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="dark light" />
  </head>
  <body style="margin:0;padding:0;background:#e9eef5;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#e9eef5;padding:28px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#0b1220;border-radius:16px;overflow:hidden;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
            <tr>
              <td style="padding:26px 32px 0 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="padding-right:10px;" valign="middle">
                      <img src="${mark}" width="26" height="26" alt="" style="display:block;border:0;" />
                    </td>
                    <td valign="middle">
                      <span style="font-size:18px;font-weight:800;letter-spacing:-0.02em;color:#ffffff;">Webser</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 32px 32px 32px;color:#cbd5e1;font-size:16px;line-height:1.6;">
                ${body}
              </td>
            </tr>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
            <tr>
              <td align="center" style="padding:14px 16px 0 16px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#64748b;">
                Reply to this email and it comes straight to us.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function button(href: string, label: string): string {
  // Wrapped in a table so Outlook renders the padding instead of collapsing it.
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:#1463FF;border-radius:9px;">
    <a href="${href}" style="display:inline-block;padding:13px 26px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${label}</a>
  </td></tr></table>`;
}

type SendArgs = {
  to: string;
  subject: string;
  html: string;
  template: string;
  projectId?: string;
  prospectId?: string;
};

export async function sendEmail(args: SendArgs): Promise<{ ok: boolean; error?: string }> {
  const { to, subject, html, template, projectId, prospectId } = args;

  const log = async (status: "SENT" | "FAILED" | "QUEUED") => {
    try {
      await prisma.emailLog.create({
        data: {
          to,
          subject,
          template,
          status,
          relatedProjectId: projectId ?? null,
          relatedProspectId: prospectId ?? null,
        },
      });
    } catch {
      // Logging is best-effort; never let it break the caller.
    }
  };

  if (!emailConfigured()) {
    await log("QUEUED");
    return { ok: false, error: "Email is not configured (RESEND_API_KEY / EMAIL_FROM)." };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const res = await resend.emails.send({
      from: process.env.EMAIL_FROM as string,
      to,
      subject,
      html,
    });
    if (res.error) {
      await log("FAILED");
      return { ok: false, error: res.error.message };
    }
    await log("SENT");
    return { ok: true };
  } catch (e) {
    await log("FAILED");
    return { ok: false, error: e instanceof Error ? e.message : "Unknown email error" };
  }
}

/**
 * Forwards a quote request to the business it was meant for.
 *
 * The lead is already saved before this runs, so a missing address or a failed
 * send costs the enquiry nothing — it's still in the admin. Sent only when the
 * business has an email on their site settings; there's nowhere else to guess
 * an address from.
 */
export async function notifyNewLead(leadId: string): Promise<void> {
  const lead = await prisma.previewLead.findUnique({
    where: { id: leadId },
    select: {
      name: true,
      phone: true,
      email: true,
      service: true,
      message: true,
      preview: { select: { id: true, businessName: true, email: true } },
    },
  });
  if (!lead?.preview.email) return;

  const rows: [string, string | null][] = [
    ["Name", lead.name],
    ["Phone", lead.phone || null],
    ["Email", lead.email || null],
    ["Service", lead.service || null],
  ];

  const details = rows
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:7px 18px 7px 0;color:#7c8aa0;font-size:14px;white-space:nowrap;">${k}</td><td style="padding:7px 0;font-size:15px;font-weight:600;color:#ffffff;">${v}</td></tr>`
    )
    .join("");

  // Give them something tappable on a phone — that's where they'll read this.
  const replyTo = lead.phone
    ? button(`tel:${lead.phone.replace(/[^\d+]/g, "")}`, `Call ${lead.name}`)
    : lead.email
    ? button(`mailto:${lead.email}`, `Email ${lead.name}`)
    : "";

  await sendEmail({
    to: lead.preview.email,
    template: "new-lead",
    subject: `New enquiry from ${lead.name}${lead.service ? ` — ${lead.service}` : ""}`,
    html: layout(`
      <p style="margin:0 0 20px;font-size:19px;font-weight:700;color:#ffffff;line-height:1.35;">
        Someone filled in the form on your website.
      </p>
      <table role="presentation" style="border-collapse:collapse;margin:0 0 20px;">${details}</table>
      ${
        lead.message
          ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px;"><tr><td style="padding:14px 16px;background:#111c30;border-left:3px solid #1463FF;border-radius:6px;font-size:15px;line-height:1.6;color:#cbd5e1;white-space:pre-wrap;">${lead.message}</td></tr></table>`
          : ""
      }
      ${replyTo}
    `),
  });
}

/**
 * Tells the client when their project reaches a stage that needs them.
 *
 * Only two stages actually warrant an email: the site is ready to look at,
 * and the site is live. Everything else they'd learn by opening the portal
 * anyway, and a notification per stage change trains people to ignore them.
 */
export async function notifyProjectStatus(
  projectId: string,
  status: ProjectStatus
): Promise<void> {
  if (status !== ProjectStatus.FINAL_REVIEW && status !== ProjectStatus.LIVE) return;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      contactEmail: true,
      contactName: true,
      businessName: true,
      portalToken: true,
      liveUrl: true,
    },
  });
  if (!project?.contactEmail) return;

  const portal = `${appUrl()}/portal/${project.portalToken}`;
  const hi = project.contactName ? `Hi ${project.contactName},` : "Hi,";

  if (status === ProjectStatus.FINAL_REVIEW) {
    await sendEmail({
      to: project.contactEmail,
      projectId,
      template: "ready-for-review",
      subject: `Your website is ready to look at — ${project.businessName}`,
      html: layout(`
        <p style="margin:0 0 14px;font-size:16px;color:#94a3b8;">${hi}</p>
        <p style="margin:0 0 16px;font-size:20px;font-weight:800;color:#ffffff;line-height:1.3;letter-spacing:-0.01em;">
          Your website is ready to look at.
        </p>
        <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#cbd5e1;">
          Have a click around and tell us if anything needs changing — wrong photo, wrong number,
          a service you don't offer any more. Just say it in plain English.
        </p>
        <p style="margin:0 0 26px;font-size:16px;line-height:1.6;color:#cbd5e1;">
          Nothing goes live until you approve it.
        </p>
        ${button(portal, "See your website")}
      `),
    });
    return;
  }

  const live = project.liveUrl ?? portal;
  await sendEmail({
    to: project.contactEmail,
    projectId,
    template: "site-live",
    subject: `${project.businessName} is live`,
    html: layout(`
      <p style="margin:0 0 14px;font-size:16px;color:#94a3b8;">${hi}</p>
      <p style="margin:0 0 16px;font-size:20px;font-weight:800;color:#ffffff;line-height:1.3;letter-spacing:-0.01em;">
        Your website is live.
      </p>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#cbd5e1;">
        Anyone can find it now at
        <a href="${live}" style="color:#6ea8ff;text-decoration:underline;">${live.replace(/^https?:\/\//, "")}</a>.
      </p>
      <p style="margin:0 0 26px;font-size:16px;line-height:1.6;color:#cbd5e1;">
        Need something changed later — new hours, a new number, a photo? Send us a message and
        we'll take care of it.
      </p>
      ${button(live, "Visit your site")}
    `),
  });
}
