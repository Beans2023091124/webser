import Link from "next/link";
import { ExternalLink, Eye } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/admin/topbar";
import { PreviewStatusBadge } from "@/components/previews/preview-status-badge";
import { formatDate } from "@/lib/utils";

export default async function PreviewsPage() {
  const previews = await prisma.preview.findMany({
    orderBy: { updatedAt: "desc" },
    include: { prospect: true, template: true },
  });

  return (
    <>
      <Topbar
        title="Previews"
        description={`${previews.length} website preview${previews.length === 1 ? "" : "s"} generated`}
      />

      <main className="flex-1 overflow-y-auto p-6">
        {previews.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-800 p-12 text-center text-slate-500">
            No previews yet. Generate one from a prospect's detail page.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900 shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-800 bg-slate-900/60 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Business</th>
                  <th className="px-4 py-3">Template</th>
                  <th className="px-4 py-3">Prospect</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Views</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {previews.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/previews/${p.id}`} className="font-medium text-slate-100 hover:text-brand-400">
                        {p.businessName}
                      </Link>
                      <p className="text-xs text-slate-500">/p/{p.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{p.template.name}</td>
                    <td className="px-4 py-3">
                      {p.prospect ? (
                        <Link href={`/admin/prospects/${p.prospect.id}`} className="text-slate-400 hover:text-brand-400">
                          {p.prospect.businessName}
                        </Link>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
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
        )}
      </main>
    </>
  );
}
