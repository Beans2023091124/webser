import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Inbox, Phone, Mail, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/admin/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PreviewStatusBadge } from "@/components/previews/preview-status-badge";
import { PreviewForm } from "@/components/previews/preview-form";
import { AiAssistant } from "@/components/previews/ai-assistant";
import { ImageManager } from "@/components/previews/image-manager";
import { DeleteProspectButton } from "@/components/prospects/delete-prospect-button";
import { formatDateTime } from "@/lib/utils";
import { updatePreview, deletePreview } from "../actions";

export default async function PreviewDetailPage({ params }: { params: { id: string } }) {
  const preview = await prisma.preview.findUnique({
    where: { id: params.id },
    include: {
      prospect: true,
      template: true,
      leads: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!preview) notFound();

  const boundUpdate = updatePreview.bind(null, preview.id);
  const boundDelete = deletePreview.bind(null, preview.id);

  return (
    <>
      <Topbar
        title={preview.businessName}
        description={`${preview.template.name} · /p/${preview.slug}`}
        action={
          <div className="flex items-center gap-2">
            <PreviewStatusBadge status={preview.status} />
            <DeleteProspectButton action={boundDelete} />
          </div>
        }
      />

      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <Link
          href="/admin/previews"
          className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to previews
        </Link>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Edit Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <PreviewForm
                  preview={preview}
                  action={boundUpdate}
                  imageManager={
                    <ImageManager
                      previewId={preview.id}
                      gallery={((preview.gallery as string[] | null) ?? []).filter(Boolean)}
                      heroImageUrl={preview.heroImageUrl}
                      logoUrl={preview.logoUrl}
                      faviconUrl={preview.faviconUrl}
                    />
                  }
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6 lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Inbox className="h-4 w-4 text-slate-500" />
                  Leads
                  {preview.leads.length > 0 && (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/30">
                      {preview.leads.length}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {preview.leads.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No quote requests yet. Once this preview is live, anything submitted through the site's form lands
                    here — a real lead is the strongest close you can bring to a sales call.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {preview.leads.map((lead) => (
                      <div key={lead.id} className="rounded-md border border-slate-800 bg-slate-950/50 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-slate-100">{lead.name}</p>
                          <span className="text-xs text-slate-500">{formatDateTime(lead.createdAt)}</span>
                        </div>
                        {lead.service && <p className="mt-1 text-xs text-brand-400">{lead.service}</p>}
                        {lead.message && <p className="mt-2 text-sm text-slate-400">{lead.message}</p>}
                        <div className="mt-2 flex flex-wrap gap-3 text-xs">
                          {lead.phone && (
                            <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-slate-400 hover:text-brand-400">
                              <Phone className="h-3 w-3" /> {lead.phone}
                            </a>
                          )}
                          {lead.email && (
                            <a href={`mailto:${lead.email}`} className="flex items-center gap-1 text-slate-400 hover:text-brand-400">
                              <Mail className="h-3 w-3" /> {lead.email}
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Template</span>
                  <span className="text-slate-200">{preview.template.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Views</span>
                  <span className="text-slate-200">{preview.viewCount}</span>
                </div>
                {preview.prospect && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Prospect</span>
                    <Link href={`/admin/prospects/${preview.prospect.id}`} className="text-brand-400 hover:text-brand-300">
                      {preview.prospect.businessName}
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-brand-400" />
                  Edit with AI
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AiAssistant previewId={preview.id} />
              </CardContent>
            </Card>

            <div className="rounded-md border border-dashed border-slate-700 bg-slate-800/40 p-3 text-xs text-slate-400">
              Set status to <span className="font-medium text-slate-200">Active</span> before sending the link to
              your prospect. <span className="font-medium text-slate-200">Draft</span> previews are still viewable
              via direct link, but won't show as sent in the pipeline.
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
