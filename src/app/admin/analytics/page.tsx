import Link from "next/link";
import { Eye, MessageSquare, TrendingUp, Wallet, Repeat, Mail, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/admin/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function pct(part: number, whole: number) {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}

/** One step of the sales funnel, drawn as a proportional bar. */
function FunnelRow({
  label,
  count,
  of,
  hint,
}: {
  label: string;
  count: number;
  of: number;
  hint?: string;
}) {
  const width = of > 0 ? Math.max(pct(count, of), count > 0 ? 4 : 0) : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-sm text-slate-300">{label}</span>
        <span className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-slate-100">{count}</span>
          {of > 0 && <span className="text-xs text-slate-500">{pct(count, of)}%</span>}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-brand-500" style={{ width: `${width}%` }} />
      </div>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export default async function AnalyticsPage() {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    totalProspects,
    contacted,
    previewsSent,
    won,
    previews,
    leadCount,
    recentLeads,
    paidAgg,
    paidThisMonthAgg,
    outstandingAgg,
    activePlans,
    liveProjects,
    emailCounts,
  ] = await Promise.all([
    prisma.prospect.count(),
    prisma.prospect.count({ where: { status: { notIn: ["NEW", "RESEARCHING"] } } }),
    prisma.prospect.count({ where: { status: { in: ["PREVIEW_SENT", "INTERESTED", "NEGOTIATING", "WON"] } } }),
    prisma.prospect.count({ where: { status: "WON" } }),
    prisma.preview.findMany({
      // Demos are marketing, not pipeline — they'd otherwise top this list.
      where: { isDemo: false },
      select: { id: true, slug: true, businessName: true, viewCount: true, _count: { select: { leads: true } } },
      orderBy: { viewCount: "desc" },
      take: 8,
    }),
    prisma.previewLead.count({ where: { preview: { isDemo: false } } }),
    prisma.previewLead.findMany({
      where: { preview: { isDemo: false } },
      take: 6,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, phone: true, service: true, createdAt: true,
        preview: { select: { slug: true, businessName: true } },
      },
    }),
    prisma.invoice.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
    prisma.invoice.aggregate({ where: { status: "PAID", paidAt: { gte: monthStart } }, _sum: { amount: true } }),
    prisma.invoice.aggregate({ where: { status: { in: ["SENT", "OVERDUE"] } }, _sum: { amount: true } }),
    prisma.maintenancePlan.findMany({ where: { status: "ACTIVE" }, select: { monthlyPrice: true } }),
    prisma.project.count({ where: { status: { in: ["LIVE", "MAINTENANCE"] } } }),
    prisma.emailLog.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const totalViews = previews.reduce((sum, p) => sum + p.viewCount, 0);
  const mrr = activePlans.reduce((sum, p) => sum + Number(p.monthlyPrice), 0);
  const collected = Number(paidAgg._sum.amount ?? 0);
  const thisMonth = Number(paidThisMonthAgg._sum.amount ?? 0);
  const outstanding = Number(outstandingAgg._sum.amount ?? 0);
  const emails = Object.fromEntries(emailCounts.map((e) => [e.status, e._count._all]));

  return (
    <>
      <Topbar title="Analytics" description="Where the pipeline actually stands." />

      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-6xl">
        {/* Money */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Collected"
            value={formatCurrency(collected)}
            hint="All time"
            icon={Wallet}
            accent="emerald"
          />
          <StatCard
            label="This month"
            value={formatCurrency(thisMonth)}
            hint="Paid since the 1st"
            icon={TrendingUp}
            accent="brand"
          />
          <StatCard
            label="Recurring"
            value={`${formatCurrency(mrr)}/mo`}
            hint={`${activePlans.length} active plan${activePlans.length === 1 ? "" : "s"}`}
            icon={Repeat}
            accent="violet"
          />
          <StatCard
            label="Outstanding"
            value={formatCurrency(outstanding)}
            hint="Invoiced, not yet paid"
            icon={Wallet}
            accent="amber"
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Funnel */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Pipeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {totalProspects === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  No prospects yet. Add one and this fills in.
                </p>
              ) : (
                <>
                  <FunnelRow label="Prospects" count={totalProspects} of={totalProspects} />
                  <FunnelRow
                    label="Contacted"
                    count={contacted}
                    of={totalProspects}
                    hint="Anyone past the research stage"
                  />
                  <FunnelRow label="Preview sent" count={previewsSent} of={totalProspects} />
                  <FunnelRow label="Won" count={won} of={totalProspects} />
                  <p className="border-t border-slate-800 pt-4 text-sm text-slate-400">
                    {won > 0 && previewsSent > 0 ? (
                      <>
                        <span className="font-semibold text-slate-100">{pct(won, previewsSent)}%</span> of
                        the businesses you showed a preview to became clients.
                      </>
                    ) : (
                      "Close your first deal and the conversion rate appears here."
                    )}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Sites */}
          <Card>
            <CardHeader>
              <CardTitle>Sites</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="flex items-center gap-2 text-sm text-slate-400">
                  <Eye className="h-3.5 w-3.5" /> Views
                </span>
                <span className="text-lg font-bold text-slate-100">{totalViews}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="flex items-center gap-2 text-sm text-slate-400">
                  <MessageSquare className="h-3.5 w-3.5" /> Enquiries
                </span>
                <span className="text-lg font-bold text-slate-100">{leadCount}</span>
              </div>
              <div className="flex items-baseline justify-between border-t border-slate-800 pt-3">
                <span className="text-sm text-slate-400">Views to enquiry</span>
                <span className="text-lg font-bold text-brand-400">{pct(leadCount, totalViews)}%</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-slate-400">Sites live</span>
                <span className="text-lg font-bold text-slate-100">{liveProjects}</span>
              </div>
              <div className="flex items-baseline justify-between border-t border-slate-800 pt-3 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3 w-3" /> Emails sent
                </span>
                <span>
                  {emails.SENT ?? 0} sent
                  {emails.FAILED ? ` · ${emails.FAILED} failed` : ""}
                  {emails.QUEUED ? ` · ${emails.QUEUED} unsent` : ""}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Per-site performance */}
          <Card>
            <CardHeader>
              <CardTitle>Most viewed</CardTitle>
            </CardHeader>
            <CardContent>
              {previews.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">No previews yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {previews.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-3">
                      <Link
                        href={`/admin/previews/${p.id}`}
                        className="min-w-0 flex-1 truncate text-sm text-slate-300 hover:text-brand-400"
                      >
                        {p.businessName}
                      </Link>
                      <span className="flex flex-none items-center gap-3 text-xs text-slate-500">
                        <span>{p.viewCount} views</span>
                        <span className={p._count.leads > 0 ? "text-brand-400" : ""}>
                          {p._count.leads} enquir{p._count.leads === 1 ? "y" : "ies"}
                        </span>
                        <a href={`/p/${p.slug}`} target="_blank" rel="noreferrer" className="hover:text-slate-300">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Latest enquiries */}
          <Card>
            <CardHeader>
              <CardTitle>Latest enquiries</CardTitle>
            </CardHeader>
            <CardContent>
              {recentLeads.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  Nobody has filled in a client&apos;s form yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {recentLeads.map((l) => (
                    <div key={l.id} className="rounded-md border border-slate-800 bg-slate-950/50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium text-slate-200">{l.name}</p>
                        <span className="flex-none text-xs text-slate-600">{formatDate(l.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {l.preview.businessName}
                        {l.service ? ` · ${l.service}` : ""}
                        {l.phone ? ` · ${l.phone}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        </div>
      </main>
    </>
  );
}
