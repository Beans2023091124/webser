import Link from "next/link";
import { Plus, Search, Phone, Mail } from "lucide-react";
import { Prisma, ProspectStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/admin/topbar";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { StatusBadge } from "@/components/prospects/status-badge";
import { PROSPECT_STATUSES, PROSPECT_STATUS_LABELS } from "@/lib/prospect";
import { formatCurrency, formatDate } from "@/lib/utils";

type SearchParams = {
  q?: string;
  status?: string;
  sort?: string;
  dir?: "asc" | "desc";
};

const SORTABLE_FIELDS = ["businessName", "status", "estimatedPrice", "followUpDate", "updatedAt"] as const;

export default async function ProspectsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const q = searchParams.q?.trim() ?? "";
  const statusFilter = searchParams.status ?? "";
  const sort = SORTABLE_FIELDS.includes(searchParams.sort as typeof SORTABLE_FIELDS[number])
    ? (searchParams.sort as typeof SORTABLE_FIELDS[number])
    : "updatedAt";
  const dir = searchParams.dir === "asc" ? "asc" : "desc";

  const where: Prisma.ProspectWhereInput = {
    ...(statusFilter ? { status: statusFilter as ProspectStatus } : {}),
    ...(q
      ? {
          OR: [
            { businessName: { contains: q, mode: "insensitive" } },
            { category: { contains: q, mode: "insensitive" } },
            { city: { contains: q, mode: "insensitive" } },
            { contactName: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const prospects = await prisma.prospect.findMany({
    where,
    orderBy: { [sort]: dir },
  });

  function sortLink(field: string, label: string) {
    const nextDir = sort === field && dir === "asc" ? "desc" : "asc";
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (statusFilter) params.set("status", statusFilter);
    params.set("sort", field);
    params.set("dir", nextDir);
    return (
      <Link href={`/admin/prospects?${params.toString()}`} className="inline-flex items-center gap-1 hover:text-slate-200">
        {label}
        {sort === field && <span className="text-brand-400">{dir === "asc" ? "↑" : "↓"}</span>}
      </Link>
    );
  }

  return (
    <>
      <Topbar
        title="Prospects"
        description={`${prospects.length} businesses in your pipeline`}
        action={
          <Link href="/admin/prospects/new">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              New Prospect
            </Button>
          </Link>
        }
      />

      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        {/* Filters */}
        <form className="mb-4 flex flex-wrap items-center gap-3" method="GET">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input name="q" defaultValue={q} placeholder="Search prospects…" className="pl-8" />
          </div>
          <Select name="status" defaultValue={statusFilter} className="w-48">
            <option value="">All statuses</option>
            {PROSPECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PROSPECT_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="outline" size="sm">
            Apply
          </Button>
          {(q || statusFilter) && (
            <Link href="/admin/prospects" className="text-sm text-slate-500 hover:text-slate-300">
              Clear filters
            </Link>
          )}
        </form>

        {/* Status quick filters */}
        <div className="mb-4 flex flex-wrap gap-2">
          {PROSPECT_STATUSES.map((s) => (
            <Link
              key={s}
              href={`/admin/prospects?status=${s}`}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-colors ${
                statusFilter === s
                  ? "bg-brand-600 text-white ring-brand-600"
                  : "bg-slate-900 text-slate-400 ring-slate-800 hover:bg-slate-800"
              }`}
            >
              {PROSPECT_STATUS_LABELS[s]}
            </Link>
          ))}
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 shadow-sm">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-slate-800 bg-slate-900/60 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">{sortLink("businessName", "Business")}</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">{sortLink("status", "Status")}</th>
                <th className="px-4 py-3">{sortLink("estimatedPrice", "Est. Price")}</th>
                <th className="px-4 py-3">{sortLink("followUpDate", "Follow-up")}</th>
                <th className="px-4 py-3">{sortLink("updatedAt", "Updated")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {prospects.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    No prospects match your filters.
                  </td>
                </tr>
              )}
              {prospects.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/prospects/${p.id}`} className="block">
                      <p className="font-medium text-slate-100">{p.businessName}</p>
                      <p className="text-xs text-slate-500">
                        {[p.category, p.city].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    <div className="flex flex-col gap-0.5 text-xs">
                      {p.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-slate-600" /> {p.phone}
                        </span>
                      )}
                      {p.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-slate-600" /> {p.email}
                        </span>
                      )}
                      {!p.phone && !p.email && "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {p.estimatedPrice ? formatCurrency(Number(p.estimatedPrice)) : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{formatDate(p.followUpDate)}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(p.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
