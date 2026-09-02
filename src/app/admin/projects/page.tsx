import Link from "next/link";
import { Briefcase, ExternalLink, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/admin/topbar";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/admin/stat-card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from "@/lib/project";
import { stripeStatus } from "@/lib/stripe";
import { DollarSign, Wallet, CheckCircle2 } from "lucide-react";

export default async function ProjectsPage() {
  const [projects, paidAgg, pendingCount, liveCount, activePlans] = await Promise.all([
    prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        invoices: true,
        revisions: { where: { status: { not: "DONE" } } },
        maintenance: true,
      },
    }),
    prisma.invoice.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
    prisma.project.count({ where: { status: "PAYMENT_PENDING" } }),
    prisma.project.count({ where: { status: { in: ["LIVE", "MAINTENANCE"] } } }),
    prisma.maintenancePlan.count({ where: { status: "ACTIVE" } }),
  ]);

  const stripe = stripeStatus();
  const mrr = activePlans * 25;

  return (
    <>
      <Topbar title="Clients" description={`${projects.length} project${projects.length === 1 ? "" : "s"}`} />

      <main className="flex-1 overflow-y-auto p-6">
        {!stripe.configured && (
          <div className="mb-6 flex items-start gap-3 rounded-lg bg-amber-500/10 p-4 text-sm text-amber-300 ring-1 ring-inset ring-amber-500/30">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
            <div>
              <p className="font-medium">Payments aren&apos;t set up yet.</p>
              <p className="mt-1 text-amber-300/80">{stripe.message}</p>
              <code className="mt-2 inline-block rounded bg-slate-950 px-2 py-1 text-[11px] text-slate-400">
                STRIPE_SECRET_KEY=sk_test_…
              </code>
            </div>
          </div>
        )}
        {stripe.configured && !stripe.webhookConfigured && (
          <div className="mb-6 flex items-start gap-3 rounded-lg bg-amber-500/10 p-4 text-sm text-amber-300 ring-1 ring-inset ring-amber-500/30">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
            <div>
              <p className="font-medium">Webhook not configured.</p>
              <p className="mt-1 text-amber-300/80">{stripe.message}</p>
            </div>
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Revenue Collected"
            value={formatCurrency(Number(paidAgg._sum.amount ?? 0))}
            icon={DollarSign}
            accent="emerald"
          />
          <StatCard label="Awaiting Payment" value={pendingCount} icon={Wallet} accent="amber" />
          <StatCard label="Sites Live" value={liveCount} icon={CheckCircle2} accent="emerald" />
          <StatCard
            label="Monthly Recurring"
            value={formatCurrency(mrr)}
            icon={Briefcase}
            accent="brand"
            hint={`${activePlans} active plan${activePlans === 1 ? "" : "s"}`}
          />
        </div>

        {projects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-800 p-12 text-center text-slate-500">
            No clients yet. Convert a won prospect from its detail page to create the first project.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900 shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-800 bg-slate-900/60 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Paid</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Open Revisions</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {projects.map((p) => {
                  const paid = p.invoices
                    .filter((i) => i.status === "PAID")
                    .reduce((sum, i) => sum + Number(i.amount), 0);
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/projects/${p.id}`}
                          className="font-medium text-slate-100 hover:text-brand-400"
                        >
                          {p.businessName}
                        </Link>
                        <p className="text-xs text-slate-500">
                          {formatCurrency(Number(p.price))}
                          {p.monthlyPrice ? ` + ${formatCurrency(Number(p.monthlyPrice))}/mo` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={PROJECT_STATUS_COLORS[p.status]}>
                          {PROJECT_STATUS_LABELS[p.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{formatCurrency(paid)}</td>
                      <td className="px-4 py-3">
                        {p.maintenance?.status === "ACTIVE" ? (
                          <span className="text-emerald-400">Active</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {p.revisions.length > 0 ? (
                          <span className="text-amber-400">{p.revisions.length}</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(p.updatedAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <a
                          href={`/portal/${p.portalToken}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300"
                        >
                          Portal <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
