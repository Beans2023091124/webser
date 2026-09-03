import Link from "next/link";
import { getServerSession } from "next-auth";
import {
  Users,
  PhoneCall,
  Sparkles,
  MonitorPlay,
  Send,
  Trophy,
  Wallet,
  Briefcase,
  CheckCircle2,
  DollarSign,
  Clock,
  XCircle,
  Plus,
} from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/admin/topbar";
import { StatCard } from "@/components/admin/stat-card";
import { ActivityItem } from "@/components/admin/activity-item";
import { StatusBadge } from "@/components/prospects/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

/** Section heading, styled like the marketing page section headings. */
function SectionHeading({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-bold tracking-tight text-slate-50">{title}</h2>
      {hint && <p className="mt-1 text-sm text-slate-400">{hint}</p>}
    </div>
  );
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  const [
    totalProspects,
    contacted,
    interested,
    won,
    lost,
    followUpLater,
    recentActivity,
    recentProspects,
    previewsCreated,
    proposalsSent,
    activeClients,
    completedWebsites,
    paidInvoices,
    pendingInvoices,
  ] = await Promise.all([
    prisma.prospect.count(),
    prisma.prospect.count({ where: { status: { notIn: ["NEW", "RESEARCHING"] } } }),
    prisma.prospect.count({ where: { status: "INTERESTED" } }),
    prisma.prospect.count({ where: { status: "WON" } }),
    prisma.prospect.count({ where: { status: "LOST" } }),
    prisma.prospect.count({ where: { status: "FOLLOW_UP_LATER" } }),
    prisma.activity.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { prospect: true, createdBy: true },
    }),
    prisma.prospect.findMany({ take: 5, orderBy: { updatedAt: "desc" } }),
    // Demos are marketing, not work done for a client.
    prisma.preview.count({ where: { isDemo: false } }),
    prisma.prospect.count({ where: { status: "PREVIEW_SENT" } }),
    prisma.project.count({ where: { status: { notIn: ["LIVE", "CANCELLED"] } } }),
    prisma.project.count({ where: { status: "LIVE" } }),
    prisma.invoice.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
    prisma.invoice.count({ where: { status: "SENT" } }),
  ]);

  const contactRate = totalProspects > 0 ? Math.round((contacted / totalProspects) * 100) : 0;
  const revenue = Number(paidInvoices._sum.amount ?? 0);

  return (
    <>
      <Topbar
        title="Dashboard"
        description="Your web-design business at a glance."
        userName={session?.user?.name}
        action={
          <Link href="/admin/prospects/new">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              New prospect
            </Button>
          </Link>
        }
      />

      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-6xl space-y-10">
          {/*
            These used to be twelve equal cards in one flat grid, which made a
            wall of numbers with no top line. Grouping them gives the page a
            reading order: what you have earned, what is coming, what is built.
          */}
          <section>
            <SectionHeading title="Money" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <StatCard
                label="Revenue"
                value={formatCurrency(revenue)}
                icon={DollarSign}
                accent="emerald"
                hint="Invoices marked paid"
                emphasis
              />
              <StatCard
                label="Pending payments"
                value={pendingInvoices}
                icon={Wallet}
                accent="amber"
                hint="Invoiced, not yet paid"
                emphasis
              />
            </div>
          </section>

          <section>
            <SectionHeading title="Pipeline" hint="Where your prospects have got to." />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Prospects" value={totalProspects} icon={Users} accent="slate" />
              <StatCard
                label="Contacted"
                value={contacted}
                icon={PhoneCall}
                accent="brand"
                hint={totalProspects > 0 ? `${contactRate}% of pipeline` : undefined}
              />
              <StatCard label="Interested" value={interested} icon={Sparkles} accent="violet" />
              <StatCard label="Previews sent" value={proposalsSent} icon={Send} accent="brand" />
              <StatCard label="Won" value={won} icon={Trophy} accent="emerald" />
              <StatCard label="Lost" value={lost} icon={XCircle} accent="red" />
              <StatCard
                label="Follow up later"
                value={followUpLater}
                icon={Clock}
                accent="amber"
              />
            </div>
          </section>

          <section>
            <SectionHeading title="Delivery" hint="Sites you have built and are looking after." />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard
                label="Previews built"
                value={previewsCreated}
                icon={MonitorPlay}
                accent="brand"
              />
              <StatCard
                label="Active clients"
                value={activeClients}
                icon={Briefcase}
                accent="brand"
              />
              <StatCard
                label="Sites live"
                value={completedWebsites}
                icon={CheckCircle2}
                accent="emerald"
              />
            </div>
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Recent activity</CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivity.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500">
                    No activity yet. Add a prospect to get started.
                  </p>
                ) : (
                  <div className="mt-2">
                    {recentActivity.map((a, i) => (
                      <ActivityItem
                        key={a.id}
                        type={a.type}
                        description={`${a.prospect.businessName} — ${a.description}`}
                        outcome={a.outcome}
                        createdAt={a.createdAt}
                        createdByName={a.createdBy?.name}
                        isLast={i === recentActivity.length - 1}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recently updated</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {recentProspects.length === 0 && (
                    <p className="py-8 text-center text-sm text-slate-500">No prospects yet.</p>
                  )}
                  {recentProspects.map((p) => (
                    <Link
                      key={p.id}
                      href={`/admin/prospects/${p.id}`}
                      className="-mx-2 flex items-center justify-between gap-3 rounded-lg p-2 transition-colors hover:bg-slate-800/60"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-100">
                          {p.businessName}
                        </p>
                        <p className="truncate text-xs text-slate-500">{p.category ?? "—"}</p>
                      </div>
                      <StatusBadge status={p.status} />
                    </Link>
                  ))}
                </div>
                <Link href="/admin/prospects" className="mt-4 block">
                  <Button variant="outline" className="w-full" size="sm">
                    View all prospects
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
