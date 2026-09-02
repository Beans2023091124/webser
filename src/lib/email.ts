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

/** Shared shell so every message looks like it came from the same business. */
function layout(body: string): string {
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f6f7f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:32px">
    <p style="margin:0 0 24px;font-size:18px;font-weight:800;letter-spacing:-0.01em;color:#1463FF">Webser</p>
    ${body}
  </div>
  <p style="max-width:520px;margin:16px auto 0;font-size:12px;color:#94a3b8;text-align:center">
    Reply to this email and it comes straight to us.
  </p>
</body></html>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#1463FF;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 26px;border-radius:9px">${label}</a>`;
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
        `<tr><td style="padding:6px 16px 6px 0;color:#64748b;font-size:14px;white-space:nowrap">${k}</td><td style="padding:6px 0;font-size:15px;font-weight:600">${v}</td></tr>`
    )
    .join("");

  // Give them something tappable on a phone — that's where they'll read this.
  const replyTo = lead.phone
    ? `<a href="tel:${lead.phone.replace(/[^\d+]/g, "")}" style="display:inline-block;background:#1463FF;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:9px">Call ${lead.name}</a>`
    : lead.email
    ? `<a href="mailto:${lead.email}" style="display:inline-block;background:#1463FF;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:9px">Email ${lead.name}</a>`
    : "";

  await sendEmail({
    to: lead.preview.email,
    template: "new-lead",
    subject: `New enquiry from ${lead.name}${lead.service ? ` — ${lead.service}` : ""}`,
    html: layout(`
      <p style="margin:0 0 18px;font-size:16px;line-height:1.6">
        Someone filled in the form on your website.
      </p>
      <table style="border-collapse:collapse;margin:0 0 18px">${details}</table>
      ${
        lead.message
          ? `<p style="margin:0 0 22px;padding:14px 16px;background:#f1f5f9;border-radius:9px;font-size:15px;line-height:1.6;white-space:pre-wrap">${lead.message}</p>`
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
        <p style="margin:0 0 16px;font-size:16px">${hi}</p>
        <p style="margin:0 0 16px;font-size:16px;line-height:1.6">
          Your website is built and ready for you to look through. Have a click around and tell us
          if anything needs changing — wrong photo, wrong number, a service you don't offer any
          more. Just say it in plain English.
        </p>
        <p style="margin:0 0 26px;font-size:16px;line-height:1.6">
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
      <p style="margin:0 0 16px;font-size:16px">${hi}</p>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6">
        Your website is live. Anyone can find it now at
        <a href="${live}" style="color:#1463FF">${live.replace(/^https?:\/\//, "")}</a>.
      </p>
      <p style="margin:0 0 26px;font-size:16px;line-height:1.6">
        Need something changed later — new hours, a new number, a photo? Send us a message and
        we'll take care of it.
      </p>
      ${button(live, "Visit your site")}
    `),
  });
}
