import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  ImageIcon,
  MessageSquare,
  Receipt,
  Link2,
  Globe,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/admin/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { DeleteProspectButton } from "@/components/prospects/delete-prospect-button";
import {
  StatusSelect,
  StageActionButton,
  RevisionToggle,
  PortalLink,
  ApplyWithAiButton,
} from "@/components/projects/project-controls";
import { deployHost } from "@/lib/domain";
import { appUrl } from "@/lib/stripe";
import { TextCustomer } from "@/components/admin/text-customer";
import { clientTemplates } from "@/lib/text-templates";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_COLORS,
  INVOICE_TYPE_LABELS,
  REVISION_STATUS_LABELS,
  REVISION_STATUS_COLORS,
} from "@/lib/project";
import { updateProjectDetails, addRevisionAsAdmin, deleteProject } from "../actions";

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      prospect: true,
      preview: true,
      invoices: { orderBy: { createdAt: "desc" } },
      revisions: { orderBy: { createdAt: "desc" } },
      files: { orderBy: { createdAt: "desc" } },
      maintenance: true,
      domain: true,
    },
  });

  if (!project) notFound();

  const host = deployHost();

  const boundUpdate = updateProjectDetails.bind(null, project.id);
  const boundAddRevision = addRevisionAsAdmin.bind(null, project.id);
  const boundDelete = deleteProject.bind(null, project.id);

  const paid = project.invoices
    .filter((i) => i.status === "PAID")
    .reduce((sum, i) => sum + Number(i.amount), 0);
  const openRevisions = project.revisions.filter((r) => r.status !== "DONE");

  return (
    <>
      <Topbar
        title={project.businessName}
        description={`Client project · ${formatCurrency(Number(project.price))}${
          project.monthlyPrice ? ` + ${formatCurrency(Number(project.monthlyPrice))}/mo` : ""
        }`}
        action={
          <div className="flex items-center gap-2">
            <Badge className={PROJECT_STATUS_COLORS[project.status]}>
              {PROJECT_STATUS_LABELS[project.status]}
            </Badge>
            <DeleteProspectButton action={boundDelete} />
          </div>
        }
      />

      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <Link
          href="/admin/projects"
          className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to clients
        </Link>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Project</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <Label>Stage</Label>
                  <StatusSelect projectId={project.id} status={project.status} />
                  <p className="mt-1.5 text-xs text-slate-500">
                    The client sees a plain-English version of this on their portal.
                  </p>
                  <StageActionButton projectId={project.id} status={project.status} />
                </div>

                <form action={boundUpdate} className="space-y-4 border-t border-slate-800 pt-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <Label htmlFor="contactName">Contact Name</Label>
                      <Input id="contactName" name="contactName" defaultValue={project.contactName ?? ""} />
                    </div>
                    <div>
                      <Label htmlFor="contactEmail">Email</Label>
                      <Input id="contactEmail" name="contactEmail" type="email" defaultValue={project.contactEmail ?? ""} />
                    </div>
                    <div>
                      <Label htmlFor="contactPhone">Phone</Label>
                      <PhoneInput id="contactPhone" name="contactPhone" defaultValue={project.contactPhone ?? ""} />
                    </div>
                    <div>
                      <Label htmlFor="price">Build Price ($)</Label>
                      <Input id="price" name="price" type="number" min={0} step={1} defaultValue={Number(project.price)} />
                    </div>
                    <div>
                      <Label htmlFor="monthlyPrice">Monthly ($)</Label>
                      <Input
                        id="monthlyPrice"
                        name="monthlyPrice"
                        type="number"
                        min={0}
                        step={1}
                        defaultValue={project.monthlyPrice ? Number(project.monthlyPrice) : ""}
                        placeholder="25"
                      />
                    </div>
                    <div>
                      <Label htmlFor="liveUrl">Live URL</Label>
                      <Input id="liveUrl" name="liveUrl" defaultValue={project.liveUrl ?? ""} placeholder="https://…" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="adminNotes">Internal Notes</Label>
                    <Textarea id="adminNotes" name="adminNotes" rows={3} defaultValue={project.adminNotes ?? ""} />
                    <p className="mt-1.5 text-xs text-slate-500">Never shown to the client.</p>
                  </div>
                  <div className="flex justify-end">
                    <SubmitButton />
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-slate-500" />
                  Revisions
                  {openRevisions.length > 0 && (
                    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400 ring-1 ring-inset ring-amber-500/30">
                      {openRevisions.length} open
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form action={boundAddRevision} className="mb-5 flex gap-2">
                  <Input name="description" placeholder="Log a change you spotted yourself…" />
                  <Button type="submit" size="sm" variant="outline">Add</Button>
                </form>

                {project.revisions.length === 0 ? (
                  <p className="text-sm text-slate-500">No change requests yet.</p>
                ) : (
                  <div className="space-y-3">
                    {project.revisions.map((r) => (
                      <div key={r.id} className="rounded-md border border-slate-800 bg-slate-950/50 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm text-slate-200">{r.description}</p>
                          <Badge className={REVISION_STATUS_COLORS[r.status]}>
                            {REVISION_STATUS_LABELS[r.status]}
                          </Badge>
                        </div>
                        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3">
                          <p className="text-xs text-slate-500">
                            {r.requestedBy === "CLIENT" ? "Client" : "You"} · {formatDateTime(r.createdAt)}
                          </p>
                          <div className="flex items-center gap-2">
                            {r.status !== "DONE" && (
                              <ApplyWithAiButton revisionId={r.id} previewSlug={project.preview?.slug} />
                            )}
                            <RevisionToggle revisionId={r.id} status={r.status} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Client Files</CardTitle>
              </CardHeader>
              <CardContent>
                {project.files.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Nothing uploaded yet. The client can send their logo and photos from the portal.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {project.files.map((f) => (
                      <a
                        key={f.id}
                        href={f.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group overflow-hidden rounded-md border border-slate-800 bg-slate-950/50"
                      >
                        {f.type === "DOCUMENT" ? (
                          <div className="flex aspect-[4/3] items-center justify-center">
                            <FileText className="h-7 w-7 text-slate-600" />
                          </div>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={f.url} alt={f.filename} className="aspect-[4/3] w-full object-cover" />
                        )}
                        <p className="truncate px-2 py-1.5 text-[11px] text-slate-400 group-hover:text-slate-200">
                          {f.filename}
                        </p>
                      </a>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6 lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-slate-500" />
                  Client Portal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PortalLink projectId={project.id} token={project.portalToken} />

                {project.contactPhone && (
                  <div className="mt-3">
                    <TextCustomer
                      phone={project.contactPhone}
                      templates={clientTemplates({
                        contactName: project.contactName,
                        businessName: project.businessName,
                        portalUrl: `${appUrl()}/portal/${project.portalToken}`,
                        liveUrl: project.liveUrl,
                        status: project.status,
                      })}
                    />
                  </div>
                )}
                <a
                  href={`/portal/${project.portalToken}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300"
                >
                  Open portal <ExternalLink className="h-3 w-3" />
                </a>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-slate-500" />
                  Domain
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {project.domain?.domainName ? (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <a
                        href={`https://${project.domain.domainName}`}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate font-medium text-brand-400 hover:text-brand-300"
                      >
                        {project.domain.domainName}
                      </a>
                      <Badge
                        className={
                          project.domain.dnsStatus === "VERIFIED"
                            ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/30"
                            : project.domain.dnsStatus === "ERROR"
                            ? "bg-red-500/10 text-red-400 ring-red-500/30"
                            : "bg-amber-500/10 text-amber-400 ring-amber-500/30"
                        }
                      >
                        {project.domain.dnsStatus === "VERIFIED"
                          ? "Pointing at us"
                          : project.domain.dnsStatus === "PENDING"
                          ? "Waiting on DNS"
                          : project.domain.dnsStatus === "ERROR"
                          ? "Error"
                          : "Records sent"}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      Chosen by the client from their portal. They reach Live themselves once the
                      records resolve.
                    </p>
                  </>
                ) : (
                  <p className="text-slate-500">
                    No custom domain yet. The client picks one after they approve the site.
                  </p>
                )}
                {!host && (
                  <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-300 ring-1 ring-inset ring-amber-500/25">
                    <span className="font-mono">WEBSER_DEPLOY_HOST</span> isn&apos;t set, so we
                    can&apos;t show clients the DNS records or check them. Until it is, the portal
                    tells them we&apos;ll email the details and leaves going live to you.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-slate-500" />
                  Payments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-slate-500">Collected</span>
                  <span className="text-2xl font-bold text-emerald-400">{formatCurrency(paid)}</span>
                </div>
                {project.invoices.map((i) => (
                  <div
                    key={i.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-slate-800 bg-slate-950/50 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm text-slate-200">{INVOICE_TYPE_LABELS[i.type]}</p>
                      <p className="text-xs text-slate-500">
                        {i.paidAt ? formatDate(i.paidAt) : formatDate(i.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-100">
                        {formatCurrency(Number(i.amount))}
                      </p>
                      <Badge className={`${INVOICE_STATUS_COLORS[i.status]} mt-0.5`}>
                        {INVOICE_STATUS_LABELS[i.status]}
                      </Badge>
                    </div>
                  </div>
                ))}
                {project.maintenance && (
                  <div className="rounded-md border border-slate-800 bg-slate-950/50 px-3 py-2">
                    <p className="text-sm text-slate-200">Maintenance plan</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {project.maintenance.status}
                      {project.maintenance.nextBillingDate
                        ? ` · next ${formatDate(project.maintenance.nextBillingDate)}`
                        : ""}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Linked</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {project.prospect && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Prospect</span>
                    <Link
                      href={`/admin/prospects/${project.prospect.id}`}
                      className="text-brand-400 hover:text-brand-300"
                    >
                      {project.prospect.businessName}
                    </Link>
                  </div>
                )}
                {project.preview && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Preview</span>
                    <Link
                      href={`/admin/previews/${project.preview.id}`}
                      className="text-brand-400 hover:text-brand-300"
                    >
                      /p/{project.preview.slug}
                    </Link>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Created</span>
                  <span className="text-slate-300">{formatDate(project.createdAt)}</span>
                </div>
                {project.approvedAt && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Approved</span>
                    <span className="text-slate-300">{formatDate(project.approvedAt)}</span>
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
