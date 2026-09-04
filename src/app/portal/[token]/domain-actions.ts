"use server";

import { revalidatePath } from "next/cache";
import { ProjectStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeDomain, checkServes, explainFailure } from "@/lib/domain";
import { publishedSiteUrl } from "@/lib/host";
import { provisionDomain, getDomainConfig, vercelConfigured } from "@/lib/vercel";

/**
 * Connecting a customer's own web address.
 *
 * The site is already live on its free address before any of this runs, so
 * every failure here is recoverable and none of it can take a site down. That
 * is the whole design: connecting a domain is an optional improvement, not a
 * gate in front of going live.
 *
 * The token in the URL is the credential; the project is always looked up by
 * it and never by an id from the form.
 */

export type DomainResult = { ok: boolean; message?: string; error?: string };

/** Domains can be connected once a site is published, and not before. */
const CONNECTABLE: ProjectStatus[] = [ProjectStatus.LIVE, ProjectStatus.MAINTENANCE];

async function projectFor(token: string) {
  const project = await prisma.project.findUnique({
    where: { portalToken: token },
    include: { domain: true, preview: true },
  });
  if (!project) return { error: "We couldn't find that project." as const };
  if (!CONNECTABLE.includes(project.status)) {
    return { error: "Your site needs to be published before you can connect an address." as const };
  }
  return { project };
}

function touch(token: string, projectId: string) {
  revalidatePath(`/portal/${token}`);
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath("/admin/projects");
}

/**
 * Attach the name to the host, both with and without www.
 *
 * Idempotent, and run on both connect and check, which is what makes the flow
 * self-healing: a domain that failed to attach the first time is picked up the
 * next time the customer presses check, rather than staying broken forever.
 */
async function attach(domain: string): Promise<{ blocked: string | null }> {
  if (!vercelConfigured()) {
    console.warn(
      `[domain] hosting API not configured — ${domain} must be added to the project by hand or it will not serve.`
    );
    return { blocked: null };
  }

  const [apex, www] = await Promise.all([
    provisionDomain(domain),
    provisionDomain(`www.${domain}`),
  ]);

  if (apex.takenElsewhere) return { blocked: apex.detail };
  if (!apex.attached) console.error("[domain] apex not attached", domain, apex.detail);
  if (!www.attached) console.error("[domain] www not attached", domain, www.detail);
  return { blocked: null };
}

/** Save the address the customer owns and start the certificate. */
export async function connectDomain(token: string, formData: FormData): Promise<DomainResult> {
  const found = await projectFor(token);
  if (found.error) return { ok: false, error: found.error };
  const { project } = found;

  const domain = normalizeDomain(String(formData.get("domain") ?? ""));
  if (!domain) {
    return { ok: false, error: "That doesn't look like a web address. Try something like mybusiness.com." };
  }

  // An address can only sit on one project. The customer is told what to do
  // but not who holds it -- that would name a different customer's business to
  // them -- so the detail goes to the log, where the owner can act on it by
  // releasing the address from the other project.
  const claimed = await prisma.domain.findFirst({
    where: { domainName: domain, NOT: { projectId: project.id } },
    select: { project: { select: { id: true, businessName: true } } },
  });
  if (claimed) {
    console.warn(
      `[domain] ${domain} requested for "${project.businessName}" but is held by ` +
        `"${claimed.project.businessName}" (project ${claimed.project.id}). ` +
        `Release it from that project to free the address.`
    );
    return {
      ok: false,
      error:
        "We've already got that address set up on another site. Send us a message and we'll move it across for you.",
    };
  }

  // Attach before showing records. A certificate is only issued once the host
  // knows the name, so starting here means it is usually ready by the time DNS
  // has spread and the customer comes back to press check.
  const { blocked } = await attach(domain);
  if (blocked) return { ok: false, error: blocked };

  await prisma.domain.upsert({
    where: { projectId: project.id },
    create: { projectId: project.id, domainName: domain },
    update: { domainName: domain, verifiedAt: null, lastError: null },
  });

  touch(token, project.id);
  return { ok: true, message: `Saved ${domain}. Add the two rows below at your registrar, then press check.` };
}

/**
 * Is it connected yet?
 *
 * Re-attaches first. Attaching used to happen only when the address was first
 * saved, which made it a single point of failure with no way back: if it
 * failed, pressing check afterwards only ever re-checked a name the host had
 * never heard of.
 */
export async function checkDomain(token: string): Promise<DomainResult> {
  const found = await projectFor(token);
  if (found.error) return { ok: false, error: found.error };
  const { project } = found;

  const domain = project.domain?.domainName;
  if (!domain) return { ok: false, error: "Add your web address first." };

  const { blocked } = await attach(domain);
  if (blocked) {
    await prisma.domain.update({
      where: { projectId: project.id },
      data: { lastCheckedAt: new Date(), lastError: blocked },
    });
    touch(token, project.id);
    return { ok: false, error: blocked };
  }

  const serving = await checkServes(domain);

  if (!serving.ok) {
    // The host's own read of the DNS, when we can get it. It is the only
    // authority on whether it can serve the name, so it beats anything we can
    // infer from a resolver.
    const config = vercelConfigured() ? await getDomainConfig(domain) : null;
    const why = await explainFailure(
      domain,
      config?.ok ? config.data.misconfigured : null
    );
    await prisma.domain.update({
      where: { projectId: project.id },
      data: { lastCheckedAt: new Date(), lastError: why, verifiedAt: null },
    });
    touch(token, project.id);
    return { ok: false, error: why };
  }

  // Point the site at whichever name answers. The free address keeps working
  // either way, so there is nothing to undo if this is later disconnected.
  const liveUrl = serving.apexOk ? `https://${domain}` : `https://www.${domain}`;

  await prisma.domain.update({
    where: { projectId: project.id },
    data: { verifiedAt: new Date(), lastCheckedAt: new Date(), lastError: null },
  });
  await prisma.project.update({ where: { id: project.id }, data: { liveUrl } });

  touch(token, project.id);
  return { ok: true, message: serving.detail };
}

/**
 * Stop using a custom address.
 *
 * Deliberately does not detach the name from the host. The host keeps
 * account-level ownership of a detached name, so adding it back is refused as
 * a conflict and the domain ends up owned but unrouted -- a valid certificate
 * and a "deployment not found" page on every request. A customer who
 * disconnected and changed their mind could never recover. Leaving it attached
 * costs nothing, since nothing routes to it once this row is gone.
 */
export async function disconnectDomain(token: string): Promise<DomainResult> {
  const found = await projectFor(token);
  if (found.error) return { ok: false, error: found.error };
  const { project } = found;

  await prisma.domain.deleteMany({ where: { projectId: project.id } });

  if (project.preview) {
    await prisma.project.update({
      where: { id: project.id },
      data: { liveUrl: publishedSiteUrl(project.preview.slug) },
    });
  }

  touch(token, project.id);
  return { ok: true, message: "Disconnected. Your site is back on its free address." };
}
