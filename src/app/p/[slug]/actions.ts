"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { notifyNewLead } from "@/lib/email";

const leadSchema = z.object({
  previewId: z.string().min(1),
  name: z.string().trim().min(1, "Please enter your name").max(150),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().max(200).optional().or(z.literal("")),
  service: z.string().trim().max(150).optional().or(z.literal("")),
  message: z.string().trim().max(3000).optional().or(z.literal("")),
});

export type LeadResult = { ok: boolean; error?: string };

/**
 * Crude in-memory throttle, keyed per preview.
 *
 * This endpoint is public, writes a row and sends mail on every call, so
 * without a limit one script can fill the database and burn the mail quota.
 * A serverless instance holds this map only for its own lifetime, so it is a
 * speed bump rather than a guarantee -- but it costs nothing and stops the
 * obvious case. Swap in a shared store if this ever needs to be strict.
 */
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5;
const recent = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const hits = (recent.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  hits.push(now);
  recent.set(key, hits);

  // Keep the map from growing without bound on a long-lived instance.
  if (recent.size > 500) {
    for (const [k, v] of recent) {
      if (v.every((t) => now - t >= RATE_WINDOW_MS)) recent.delete(k);
    }
  }
  return hits.length > RATE_MAX;
}

/**
 * Public endpoint — no auth. Called from the live preview site's quote form.
 * Deliberately permissive about phone vs. email so a real customer isn't
 * blocked by validation, but requires at least one way to reach them back.
 */
export async function submitLead(_prev: LeadResult | null, formData: FormData): Promise<LeadResult> {
  const parsed = leadSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const { previewId, name, phone, email, service, message } = parsed.data;

  if (!phone && !email) {
    return { ok: false, error: "Please leave a phone number or an email so we can reach you." };
  }

  const preview = await prisma.preview.findUnique({
    where: { id: previewId },
    select: { id: true, status: true, isDemo: true },
  });
  if (!preview || preview.status === "DISABLED") {
    return { ok: false, error: "This form is no longer accepting submissions." };
  }

  // The example sites are demonstrations, and the marketing page promises
  // nobody's phone rings when you try the form. Someone trying one out may
  // well type their real name and number in, and there is no reason to keep a
  // stranger's details for a business that does not exist. Behave exactly like
  // a successful submission, store nothing.
  if (preview.isDemo) return { ok: true };

  if (rateLimited(preview.id)) {
    return { ok: false, error: "That's gone through already — give us a moment to reply." };
  }

  const lead = await prisma.previewLead.create({
    data: {
      previewId: preview.id,
      name,
      phone: phone || null,
      email: email || null,
      service: service || null,
      message: message || null,
    },
  });

  // Forward it to the business. The enquiry is already saved, so a mail
  // failure must not tell the customer their message didn't go through.
  try {
    await notifyNewLead(lead.id);
  } catch {
    // Logged in EmailLog by sendEmail; nothing useful to do here.
  }

  return { ok: true };
}
