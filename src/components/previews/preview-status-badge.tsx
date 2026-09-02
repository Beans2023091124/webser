import { PreviewStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { PREVIEW_STATUS_LABELS, PREVIEW_STATUS_COLORS } from "@/lib/preview";

export function PreviewStatusBadge({ status }: { status: PreviewStatus }) {
  return <Badge className={PREVIEW_STATUS_COLORS[status]}>{PREVIEW_STATUS_LABELS[status]}</Badge>;
}
