import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "slate",
  hint,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: "slate" | "brand" | "emerald" | "amber" | "red" | "violet";
  hint?: string;
}) {
  const accentClasses: Record<string, string> = {
    slate: "bg-slate-800 text-slate-400",
    brand: "bg-brand-500/10 text-brand-400",
    emerald: "bg-emerald-500/10 text-emerald-400",
    amber: "bg-amber-500/10 text-amber-400",
    red: "bg-red-500/10 text-red-400",
    violet: "bg-violet-500/10 text-violet-400",
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-50">
            {value}
          </p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", accentClasses[accent])}>
          <Icon className="h-4 w-4" strokeWidth={2} />
        </div>
      </div>
    </Card>
  );
}
