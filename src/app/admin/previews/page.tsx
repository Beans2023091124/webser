import Link from "next/link";
import { ExternalLink, Eye, Lock } from "lucide-react";
import type { Preview, Prospect, Template } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/admin/topbar";
import { PreviewStatusBadge } from "@/components/previews/preview-status-badge";
import { formatDate } from "@/lib/utils";

type Row = Preview & { prospect: Prospect | null; template: Template };

function PreviewTable({ rows, showProspect }: { rows: Row[]; showProspect: boolean }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
      <table className={`w-full text-sm ${showProspect ? "min-w-[640px]" : "min-w-[560px]"}`}>
        <thead className="border-b border-slate-800 bg-slate-900/60 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Business</th>
            <th className="px-4 py-3">Template</th>
            {showProspect && <th className="px-4 py-3">Prospect</th>}
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Views</th>
            <th className="px-4 py-3">Updated</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/80">
          {rows.map((p) => (
            <tr key={p.id} className="hover:bg-slate-800/50">
              <td className="px-4 py-3">
                <Link
                  href={`/admin/previews/${p.id}`}
                  className="font-medium text-slate-100 hover:text-brand-400"
                >
                  {p.businessName}
                </Link>
                <p className="text-xs text-slate-500">/p/{p.slug}</p>
              </td>
              <td className="px-4 py-3 text-slate-400">{p.template.name}</td>
              {showProspect && (
                <td className="px-4 py-3">
                  {p.prospect ? (
                    <Link
                      href={`/admin/prospects/${p.prospect.id}`}
                      className="text-slate-400 hover:text-brand-400"
                    >
                      {p.prospect.businessName}
                    </Link>
                  ) : (
                    <span className="text-slate-600">&mdash;</span>
                  )}
                </td>
              )}
              <td className="px-4 py-3">
                <PreviewStatusBadge status={p.status} />
              </td>
              <td className="px-4 py-3 text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5 text-slate-600" /> {p.viewCount}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-500">{formatDate(p.updatedAt)}</td>
              <td className="px-4 py-3 text-right">
                <a
                  href={`/p/${p.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300"
                >
                  View <ExternalLink className="h-3 w-3" />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function PreviewsPage() {
  const previews = await prisma.preview.findMany({
    orderBy: { updatedAt: "desc" },
    include: { prospect: true, template: true },
  });

  // Examples are marketing, not pipeline. Mixing them into the same list makes
  // the preview count read wrong and puts a permanent site next to disposable
  // ones.
  const client = previews.filter((p) => !p.isDemo);
  const demos = previews.filter((p) => p.isDemo);

  return (
    <>
      <Topbar
        title="Previews"
        description={`${client.length} website preview${client.length === 1 ? "" : "s"} generated`}
      />

      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-6xl space-y-8">
        <section>
          {demos.length > 0 && (
            <h2 className="mb-4 text-lg font-bold tracking-tight text-slate-50">Client previews</h2>
          )}
          {client.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-12 text-center text-slate-500">
              No previews yet. Generate one from a prospect&apos;s detail page.
            </div>
          ) : (
            <PreviewTable rows={client} showProspect />
          )}
        </section>

        {demos.length > 0 && (
          <section>
            <h2 className="mb-1 flex items-center gap-2 text-lg font-bold tracking-tight text-slate-50">
              Example sites
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-400">
                <Lock className="h-2.5 w-2.5" /> protected
              </span>
            </h2>
            <p className="mb-3 text-xs text-slate-500">
              The demonstrations linked from your marketing page. They stay out of Analytics, and
              they can&apos;t be deleted here &mdash; re-run{" "}
              <code className="text-slate-400">scripts/seed-demos.ts</code> to change them in bulk.
            </p>
            <PreviewTable rows={demos} showProspect={false} />
          </section>
        )}
      </div>
      </main>
    </>
  );
}
