import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A single number.
 *
 * The icon tile is the same treatment the marketing page uses for its feature
 * icons — a tinted square with an inset ring — so the dashboard reads as part
 * of the same product rather than a separate admin tool.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "slate",
  hint,
  emphasis = false,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: "slate" | "brand" | "emerald" | "amber" | "red" | "violet";
  hint?: string;
  /** Headline figures: larger number, so a wall of cards still has a top line. */
  emphasis?: boolean;
}) {
  const accents: Record<string, string> = {
    slate: "bg-slate-800/60 text-slate-400 ring-slate-700/50",
    brand: "bg-brand-600/10 text-brand-400 ring-brand-600/25",
    emerald: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/25",
    amber: "bg-amber-500/10 text-amber-400 ring-amber-500/25",
    red: "bg-red-500/10 text-red-400 ring-red-500/25",
    violet: "bg-violet-500/10 text-violet-400 ring-violet-500/25",
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 transition-colors hover:border-slate-700">
      {/*
        The number comes first in the markup on purpose. With the label above
        it, a label that wrapped to two lines pushed its number down and it no
        longer lined up with the rest of the row. Leading with the value pins
        every number to the same height whatever the label or hint does.
      */}
      <div className="flex items-center justify-between gap-3">
        <p
          className={cn(
            "font-bold tracking-tight text-slate-50",
            emphasis ? "text-3xl" : "text-2xl"
          )}
        >
          {value}
        </p>
        <div
          className={cn(
            "flex h-10 w-10 flex-none items-center justify-center rounded-lg ring-1 ring-inset",
            accents[accent]
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
      </div>
      <p className="mt-3 text-sm font-medium text-slate-300">{label}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
