import { Phone, Mail, Users, StickyNote, RefreshCw, Bot } from "lucide-react";
import { ActivityType } from "@prisma/client";
import { ACTIVITY_TYPE_LABELS } from "@/lib/prospect";
import { formatDateTime } from "@/lib/utils";

const ICONS: Record<ActivityType, typeof Phone> = {
  CALL: Phone,
  EMAIL: Mail,
  MEETING: Users,
  NOTE: StickyNote,
  STATUS_CHANGE: RefreshCw,
  SYSTEM: Bot,
};

export function ActivityItem({
  type,
  description,
  outcome,
  createdAt,
  createdByName,
  isLast,
}: {
  type: ActivityType;
  description: string;
  outcome?: string | null;
  createdAt: Date;
  createdByName?: string | null;
  isLast?: boolean;
}) {
  const Icon = ICONS[type];

  return (
    <div className="relative flex gap-3 pb-6">
      {!isLast && (
        <span className="absolute left-[15px] top-8 h-full w-px bg-slate-800" />
      )}
      <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-slate-800 text-slate-400 ring-4 ring-slate-900">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 pt-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {ACTIVITY_TYPE_LABELS[type]}
          </span>
          <span className="text-xs text-slate-500">{formatDateTime(createdAt)}</span>
        </div>
        <p className="mt-0.5 text-sm text-slate-300">{description}</p>
        {outcome && (
          <p className="mt-0.5 text-xs text-slate-500">Outcome: {outcome}</p>
        )}
        {createdByName && (
          <p className="mt-0.5 text-xs text-slate-500">by {createdByName}</p>
        )}
      </div>
    </div>
  );
}
