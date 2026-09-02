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
  ArrowRight,
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
  ] = await Promise.all([
    prisma.prospect.count(),
    prisma.prospect.count({
      where: { status: { notIn: ["NEW", "RESEARCHING"] } },
    }),
    prisma.prospect.count({ where: { status: "INTERESTED" } }),
    prisma.prospect.count({ where: { status: "WON" } }),
    prisma.prospect.count({ where: { status: "LOST" } }),
    prisma.prospect.count({ where: { status: "FOLLOW_UP_LATER" } }),
    prisma.activity.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { prospect: true, createdBy: true },
    }),
    prisma.prospect.findMany({
      take: 5,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  // Phase 4+ entities — real counts once those phases are wired up.
  const previewsCreated = await prisma.preview.count();
  const proposalsSent = await prisma.prospect.count({ where: { status: "PREVIEW_SENT" } });
  const activeClients = await prisma.project.count({
    where: { status: { notIn: ["LIVE", "CANCELLED"] } },
  });
  const completedWebsites = await prisma.project.count({ where: { status: "LIVE" } });
  const paidInvoices = await prisma.invoice.aggregate({
    where: { status: "PAID" },
    _sum: { amount: true },
  });
  const pendingInvoices = await prisma.invoice.count({ where: { status: "SENT" } });

  const contactRate = totalProspects > 0 ? Math.round((contacted / totalProspects) * 100) : 0;

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
              New Prospect
            </Button>
          </Link>
        }
      />

      <main className="flex-1 overflow-y-auto p-6">
        {/* Workflow strip */}
        <div className="mb-6 flex items-center gap-2 overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-xs font-medium text-slate-500">
          {[
            "Find Business",
            "Create Prospect",
            "Generate Preview",
            "Send Preview",
            "Close Sale",
            "Collect Payment",
            "Build",
            "Approve",
            "Deploy",
            "Transfer",
          ].map((step, i, arr) => (
            <span key={step} className="flex items-center gap-2 whitespace-nowrap">
              <span className={i < 6 ? "text-brand-400" : ""}>{step}</span>
              {i < arr.length - 1 && <ArrowRight className="h-3 w-3 text-slate-700" />}
            </span>
          ))}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Prospects" value={totalProspects} icon={Users} accent="slate" />
          <StatCard
            label="Prospects Contacted"
            value={contacted}
            icon={PhoneCall}
            accent="brand"
            hint={`${contactRate}% of pipeline`}
          />
          <StatCard label="Interested" value={interested} icon={Sparkles} accent="violet" />
          <StatCard
            label="Previews Created"
            value={previewsCreated}
            icon={MonitorPlay}
            accent="brand"
          />
          <StatCard
            label="Proposals Sent"
            value={proposalsSent}
            icon={Send}
            accent="slate"
          />
          <StatCard label="Sales (Won)" value={won} icon={Trophy} accent="emerald" />
          <StatCard
            label="Pending Payments"
            value={pendingInvoices}
            icon={Wallet}
            accent="amber"
          />
          <StatCard
            label="Active Clients"
            value={activeClients}
            icon={Briefcase}
            accent="brand"
          />
          <StatCard
            label="Completed Websites"
            value={completedWebsites}
            icon={CheckCircle2}
            accent="emerald"
            hint="Unlocks in Phase 4"
          />
          <StatCard
            label="Revenue"
            value={formatCurrency(Number(paidInvoices._sum.amount ?? 0))}
            icon={DollarSign}
            accent="emerald"
          />
          <StatCard label="Lost" value={lost} icon={Users} accent="red" />
          <StatCard label="Follow Up Later" value={followUpLater} icon={Users} accent="amber" />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Recent activity */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">
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

          {/* Recently updated prospects */}
          <Card>
            <CardHeader>
              <CardTitle>Recently Updated</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentProspects.length === 0 && (
                  <p className="py-8 text-center text-sm text-slate-400">No prospects yet.</p>
                )}
                {recentProspects.map((p) => (
                  <Link
                    key={p.id}
                    href={`/admin/prospects/${p.id}`}
                    className="flex items-center justify-between rounded-md p-2 -mx-2 hover:bg-slate-800/60"
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
      </main>
    </>
  );
}
