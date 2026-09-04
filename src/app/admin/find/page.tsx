import Link from "next/link";
import { ExternalLink, KeyRound } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { placesConfigured } from "@/lib/places";
import { Topbar } from "@/components/admin/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { BusinessFinder } from "@/components/prospects/business-finder";

/**
 * Find local businesses on Google and add the promising ones to the pipeline.
 *
 * A tab of its own rather than a corner of /admin/prospects: it is the only
 * page in the admin that spends money per click, and burying it inside a list
 * view would make that easy to do by accident.
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

function SetupNotice() {
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-brand-400" />
          <h2 className="text-base font-semibold text-slate-50">One key needed first</h2>
        </div>

        <p className="text-sm leading-relaxed text-slate-400">
          Business search runs on Google Maps. It needs a single API key with two APIs turned on,
          and the account has to have billing enabled even while usage stays inside the free
          allowance.
        </p>

        <ol className="space-y-2 text-sm text-slate-400">
          {[
            <>
              Create a project at{" "}
              <a
                href="https://console.cloud.google.com/projectcreate"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium text-slate-200 hover:underline"
              >
                Google Cloud Console
                <ExternalLink className="h-3 w-3" />
              </a>{" "}
              and add a billing account to it.
            </>,
            <>
              Enable <span className="font-mono text-slate-300">Places API (New)</span> and{" "}
              <span className="font-mono text-slate-300">Geocoding API</span> under APIs &amp;
              Services.
            </>,
            <>
              Create an API key under Credentials. Restrict it to those two APIs — an unrestricted
              key on a billed project is worth stealing.
            </>,
            <>
              Set <span className="font-mono text-slate-300">GOOGLE_MAPS_API_KEY</span> in your
              environment (locally in <span className="font-mono text-slate-300">.env</span>, and in
              Vercel&apos;s Environment Variables for the deployed site), then restart.
            </>,
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-300">
                {i + 1}
              </span>
              <span className="leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>

        <p className="text-xs leading-relaxed text-slate-500">
          Searches ask Google for each business&apos;s website and phone number, which prices them
          at the Enterprise tier — the most expensive one. That is the whole point here, since a
          business with no website is the only kind worth calling, but it does mean a search costs
          more than a map view. Check the current rates and free monthly allowance on{" "}
          <a
            href="https://developers.google.com/maps/billing-and-pricing/pricing"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-slate-400 hover:underline"
          >
            Google&apos;s pricing page
            <ExternalLink className="h-3 w-3" />
          </a>{" "}
          and set a budget alert.
        </p>
      </CardContent>
    </Card>
  );
}

export default async function FindPage() {
  const configured = placesConfigured();
  const defaultWhere = configured ? await lastSearchedArea() : "";

  return (
    <>
      <Topbar
        title="Find leads"
        description="Search Google for local businesses and add them to your pipeline."
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
        <div className="mx-auto max-w-4xl">
          {configured ? <BusinessFinder defaultWhere={defaultWhere} /> : <SetupNotice />}
        </div>
      </main>
    </>
  );
}
