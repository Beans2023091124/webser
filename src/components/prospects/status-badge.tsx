import { ProspectStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { PROSPECT_STATUS_COLORS, PROSPECT_STATUS_LABELS } from "@/lib/prospect";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: ProspectStatus }) {
  return (
    <Badge className={cn(PROSPECT_STATUS_COLORS[status])}>
      {PROSPECT_STATUS_LABELS[status]}
    </Badge>
  );
}
