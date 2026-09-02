import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Phone, Mail, MapPin, Globe, ExternalLink, MonitorPlay, Eye } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/admin/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/prospects/status-badge";
import { PreviewStatusBadge } from "@/components/previews/preview-status-badge";
import { ActivityItem } from "@/components/admin/activity-item";
import { ProspectForm } from "@/components/prospects/prospect-form";
import { LogActivityForm } from "@/components/prospects/log-activity-form";
import { DeleteProspectButton } from "@/components/prospects/delete-prospect-button";
import { GeneratePreviewButton } from "@/components/prospects/generate-preview-button";
import { ConvertToProjectButton } from "@/components/prospects/convert-button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { TextCustomer } from "@/components/admin/text-customer";
import { prospectTemplates } from "@/lib/text-templates";
import { appUrl } from "@/lib/stripe";
import { mapCategoryToIndustry, INDUSTRY_DEFAULTS } from "@/lib/preview";
import { updateProspect, deleteProspect, logActivity } from "../actions";
import { createProjectFromProspect } from "../../projects/actions";
import { generatePreviewFromProspect } from "../../previews/actions";

export default async function ProspectDetailPage({ params }: { params: { id: string } }) {
  const prospect = await prisma.prospect.findUnique({
    where: { id: params.id },
    include: {
      activities: { orderBy: { createdAt: "desc" }, include: { createdBy: true } },
      previews: { orderBy: { createdAt: "desc" } },
      project: true,
    },
  });

  if (!prospect) notFound();

  const boundGenerate = generatePreviewFromProspect.bind(null, prospect.id, undefined);
  const boundConvert = createProjectFromProspect.bind(null, prospect.id);
  const suggestedIndustry = mapCategoryToIndustry(prospect.category);

  const boundUpdate = updateProspect.bind(null, prospect.id);
  const boundDelete = deleteProspect.bind(null, prospect.id);

  return (
    <>
      <Topbar
        title={prospect.businessName}
        description={prospect.category ?? "Prospect"}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge status={prospect.status} />
            <DeleteProspectButton action={boundDelete} />
          </div>
        }
      />

      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <Link
          href="/admin/prospects"
          className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to prospects
        </Link>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left: quick facts + activity */}
          <div className="space-y-6 lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Quick Facts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {prospect.phone && (
                  <>
                    <a href={`tel:${prospect.phone}`} className="flex items-center gap-2 text-slate-400 hover:text-brand-400">
                      <Phone className="h-4 w-4 text-slate-400" /> {prospect.phone}
                    </a>
                    <TextCustomer
                      phone={prospect.phone}
                      templates={prospectTemplates({
                        contactName: prospect.contactName,
                        businessName: prospect.businessName,
                        previewUrl: prospect.previews[0] ? `${appUrl()}/p/${prospect.previews[0].slug}` : null,
                      })}
                    />
                  </>
                )}
                {prospect.email && (
                  <a href={`mailto:${prospect.email}`} className="flex items-center gap-2 text-slate-400 hover:text-brand-400">
                    <Mail className="h-4 w-4 text-slate-400" /> {prospect.email}
                  </a>
                )}
                {(prospect.address || prospect.city) && (
                  <p className="flex items-start gap-2 text-slate-400">
                    <MapPin className="mt-0.5 h-4 w-4 flex-none text-slate-400" />
                    <span>
                      {prospect.address && <>{prospect.address}<br /></>}
                      {[prospect.city, prospect.state, prospect.zip].filter(Boolean).join(", ")}
                    </span>
                  </p>
                )}
                {prospect.currentWebsite && (
                  <a
                    href={prospect.currentWebsite}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-slate-400 hover:text-brand-400"
                  >
                    <Globe className="h-4 w-4 text-slate-400" /> {prospect.currentWebsite}
                  </a>
                )}
                {prospect.gmbUrl && (
                  <a
                    href={prospect.gmbUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-slate-400 hover:text-brand-400"
                  >
                    <ExternalLink className="h-4 w-4 text-slate-400" /> Google Business Listing
                  </a>
                )}

                <div className="border-t border-slate-800 pt-3">
                  <div className="flex justify-between text-slate-500">
                    <span>Estimated price</span>
                    <span className="font-medium text-slate-100">
                      {prospect.estimatedPrice ? formatCurrency(Number(prospect.estimatedPrice)) : "—"}
                    </span>
                  </div>
                  <div className="mt-1 flex justify-between text-slate-500">
                    <span>Source</span>
                    <span className="font-medium text-slate-100">{prospect.source ?? "—"}</span>
                  </div>
                  <div className="mt-1 flex justify-between text-slate-500">
                    <span>Date contacted</span>
                    <span className="font-medium text-slate-100">{formatDate(prospect.dateContacted)}</span>
                  </div>
                  <div className="mt-1 flex justify-between text-slate-500">
                    <span>Follow-up</span>
                    <span className="font-medium text-slate-100">{formatDate(prospect.followUpDate)}</span>
                  </div>
                </div>

              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Website Previews</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <GeneratePreviewButton
                  action={boundGenerate}
                  label={
                    prospect.previews.length > 0
                      ? `Generate Another (${INDUSTRY_DEFAULTS[suggestedIndustry].label})`
                      : `Generate Preview (${INDUSTRY_DEFAULTS[suggestedIndustry].label} template)`
                  }
                />
                {prospect.previews.length === 0 ? (
                  <p className="text-center text-xs text-slate-500">No previews generated yet.</p>
                ) : (
                  <div className="space-y-2">
                    {prospect.previews.map((preview) => (
                      <Link
                        key={preview.id}
                        href={`/admin/previews/${preview.id}`}
                        className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm hover:border-slate-700"
                      >
                        <span className="flex items-center gap-2 text-slate-300">
                          <MonitorPlay className="h-3.5 w-3.5 text-slate-500" />
                          /p/{preview.slug}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Eye className="h-3 w-3" /> {preview.viewCount}
                          </span>
                          <PreviewStatusBadge status={preview.status} />
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Client Project</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <ConvertToProjectButton action={boundConvert} existingProjectId={prospect.project?.id} />
                <p className="text-xs text-slate-500">
                  {prospect.project
                    ? "This prospect is already a paying client project."
                    : "Creates the project, the first invoice, and a private portal link to send them."}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Log Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <LogActivityForm prospectId={prospect.id} action={logActivity} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Activity Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                {prospect.activities.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-400">No activity logged yet.</p>
                ) : (
                  <div className="mt-2">
                    {prospect.activities.map((a, i) => (
                      <ActivityItem
                        key={a.id}
                        type={a.type}
                        description={a.description}
                        outcome={a.outcome}
                        createdAt={a.createdAt}
                        createdByName={a.createdBy?.name}
                        isLast={i === prospect.activities.length - 1}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: edit form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Business Details</CardTitle>
              </CardHeader>
              <CardContent>
                <ProspectForm prospect={prospect} action={boundUpdate} />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
