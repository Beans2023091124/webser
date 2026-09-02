import { ProjectStatus, InvoiceStatus, InvoiceType, RevisionStatus } from "@prisma/client";

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  PAYMENT_PENDING: "Awaiting Payment",
  INFORMATION_NEEDED: "Needs Info",
  IN_DEVELOPMENT: "In Development",
  REVISION_REQUESTED: "Revisions Requested",
  FINAL_REVIEW: "Final Review",
  APPROVED: "Approved",
  DEPLOYING: "Deploying",
  LIVE: "Live",
  MAINTENANCE: "Maintenance",
  CANCELLED: "Cancelled",
};

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  PAYMENT_PENDING: "bg-amber-500/10 text-amber-400 ring-amber-500/30",
  INFORMATION_NEEDED: "bg-orange-500/10 text-orange-400 ring-orange-500/30",
  IN_DEVELOPMENT: "bg-brand-500/10 text-brand-400 ring-brand-500/30",
  REVISION_REQUESTED: "bg-violet-500/10 text-violet-400 ring-violet-500/30",
  FINAL_REVIEW: "bg-indigo-500/10 text-indigo-400 ring-indigo-500/30",
  APPROVED: "bg-teal-500/10 text-teal-400 ring-teal-500/30",
  DEPLOYING: "bg-sky-500/10 text-sky-400 ring-sky-500/30",
  LIVE: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/30",
  MAINTENANCE: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/30",
  CANCELLED: "bg-red-500/10 text-red-400 ring-red-500/30",
};

export const PROJECT_STATUSES = Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[];

/** The happy path, in order — used for the portal's progress tracker. */
export const PROJECT_PIPELINE: ProjectStatus[] = [
  "PAYMENT_PENDING",
  "INFORMATION_NEEDED",
  "IN_DEVELOPMENT",
  "FINAL_REVIEW",
  "APPROVED",
  "LIVE",
];

/** What the customer sees at each stage, in their language rather than ours. */
export const CLIENT_STAGE_COPY: Record<ProjectStatus, { title: string; body: string }> = {
  PAYMENT_PENDING: {
    title: "Let's get started",
    body: "Once payment goes through we'll start building your site. It usually takes a few days.",
  },
  INFORMATION_NEEDED: {
    title: "We need a few things from you",
    body: "Send over your logo and any photos you'd like on the site. Anything you don't have, we'll handle.",
  },
  IN_DEVELOPMENT: {
    title: "We're building your site",
    body: "Nothing needed from you right now. We'll email as soon as there's something to look at.",
  },
  REVISION_REQUESTED: {
    title: "We're making your changes",
    body: "We've got your notes and we're working through them now.",
  },
  FINAL_REVIEW: {
    title: "Ready for your review",
    body: "Have a look through and tell us if anything needs changing. Nothing goes live until you say so.",
  },
  APPROVED: {
    title: "Approved — one last thing",
    body: "Your site is signed off and ready. Choose the web address people will use to find you and we'll put it live.",
  },
  DEPLOYING: {
    title: "Connecting your web address",
    body: "Nearly there. Once your domain is pointing at us your site goes live — that can take a few hours to spread across the internet.",
  },
  LIVE: {
    title: "Your site is live",
    body: "It's up and running. If you ever need a change, just ask.",
  },
  MAINTENANCE: {
    title: "Live and maintained",
    body: "Your site is live and covered by your maintenance plan. Send changes any time.",
  },
  CANCELLED: {
    title: "Project cancelled",
    body: "This project isn't active. Get in touch if you'd like to pick it back up.",
  },
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: "Draft",
  SENT: "Awaiting Payment",
  PAID: "Paid",
  OVERDUE: "Overdue",
  VOID: "Void",
};

export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  DRAFT: "bg-slate-800 text-slate-300 ring-slate-700",
  SENT: "bg-amber-500/10 text-amber-400 ring-amber-500/30",
  PAID: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/30",
  OVERDUE: "bg-red-500/10 text-red-400 ring-red-500/30",
  VOID: "bg-slate-800 text-slate-500 ring-slate-700",
};

export const INVOICE_TYPE_LABELS: Record<InvoiceType, string> = {
  DEPOSIT: "Deposit",
  FULL: "Website Build",
  BALANCE: "Balance",
  MAINTENANCE: "Maintenance",
};

export const REVISION_STATUS_LABELS: Record<RevisionStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
};

export const REVISION_STATUS_COLORS: Record<RevisionStatus, string> = {
  OPEN: "bg-amber-500/10 text-amber-400 ring-amber-500/30",
  IN_PROGRESS: "bg-brand-500/10 text-brand-400 ring-brand-500/30",
  DONE: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/30",
};

/** Stage index for the portal tracker; -1 when the status isn't on the happy path. */
export function pipelineIndex(status: ProjectStatus): number {
  if (status === "REVISION_REQUESTED") return PROJECT_PIPELINE.indexOf("FINAL_REVIEW");
  if (status === "DEPLOYING") return PROJECT_PIPELINE.indexOf("APPROVED");
  if (status === "MAINTENANCE") return PROJECT_PIPELINE.indexOf("LIVE");
  return PROJECT_PIPELINE.indexOf(status);
}

/**
 * Whether the client can send a change request at this stage, and how to ask.
 *
 * This is deliberately open at nearly every stage: a customer paying monthly
 * for "send us changes any time" needs somewhere to actually type them, and a
 * client mid-build often remembers something important. Only an unpaid or
 * cancelled project hides the box.
 */
export function revisionPrompt(
  status: ProjectStatus
): { heading: string; body: string; placeholder: string } | null {
  switch (status) {
    case "PAYMENT_PENDING":
    case "CANCELLED":
      return null;

    case "INFORMATION_NEEDED":
      return {
        heading: "Anything we should know?",
        body: "Tell us about your business, hours, services — anything you'd like on the site.",
        placeholder:
          "e.g. We're closed Sundays, and we've just started doing gutter cleaning too.",
      };

    case "IN_DEVELOPMENT":
    case "REVISION_REQUESTED":
      return {
        heading: "Thought of something else?",
        body: "Send it over and we'll fold it into what we're already doing.",
        placeholder: "e.g. Please use the mobile number rather than the office one.",
      };

    case "FINAL_REVIEW":
      return {
        heading: "Anything you'd like changed?",
        body: "Tell us in plain English — no need to be technical. When you're happy, approve it and we'll publish.",
        placeholder:
          "e.g. Can we use a different photo on the front page, and change the phone number to the mobile?",
      };

    case "APPROVED":
    case "DEPLOYING":
      return {
        heading: "Spotted something last-minute?",
        body: "We're publishing now, but send it over and we'll sort it out.",
        placeholder: "e.g. There's a typo in the about section.",
      };

    case "LIVE":
    case "MAINTENANCE":
      return {
        heading: "Need a change?",
        body: "Send it over any time and we'll take care of it — no need to explain it technically.",
        placeholder: "e.g. New holiday hours: closed Dec 24–26. Also please add our new number.",
      };

    default:
      return {
        heading: "Send us a note",
        body: "Anything you'd like changed or added, just tell us.",
        placeholder: "What would you like changed?",
      };
  }
}
