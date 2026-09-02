import { ProspectStatus } from "@prisma/client";

export const PROSPECT_STATUS_LABELS: Record<ProspectStatus, string> = {
  NEW: "New",
  RESEARCHING: "Researching",
  CONTACTED: "Contacted",
  INTERESTED: "Interested",
  PREVIEW_CREATED: "Preview Created",
  PREVIEW_SENT: "Preview Sent",
  NEGOTIATING: "Negotiating",
  WON: "Won",
  LOST: "Lost",
  FOLLOW_UP_LATER: "Follow Up Later",
};

export const PROSPECT_STATUS_COLORS: Record<ProspectStatus, string> = {
  NEW: "bg-slate-800 text-slate-300 ring-slate-700",
  RESEARCHING: "bg-sky-500/10 text-sky-400 ring-sky-500/30",
  CONTACTED: "bg-blue-500/10 text-blue-400 ring-blue-500/30",
  INTERESTED: "bg-violet-500/10 text-violet-400 ring-violet-500/30",
  PREVIEW_CREATED: "bg-indigo-500/10 text-indigo-400 ring-indigo-500/30",
  PREVIEW_SENT: "bg-brand-500/10 text-brand-400 ring-brand-500/30",
  NEGOTIATING: "bg-amber-500/10 text-amber-400 ring-amber-500/30",
  WON: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/30",
  LOST: "bg-red-500/10 text-red-400 ring-red-500/30",
  FOLLOW_UP_LATER: "bg-orange-500/10 text-orange-400 ring-orange-500/30",
};

export const PROSPECT_STATUSES = Object.keys(PROSPECT_STATUS_LABELS) as ProspectStatus[];

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  CALL: "Call",
  EMAIL: "Email",
  MEETING: "Meeting",
  NOTE: "Note",
  STATUS_CHANGE: "Status Change",
  SYSTEM: "System",
};

export const BUSINESS_CATEGORIES = [
  "Plumber",
  "Electrician",
  "HVAC",
  "Landscaper",
  "Roofing Contractor",
  "Auto Repair",
  "Locksmith",
  "Pest Control",
  "Handyman",
  "Garage Door Repair",
  "Fence Contractor",
  "Concrete Contractor",
  "Tree Service",
  "Painter",
  "Junk Removal",
  "Restaurant",
  "Barber / Salon",
  "Dental",
  "General Contractor",
  "Other",
];
