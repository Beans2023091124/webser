import { notFound } from "next/navigation";
import {
  Check,
  ExternalLink,
  Sparkles,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { devPaymentsEnabled } from "@/lib/payments";
import { deployHost, requiredRecords, registrarLinks, type DnsRecord } from "@/lib/domain";
import { DomainSetup } from "@/components/portal/domain-setup";
import {
  CLIENT_STAGE_COPY,
  PROJECT_PIPELINE,
  PROJECT_STATUS_LABELS,
  pipelineIndex,
  revisionPrompt,
} from "@/lib/project";
import { ClientFiles } from "@/components/portal/client-files";
import {
  PayButton,
  RevisionForm,
  ApproveButton,
  FileUploadZone,
  DevPaymentPanel,
  ReadyToBuildButton,
  StageDoneModal,
} from "@/components/portal/portal-forms";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { token: string } }) {
  const project = await prisma.project.findUnique({
    where: { portalToken: params.token },
    select: { businessName: true },
  });
  return {
    title: project ? `${project.businessName} — Project Portal` : "Project Portal",
    // A portal link forwarded around shouldn't end up in search results.
    robots: { index: false, follow: false },
  };
}

const ACCENT = "#1463FF";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl shadow-black/20 sm:p-8 ${className}`}>
      {children}
    </section>
  );
}

export default async function PortalPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { paid?: string; subscribed?: string; cancelled?: string; done?: string };
}) {
  const project = await prisma.project.findUnique({
    where: { portalToken: params.token },
    include: {
      preview: true,
      invoices: { orderBy: { createdAt: "desc" } },
      revisions: { orderBy: { createdAt: "desc" } },
      files: { orderBy: { createdAt: "desc" } },
      maintenance: true,
      domain: true,
    },
  });

  if (!project) notFound();

  const stage = CLIENT_STAGE_COPY[project.status];
  const currentIndex = pipelineIndex(project.status);
  const buildInvoice = project.invoices.find((i) => i.type === "FULL");
  const isPaid = buildInvoice?.status === "PAID";
  const openRevisions = project.revisions.filter((r) => r.status !== "DONE");
  const canReview = project.status === "FINAL_REVIEW" || project.status === "REVISION_REQUESTED";
  const askForChanges = revisionPrompt(project.status);
  const awaitingInfo = project.status === "INFORMATION_NEEDED";
  const previewUrl = project.preview ? `/p/${project.preview.slug}` : null;
  const planActive = project.maintenance?.status === "ACTIVE";
  const showDevTools = devPaymentsEnabled();

  // Nothing to upload before they've paid — that stage is only about checkout.
  const showFiles = project.status !== "CANCELLED" && project.status !== "PAYMENT_PENDING";

  // Domain setup: the last step before a site can go live, and a standing
  // offer afterwards for anyone who published on the free address.
  const host = deployHost();
  const domainName = project.domain?.domainName ?? null;
  // Always recompute the A and CNAME rows rather than trusting what was stored
  // when the domain was first saved: a row written under an older version of
  // these instructions would otherwise be shown forever, and the apex row in
  // particular has already changed once. Ownership challenges are the one
  // thing only the stored copy knows, so those are carried across.
  const storedRecords = project.domain?.requiredDnsRecords;
  const storedChallenges = (Array.isArray(storedRecords) ? (storedRecords as DnsRecord[]) : [])
    .filter((r) => r?.type?.toUpperCase() === "TXT")
    .map((r) => ({
      type: "TXT",
      // Stored names are already relative to the zone; requiredRecords expects
      // the full hostname, so put it back together.
      domain: r.name === "@" ? domainName ?? "" : `${r.name}.${domainName ?? ""}`,
      value: r.value,
    }));

  const domainRecords =
    domainName && host
      ? requiredRecords(domainName, host, { challenges: storedChallenges })
      : null;
  const inDomainSetup = project.status === "APPROVED" || project.status === "DEPLOYING";
  const liveWithoutDomain =
    (project.status === "LIVE" || project.status === "MAINTENANCE") && !domainName;
  const domainSuggestion = `${project.businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")}.com`;
  const registrars = registrarLinks(domainSuggestion);

  const domainSetup = (variant: "primary" | "secondary") => (
    <DomainSetup
      token={params.token}
      variant={variant}
      domainName={domainName}
      dnsStatus={project.domain?.dnsStatus ?? null}
      records={domainRecords}
      hostConfigured={Boolean(host)}
      canUseFreeAddress={Boolean(previewUrl) && variant === "primary"}
      registrars={registrars}
      suggestion={domainSuggestion}
    />
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Project Portal
            </p>
            <h1 className="truncate text-xl font-bold text-slate-50 sm:text-2xl">
              {project.businessName}
            </h1>
          </div>
          <span className="flex-none rounded-full bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 ring-1 ring-inset ring-slate-700">
            {PROJECT_STATUS_LABELS[project.status]}
          </span>
        </div>
      </header>

      <StageDoneModal token={params.token} kind={searchParams.done} />

      <main className="mx-auto max-w-4xl space-y-6 px-5 py-8 sm:px-8 sm:py-10">
        {searchParams.paid && (
          <div className="flex items-start gap-3 rounded-xl bg-emerald-500/10 p-4 ring-1 ring-inset ring-emerald-500/25">
            <Check className="mt-0.5 h-5 w-5 flex-none text-emerald-400" />
            <div>
              <p className="font-semibold text-emerald-300">Payment received — thank you!</p>
              <p className="mt-0.5 text-sm text-emerald-200/70">
                If this page still shows as unpaid, give it a moment and refresh.
              </p>
            </div>
          </div>
        )}
        {searchParams.subscribed && (
          <div className="flex items-start gap-3 rounded-xl bg-emerald-500/10 p-4 ring-1 ring-inset ring-emerald-500/25">
            <Check className="mt-0.5 h-5 w-5 flex-none text-emerald-400" />
            <p className="font-semibold text-emerald-300">
              Your maintenance plan is set up. Send changes any time.
            </p>
          </div>
        )}
        {searchParams.cancelled && (
          <div className="rounded-xl bg-slate-900 p-4 text-sm text-slate-300 ring-1 ring-inset ring-slate-800">
            Checkout was cancelled — nothing has been charged.
          </div>
        )}

        {/* Current stage */}
        <Card>
          <h2 className="text-2xl font-bold text-slate-50">{stage.title}</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-400">{stage.body}</p>

          <ol className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {PROJECT_PIPELINE.map((step, i) => {
              const done = currentIndex > i;
              const active = currentIndex === i;
              return (
                <li key={step} className="flex items-start gap-2">
                  <span
                    className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full text-[10px] font-bold ${
                      done || active ? "text-white" : "bg-slate-800 text-slate-500"
                    }`}
                    style={done || active ? { backgroundColor: ACCENT } : undefined}
                  >
                    {done ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
                  </span>
                  <span
                    className={`text-xs leading-tight ${
                      active ? "font-semibold text-slate-100" : "text-slate-500"
                    }`}
                  >
                    {PROJECT_STATUS_LABELS[step]}
                  </span>
                </li>
              );
            })}
          </ol>
        </Card>

        {/* Green light to build — the one thing we need at this stage */}
        {awaitingInfo && (
          <Card className="border-brand-500/30 bg-gradient-to-b from-brand-500/[0.07] to-slate-900">
            <h2 className="text-lg font-bold text-slate-50">Sent us everything?</h2>
            <p className="mt-1.5 text-[15px] leading-relaxed text-slate-400">
              Add your logo and photos below, then let us know and we&apos;ll start building.
              Don&apos;t worry about getting it all perfect &mdash; you can send more at any point.
            </p>
            <div className="mt-5">
              <ReadyToBuildButton token={params.token} />
            </div>
          </Card>
        )}

        {/* Sign-off — the one thing we need from them at this stage */}
        {canReview && (
          <Card className="border-brand-500/30 bg-gradient-to-b from-brand-500/[0.07] to-slate-900">
            <h2 className="text-lg font-bold text-slate-50">Happy with it?</h2>
            <p className="mt-1.5 text-[15px] leading-relaxed text-slate-400">
              Have a look through your site. If it&apos;s right, approve it and we&apos;ll get it
              published. If something needs changing, tell us further down — there&apos;s no rush.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ApproveButton token={params.token} />
              {previewUrl && (
                <a
                  href={project.liveUrl || previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-5 py-3 text-[15px] font-semibold text-slate-200 transition-colors hover:bg-slate-800"
                >
                  <ExternalLink className="h-4 w-4" />
                  Look at it again
                </a>
              )}
            </div>
          </Card>
        )}

        {/* Web address — the live task once they've approved */}
        {inDomainSetup && <Card>{domainSetup("primary")}</Card>}

        {/* Payment */}
        {!isPaid && project.status !== "CANCELLED" && (
          <Card>
            <h2 className="text-lg font-bold text-slate-50">Your website</h2>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-b border-slate-800 pb-5">
              <div>
                <p className="text-sm text-slate-400">One-time design and build</p>
                <p className="mt-1 text-4xl font-extrabold" style={{ color: ACCENT }}>
                  {formatCurrency(Number(project.price))}
                </p>
              </div>
              {project.monthlyPrice && (
                <p className="text-sm text-slate-400">
                  Optional upkeep afterwards:{" "}
                  <span className="font-semibold text-slate-200">
                    {formatCurrency(Number(project.monthlyPrice))}/month
                  </span>
                </p>
              )}
            </div>
            <div className="mt-5">
              <PayButton token={params.token} kind="build" label="Pay and get started" />
              <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                <ShieldCheck className="h-3.5 w-3.5" />
                Secure checkout by Stripe. We never see or store your card details.
              </p>
            </div>
          </Card>
        )}

        {/* Developer tools */}
        {showDevTools && (
          <DevPaymentPanel
            token={params.token}
            canPayBuild={!isPaid}
            canStartMaintenance={isPaid && Boolean(project.monthlyPrice) && !planActive}
            canForceLive={inDomainSetup}
          />
        )}

        {/* Their site */}
        {previewUrl && (
          <Card>
            <h2 className="text-lg font-bold text-slate-50">Your site</h2>
            <p className="mt-1.5 text-[15px] text-slate-400">
              {project.liveUrl
                ? "Your website is live at the address below."
                : "Here's the current version. It isn't public yet."}
            </p>
            <a
              href={project.liveUrl || previewUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-800"
            >
              <ExternalLink className="h-4 w-4" />
              {project.liveUrl ? "Visit your live site" : "View your site"}
            </a>
          </Card>
        )}

        {/* Maintenance */}
        {isPaid && project.monthlyPrice && (
          <Card>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-50">
              <Sparkles className="h-4 w-4" style={{ color: ACCENT }} />
              Keep it updated
            </h2>
            {planActive ? (
              <div className="mt-3 flex items-start gap-3 rounded-lg bg-emerald-500/10 p-4 ring-1 ring-inset ring-emerald-500/25">
                <Check className="mt-0.5 h-5 w-5 flex-none text-emerald-400" />
                <div>
                  <p className="font-semibold text-emerald-300">
                    Maintenance plan active — {formatCurrency(Number(project.monthlyPrice))}/month
                  </p>
                  {project.maintenance?.nextBillingDate && (
                    <p className="mt-0.5 text-sm text-emerald-200/70">
                      Next payment {formatDate(project.maintenance.nextBillingDate)}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-emerald-200/70">
                    Send us changes any time and we&apos;ll take care of them.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <p className="mt-1.5 text-[15px] text-slate-400">
                  {formatCurrency(Number(project.monthlyPrice))} a month covers edits, updates, and
                  keeping everything running. Cancel whenever you like.
                </p>
                <div className="mt-5">
                  <PayButton
                    token={params.token}
                    kind="maintenance"
                    label={`Start maintenance — ${formatCurrency(Number(project.monthlyPrice))}/mo`}
                  />
                </div>
              </>
            )}
          </Card>
        )}

        {/* Web address — standing offer for anyone on the free address */}
        {liveWithoutDomain && <Card>{domainSetup("secondary")}</Card>}

        {/* Change history */}
        {project.revisions.length > 0 && (
          <Card>
            <h2 className="text-lg font-bold text-slate-50">
              Your change requests
              {openRevisions.length > 0 && (
                <span className="ml-2 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-400 ring-1 ring-inset ring-amber-500/25">
                  {openRevisions.length} in progress
                </span>
              )}
            </h2>
            <ul className="mt-4 space-y-3">
              {project.revisions.map((r) => (
                <li key={r.id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[15px] text-slate-200">{r.description}</p>
                    <span
                      className={`flex-none rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                        r.status === "DONE"
                          ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/25"
                          : "bg-amber-500/10 text-amber-400 ring-amber-500/25"
                      }`}
                    >
                      {r.status === "DONE" ? "Done" : "In progress"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-600">
                    {r.requestedBy === "CLIENT" ? "You" : "Us"} · {formatDate(r.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Files */}
        {showFiles && (
          <Card>
            <h2 className="text-lg font-bold text-slate-50">Your logo and photos</h2>
            <p className="mt-1.5 text-[15px] text-slate-400">
              Real photos of your work make a big difference. Send whatever you have — we&apos;ll
              handle the rest.
            </p>
            <div className="mt-5">
              <FileUploadZone token={params.token} />
            </div>

            <ClientFiles
              token={params.token}
              files={project.files.map((f) => ({
                id: f.id,
                url: f.url,
                filename: f.filename,
                type: f.type,
                uploadedBy: f.uploadedBy,
                createdAt: f.createdAt.toISOString(),
              }))}
            />
          </Card>
        )}

        {/* Request changes — available at every active stage, not just review */}
        {askForChanges && (
          <Card>
            <h2 className="text-lg font-bold text-slate-50">{askForChanges.heading}</h2>
            <p className="mt-1.5 text-[15px] text-slate-400">{askForChanges.body}</p>
            <div className="mt-5">
              <RevisionForm token={params.token} placeholder={askForChanges.placeholder} />
            </div>
          </Card>
        )}

        {/* Receipts */}
        {project.invoices.some((i) => i.status === "PAID") && (
          <Card>
            <h2 className="text-lg font-bold text-slate-50">Payments</h2>
            <ul className="mt-4 divide-y divide-slate-800">
              {project.invoices
                .filter((i) => i.status === "PAID")
                .map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-200">
                        {i.type === "MAINTENANCE" ? "Monthly maintenance" : "Website build"}
                      </p>
                      <p className="text-xs text-slate-500">
                        <Clock className="mr-1 inline h-3 w-3" />
                        {formatDate(i.paidAt ?? i.createdAt)}
                      </p>
                    </div>
                    <span className="font-semibold text-slate-100">
                      {formatCurrency(Number(i.amount))}
                    </span>
                  </li>
                ))}
            </ul>
          </Card>
        )}

        <footer className="pb-4 pt-2 text-center text-sm text-slate-500">
          <p>Questions? Just reply to our last email and we&apos;ll get back to you.</p>
          <p className="mt-3 text-xs text-slate-600">Managed with Webser</p>
        </footer>
      </main>
    </div>
  );
}
