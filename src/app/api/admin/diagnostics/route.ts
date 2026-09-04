import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { storeUpload, deleteUpload, blobConfigured } from "@/lib/storage";
import { emailConfigured } from "@/lib/email";
import {
  vercelConfigured,
  getProjectDomain,
  getDomainConfig,
  provisionDomain,
} from "@/lib/vercel";
import { checkServes, explainFailure, normalizeDomain } from "@/lib/domain";

/**
 * Admin-only "why isn't this working" endpoint.
 *
 * Visit /api/admin/diagnostics while signed in. It reports which integrations
 * the running deployment can actually see and performs a real storage write,
 * returning the underlying error verbatim — the thing user-facing messages
 * deliberately hide and server logs make tedious to retrieve.
 *
 * Only presence of secrets is reported, never their values.
 */

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const env = {
    BLOB_READ_WRITE_TOKEN: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    BLOB_STORE_ID: Boolean(process.env.BLOB_STORE_ID),
    VERCEL_OIDC_TOKEN: Boolean(process.env.VERCEL_OIDC_TOKEN),
    RESEND_API_KEY: Boolean(process.env.RESEND_API_KEY),
    EMAIL_FROM: process.env.EMAIL_FROM ?? null,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? null,
    WEBSER_DEPLOY_HOST: process.env.WEBSER_DEPLOY_HOST ?? null,
    runningOnVercel: Boolean(process.env.VERCEL),
  };

  let storage: Record<string, unknown>;
  try {
    const file = new File([new Uint8Array([137, 80, 78, 71])], "diag.png", { type: "image/png" });
    const url = await storeUpload(`diagnostics/${Date.now()}.png`, file);
    await deleteUpload(url);
    storage = { ok: true, mode: blobConfigured() ? "blob" : "local", url };
  } catch (e) {
    storage = {
      ok: false,
      mode: blobConfigured() ? "blob" : "local",
      name: e instanceof Error ? e.name : typeof e,
      message: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack?.split("\n").slice(0, 5) : null,
    };
  }

  // /api/admin/diagnostics?domain=clientsite.com reports everything that has
  // to line up for a custom domain to work, in one place. Without this the
  // only signal is a 404 on port 80, which looks identical to bad DNS.
  const params = new URL(req.url).searchParams;
  const asked = normalizeDomain(params.get("domain") ?? "");
  const attach = params.get("attach") === "1";
  let domain: Record<string, unknown> | undefined;

  if (asked) {

    // ?attach=1 re-runs the attach for both names and reports the raw result.
    // A domain can end up owned by the account but attached to no project --
    // valid certificate, DEPLOYMENT_NOT_FOUND on every request -- and this is
    // how to put it back without guessing from the outside.
    const attached = attach
      ? {
          apex: await provisionDomain(asked),
          www: await provisionDomain(`www.${asked}`),
        }
      : undefined;
    const [apexAttached, wwwAttached, config, serves] = await Promise.all([
      vercelConfigured() ? getProjectDomain(asked) : Promise.resolve(null),
      vercelConfigured() ? getProjectDomain(`www.${asked}`) : Promise.resolve(null),
      vercelConfigured() ? getDomainConfig(asked) : Promise.resolve(null),
      checkServes(asked),
    ]);
    const why = serves.ok ? null : await explainFailure(asked);

    const summarise = (r: Awaited<ReturnType<typeof getProjectDomain>> | null) =>
      r === null
        ? "automation off"
        : r.ok
        ? { attached: true, verified: r.data.verified, challenges: r.data.verification ?? [] }
        : { attached: false, status: r.status, code: r.code, detail: r.detail };

    // Which project holds this address in our own database, if any. An address
    // stuck on an abandoned project is the most common reason a client cannot
    // connect one, and it is invisible from outside.
    const heldBy = await prisma.domain.findFirst({
      where: { domainName: asked },
      select: { verifiedAt: true, lastError: true, project: { select: { id: true, businessName: true, status: true } } },
    });

    domain = {
      name: asked,
      heldBy: heldBy
        ? {
            project: heldBy.project.businessName,
            projectId: heldBy.project.id,
            status: heldBy.project.status,
            verified: Boolean(heldBy.verifiedAt),
            lastError: heldBy.lastError,
          }
        : null,
      ...(attached ? { attachAttempt: attached } : {}),
      apex: summarise(apexAttached),
      www: summarise(wwwAttached),
      vercelConfig:
        config === null
          ? "automation off"
          : config.ok
          ? config.data
          : { error: config.code, detail: config.detail },
      serving: { apexOk: serves.apexOk, wwwOk: serves.wwwOk, connected: serves.ok },
      ...(why ? { whyNot: why } : {}),
    };
  }

  return NextResponse.json({
    env: { ...env, domainAutomation: vercelConfigured() },
    ...(domain ? { domain } : {}),
    storage,
    email: {
      configured: emailConfigured(),
      note: emailConfigured()
        ? "Sends will be attempted. A FAILED EmailLog row means Resend rejected it."
        : "RESEND_API_KEY and/or EMAIL_FROM are missing here, so every send is logged QUEUED and nothing is sent.",
    },
  });
}
