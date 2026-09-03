"use server";

import { revalidatePath } from "next/cache";
import { ProjectStatus, DnsStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  normalizeDomain,
  deployHost,
  requiredRecords,
  checkDomainPointsToUs,
  checkDomainServes,
} from "@/lib/domain";
import { attachClientDomain, vercelConfigured } from "@/lib/vercel";
import { publishedSiteUrl } from "@/lib/host";
import { notifyProjectStatus } from "@/lib/email";

/**
 * The last stretch of the client's journey: picking the address people will
 * type to reach them, then proving it works before the project flips to Live.
 *
 * As with the rest of the portal, the token in the URL is the credential and
 * the project is always looked up by it — never by an id from the form.
 */

export type DomainResult = { ok: boolean; message?: string; error?: string };

/** Domain setup is only meaningful once the client has signed off. */
const SETUP_STAGES: ProjectStatus[] = [
  ProjectStatus.APPROVED,
  ProjectStatus.DEPLOYING,
  ProjectStatus.LIVE,
  ProjectStatus.MAINTENANCE,
];

async function projectForSetup(token: string) {
  const project = await prisma.project.findUnique({
    where: { portalToken: token },
    include: { domain: true, preview: true },
  });
  if (!project) return { error: "We couldn't find that project." as const };
  if (!SETUP_STAGES.includes(project.status)) {
    return { error: "Your site isn't ready to publish yet." as const };
  }
  return { project };
}

function touch(token: string, projectId: string) {
  revalidatePath(`/portal/${token}`);
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath("/admin/projects");
}

/** Save the domain the client owns (or has just bought) and show the records. */
export async function saveCustomDomain(token: string, formData: FormData): Promise<DomainResult> {
  const found = await projectForSetup(token);
  if (found.error) return { ok: false, error: found.error };
  const { project } = found;

  const domain = normalizeDomain(String(formData.get("domain") ?? ""));
  if (!domain) {
    return { ok: false, error: "That doesn't look like a web address. Try something like mybusiness.com." };
  }

  const taken = await prisma.domain.findFirst({
    where: { domainName: domain, NOT: { projectId: project.id } },
    select: { id: true },
  });
  if (taken) {
    return { ok: false, error: "That domain is already set up on another project. Get in touch and we'll sort it out." };
  }

  const host = deployHost();
  const records = host ? requiredRecords(domain, host) : undefined;

  await prisma.domain.upsert({
    where: { projectId: project.id },
    create: {
      projectId: project.id,
      domainName: domain,
      dnsStatus: DnsStatus.INSTRUCTIONS_SENT,
      requiredDnsRecords: records,
    },
    update: {
      domainName: domain,
      dnsStatus: DnsStatus.INSTRUCTIONS_SENT,
      requiredDnsRecords: records ?? undefined,
    },
  });

  // Attach it to the host now rather than at verify time. Certificate
  // issuance only begins once the host knows about the domain, so starting it
  // here means the certificate is usually ready by the time DNS has spread and
  // the client comes back to press verify.
  if (vercelConfigured()) {
    const attached = await attachClientDomain(domain);
    if (!attached.ok) {
      console.error("[domain] could not attach to host", domain, attached.detail);
    }
  } else {
    console.warn(
      `[domain] VERCEL_TOKEN not configured — ${domain} must be added to the Vercel project by hand or it will not serve.`
    );
  }

  // Only pull a live site backwards if it isn't live yet; a client adding a
  // domain to an already-published site shouldn't take that site down.
  if (project.status === ProjectStatus.APPROVED) {
    await prisma.project.update({
      where: { id: project.id },
      data: { status: ProjectStatus.DEPLOYING },
    });
  }

  touch(token, project.id);
  return { ok: true, message: `Saved ${domain}. Next, add the records below at your registrar.` };
}

/** Go live now on the free address, leaving a custom domain for later. */
export async function claimFreeAddress(token: string): Promise<DomainResult> {
  const found = await projectForSetup(token);
  if (found.error) return { ok: false, error: found.error };
  const { project } = found;

  if (!project.preview) {
    return { ok: false, error: "We couldn't find your site. Get in touch and we'll sort it out." };
  }

  await prisma.project.update({
    where: { id: project.id },
    data: {
      status: ProjectStatus.LIVE,
      liveUrl: publishedSiteUrl(project.preview.slug),
    },
  });

  await notifyProjectStatus(project.id, ProjectStatus.LIVE);

  touch(token, project.id);
  return {
    ok: true,
    message: "Your site is live. You can add your own web address whenever you're ready.",
  };
}

/**
 * Check the client's DNS for real and publish if it's pointing at us.
 *
 * When hosting isn't configured yet there is nothing truthful to check
 * against, so we record that they're done and leave the last step to a human
 * rather than pretending to verify something.
 */
export async function verifyDomain(token: string): Promise<DomainResult> {
  const found = await projectForSetup(token);
  if (found.error) return { ok: false, error: found.error };
  const { project } = found;

  const domain = project.domain?.domainName;
  if (!domain) return { ok: false, error: "Add your web address first." };

  const host = deployHost();
  if (!host) {
    await prisma.domain.update({
      where: { projectId: project.id },
      data: { dnsStatus: DnsStatus.PENDING },
    });
    touch(token, project.id);
    return {
      ok: true,
      message:
        "Thanks — we've noted that. We'll check the records on our side and email you as soon as your site is live.",
    };
  }

  const check = await checkDomainPointsToUs(domain, host);
  if (!check.ok) {
    await prisma.domain.update({
      where: { projectId: project.id },
      data: { dnsStatus: DnsStatus.PENDING },
    });
    touch(token, project.id);
    return { ok: false, error: check.detail };
  }

  // DNS being right is not the same as the site working. Fetch the address the
  // way a customer would before promising anything: if the certificate is not
  // issued yet the handshake fails, and publishing at that point would hand the
  // client an address that shows a security warning.
  const serving = await checkDomainServes(domain);
  if (!serving.ok) {
    await prisma.domain.update({
      where: { projectId: project.id },
      data: { dnsStatus: DnsStatus.VERIFIED, sslStatus: "PENDING" },
    });

    // A domain that never attached will never come good on its own, so make
    // sure that lands somewhere the owner will see it.
    if (!vercelConfigured()) {
      console.error(
        `[domain] ${domain} points at us but is not attached to the host, and automation is off. Add it in Vercel.`
      );
    }

    touch(token, project.id);
    return { ok: false, error: serving.detail };
  }

  await prisma.domain.update({
    where: { projectId: project.id },
    data: {
      dnsStatus: DnsStatus.VERIFIED,
      sslStatus: "ACTIVE",
      deploymentStatus: "LIVE",
    },
  });
  await prisma.project.update({
    where: { id: project.id },
    data: { status: ProjectStatus.LIVE, liveUrl: `https://${domain}` },
  });

  await notifyProjectStatus(project.id, ProjectStatus.LIVE);

  touch(token, project.id);
  return { ok: true, message: `${domain} is working — your site is live.` };
}

/** Let the client correct a typo or change their mind about the address. */
export async function clearCustomDomain(token: string): Promise<DomainResult> {
  const found = await projectForSetup(token);
  if (found.error) return { ok: false, error: found.error };
  const { project } = found;

  await prisma.domain.deleteMany({ where: { projectId: project.id } });
  if (project.status === ProjectStatus.DEPLOYING) {
    await prisma.project.update({
      where: { id: project.id },
      data: { status: ProjectStatus.APPROVED },
    });
  }

  touch(token, project.id);
  return { ok: true, message: "Cleared. Enter the address you'd like to use." };
}
