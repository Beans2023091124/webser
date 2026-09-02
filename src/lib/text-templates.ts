import type { TextTemplate } from "@/components/admin/text-customer";
import { PROJECT_STATUS_LABELS } from "@/lib/project";
import type { ProjectStatus } from "@prisma/client";

/**
 * Ready-made messages for texting a prospect or client.
 *
 * Written the way you'd actually type them: short, lower-case where it reads
 * naturally, no marketing voice. A text that reads like a mailshot gets
 * ignored, and these go out from a personal number.
 */

const firstName = (full?: string | null) => (full ?? "").trim().split(/\s+/)[0] || "there";

/** Sales outreach, before they're a client. */
export function prospectTemplates(args: {
  contactName?: string | null;
  businessName: string;
  previewUrl?: string | null;
  ownerName?: string | null;
}): TextTemplate[] {
  const who = firstName(args.contactName);
  const link = args.previewUrl;

  const templates: TextTemplate[] = [
    {
      label: "First contact",
      body: `Hi ${who}, this is ${args.ownerName?.trim() || "Ryder"} — I build websites for local businesses around Olathe. I noticed ${args.businessName} doesn't have one (or it could use a refresh). I can put a real one together for you to look at, free, and you only pay if you like it. Want me to?`,
    },
  ];

  if (link) {
    templates.push(
      {
        label: "Preview ready",
        body: `Hi ${who} — I built a website for ${args.businessName} so you can see what it'd look like. Have a look here: ${link}\n\nNothing owed either way. If you want anything changed, just tell me.`,
      },
      {
        label: "Follow up",
        body: `Hi ${who}, just checking you got the site I put together for ${args.businessName}: ${link}\n\nHappy to change anything on it — or if it's not for you, no problem at all.`,
      }
    );
  }

  templates.push({
    label: "Last check",
    body: `Hi ${who} — I won't keep bothering you. If the website's something you want to pick up later, just text this number any time. All the best with ${args.businessName}.`,
  });

  return templates;
}

/** Messages for someone who is already a client. */
export function clientTemplates(args: {
  contactName?: string | null;
  businessName: string;
  portalUrl: string;
  liveUrl?: string | null;
  status: ProjectStatus;
}): TextTemplate[] {
  const who = firstName(args.contactName);

  return [
    {
      label: "Need photos",
      body: `Hi ${who} — ready to start on the ${args.businessName} site. If you can send over your logo and a few photos of your work, that's all I need: ${args.portalUrl}\n\nDon't worry if they're phone photos, they're usually the best ones.`,
    },
    {
      label: "Ready to review",
      body: `Hi ${who}, your site's ready to look at: ${args.portalUrl}\n\nHave a click through and tell me if anything needs changing. Nothing goes live until you say so.`,
    },
    {
      label: "Nudge for sign-off",
      body: `Hi ${who} — no rush, just checking whether you had a chance to look at the site: ${args.portalUrl}\n\nHappy to change anything, or hit approve and I'll get it published.`,
    },
    {
      label: "It's live",
      body: `Hi ${who} — ${args.businessName} is live${args.liveUrl ? ` at ${args.liveUrl.replace(/^https?:\/\//, "")}` : ""}. Have a look when you get a minute.\n\nAnything you want changed later, just text me.`,
    },
    {
      label: "Payment",
      body: `Hi ${who}, whenever you're ready the invoice is on your project page: ${args.portalUrl}\n\nCurrent stage is ${PROJECT_STATUS_LABELS[args.status]}. Shout if anything's unclear.`,
    },
  ];
}
