import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { storeUpload, deleteUpload, blobConfigured } from "@/lib/storage";
import { emailConfigured } from "@/lib/email";

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

export async function GET() {
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

  return NextResponse.json({
    env,
    storage,
    email: {
      configured: emailConfigured(),
      note: emailConfigured()
        ? "Sends will be attempted. A FAILED EmailLog row means Resend rejected it."
        : "RESEND_API_KEY and/or EMAIL_FROM are missing here, so every send is logged QUEUED and nothing is sent.",
    },
  });
}
