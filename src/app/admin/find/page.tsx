import Link from "next/link";
import { Info } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/admin/topbar";
import { BusinessFinder } from "@/components/prospects/business-finder";

/**
 * Find local businesses and add the promising ones to the pipeline.
 *
 * A tab of its own rather than a corner of /admin/prospects, because it is a
 * different job: the prospects page works a list you already have, this one
 * goes and finds the list.
 */
export const dynamic = "force-dynamic";

/** Somewhere sensible to start, taken from the last prospect that had a town. */
async function lastSearchedArea(): Promise<string> {
  const recent = await prisma.prospect.findFirst({
    where: { city: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { city: true, state: true },
  });
  if (!recent?.city) return "";
  return [recent.city, recent.state].filter(Boolean).join(", ");
}

export default async function FindPage() {
  const defaultWhere = await lastSearchedArea();

  return (
    <>
      <Topbar
        title="Find leads"
        description="Search for local businesses and add them to your pipeline."
        action={
          <Link
            href="/admin/prospects"
            className="hidden text-sm font-medium text-slate-400 transition-colors hover:text-slate-200 sm:inline"
          >
            View pipeline
          </Link>
        }
      />

      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-4xl space-y-4">
          {/* Said once, up front, so a thin result for plumbers reads as a
              known limit of the map rather than a broken search. */}
          <div className="flex items-start gap-2.5 rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3">
            <Info className="mt-0.5 h-4 w-4 flex-none text-slate-500" />
            <p className="text-xs leading-relaxed text-slate-500">
              This searches OpenStreetMap, which is free and needs no account. It maps businesses
              people can see from the street very well — restaurants, salons, auto repair, dentists,
              vets — and businesses that work out of a van barely at all, so expect thin results for
              plumbers, electricians and roofers.
            </p>
          </div>

          <BusinessFinder defaultWhere={defaultWhere} />
        </div>
      </main>
    </>
  );
}
