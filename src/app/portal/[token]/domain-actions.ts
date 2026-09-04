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
import {
  provisionDomain,
  getDomainConfig,
  verifyProjectDomain,
  removeProjectDomain,
  vercelConfigured,
  type VerificationChallenge,
} from "@/lib/vercel";
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

  // Attach both names to the host before showing any records. Certificate
  // issuance only starts once Vercel knows about the domain, so doing it here
  // rather than at verify time means the certificate is usually ready by the
  // time DNS has spread and the client comes back to press check.
  let challenges: VerificationChallenge[] = [];
  let recommendedIPv4: string[] = [];
  let recommendedCNAME: string[] = [];
  let blocked: string | null = null;

  if (vercelConfigured()) {
    const [apex, www] = await Promise.all([
      provisionDomain(domain),
      provisionDomain(`www.${domain}`),
    ]);

    if (apex.takenElsewhere) blocked = apex.detail;
    challenges = [...apex.challenges, ...www.challenges];

    if (!apex.attached) {
      console.error("[domain] could not attach", domain, apex.detail);
    }

    // Vercel's own view of what this domain needs. Preferred over our
    // defaults because it comes from the platform that will serve it.
    const config = await getDomainConfig(domain);
    if (config.ok) {
      recommendedIPv4 = config.data.recommendedIPv4;
      recommendedCNAME = config.data.recommendedCNAME;
    }
  } else {
    console.warn(
      `[domain] VERCEL_TOKEN not configured - ${domain} must be added to the Vercel project by hand or it will not serve.`
    );
  }

  if (blocked) return { ok: false, error: blocked };

  const records = host
    ? requiredRecords(domain, host, { recommendedIPv4, recommendedCNAME, challenges })
    : undefined;

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

  // Re-attach before checking anything.
  //
  // Attaching used to happen only when the domain was first saved, which made
  // it a single point of failure with no way back: if it failed, or the name
  // was later detached, pressing check forever afterwards only ever verified a
  // domain the host had never heard of. The symptom is a plain 404 on port 80
  // and a failed TLS handshake on 443 -- indistinguishable, from the client's
  // side, from "the records are wrong".
  //
  // Both calls are idempotent, so this is safe to run on every check and makes
  // the button self-healing.
  if (vercelConfigured()) {
    const [apexAttach, wwwAttach] = await Promise.all([
      provisionDomain(domain),
      provisionDomain(`www.${domain}`),
    ]);

    if (apexAttach.takenElsewhere) {
      await prisma.domain.update({
        where: { projectId: project.id },
        data: { dnsStatus: DnsStatus.ERROR },
      });
      touch(token, project.id);
      return { ok: false, error: apexAttach.detail };
    }

    if (!apexAttach.attached) {
      console.error("[domain] apex not attached", domain, apexAttach.detail);
    }
    if (!wwwAttach.attached) {
      console.error("[domain] www not attached", domain, wwwAttach.detail);
    }

    // Then nudge Vercel to re-check any ownership challenge the client has
    // added since. Harmless when there never was one, and it is what turns
    // verified:false into verified:true after they paste the TXT record in.
    await Promise.all([
      verifyProjectDomain(domain),
      verifyProjectDomain(`www.${domain}`),
    ]);

    // If a challenge is still outstanding, that is the real blocker and it
    // needs saying, because no amount of waiting will fix it on its own.
    const outstanding = [...apexAttach.challenges, ...wwwAttach.challenges];
    if (apexAttach.needsVerification && outstanding.length > 0) {
      const records = requiredRecords(domain, host, { challenges: outstanding });
      await prisma.domain.update({
        where: { projectId: project.id },
        data: { dnsStatus: DnsStatus.PENDING, requiredDnsRecords: records },
      });
      touch(token, project.id);
      return {
        ok: false,
        error:
          "One more record is needed to prove the domain is yours — it has been added to the list below.",
      };
    }
  }

  // Whether the address actually serves the site is the thing that matters, so
  // it is checked first and treated as the answer. DNS lookups are only a
  // proxy for it, and a flaky one: our host answers on a rotating pool of
  // anycast addresses, so comparing resolved IPs can disagree with itself
  // between two runs a minute apart. If the site loads, it works.
  const serving = await checkDomainServes(domain);

  if (!serving.ok) {
    // Not serving. Work out why, most specific explanation first.
    let reason: string | null = null;

    if (vercelConfigured()) {
      const config = await getDomainConfig(domain);
      if (config.ok && config.data.misconfigured) {
        reason =
          `${domain} isn't pointing at us yet. Check the records below match exactly ` +
          `at your registrar — they can take a little while to spread.`;
      }
    }

    if (!reason) {
      const dns = await checkDomainPointsToUs(domain, host);
      reason = dns.ok ? serving.detail : dns.detail;
    }

    await prisma.domain.update({
      where: { projectId: project.id },
      data: { dnsStatus: DnsStatus.PENDING, sslStatus: "PENDING" },
    });

    // A domain that never attached will never come good on its own, so make
    // sure that lands somewhere the owner will see it.
    if (!vercelConfigured()) {
      console.error(
        `[domain] ${domain} is not attached to the host and automation is off. Add it in Vercel.`
      );
    }

    touch(token, project.id);
    return { ok: false, error: reason };
  }

  // Publish at whichever address actually answers. A site reachable only on
  // www is still a live site, and the client can add the root record later.
  const liveUrl = serving.apexOk ? `https://${domain}` : `https://www.${domain}`;

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
    data: { status: ProjectStatus.LIVE, liveUrl },
  });

  await notifyProjectStatus(project.id, ProjectStatus.LIVE);

  touch(token, project.id);
  return { ok: true, message: serving.detail };
}

/** Let the client correct a typo or change their mind about the address. */
export async function clearCustomDomain(token: string): Promise<DomainResult> {
  const found = await projectForSetup(token);
  if (found.error) return { ok: false, error: found.error };
  const { project } = found;

  // Detach from the host too, or the old name sits on the project forever and
  // cannot be added anywhere else -- including by this client on a second try.
  const previous = project.domain?.domainName;
  if (previous && vercelConfigured()) {
    await Promise.all([
      removeProjectDomain(previous),
      removeProjectDomain(`www.${previous}`),
    ]);
  }

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
