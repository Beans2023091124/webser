"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";

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

  const preview = await prisma.preview.findUnique({ where: { id: previewId }, select: { id: true, status: true } });
  if (!preview || preview.status === "DISABLED") {
    return { ok: false, error: "This form is no longer accepting submissions." };
  }

  await prisma.previewLead.create({
    data: {
      previewId: preview.id,
      name,
      phone: phone || null,
      email: email || null,
      service: service || null,
      message: message || null,
    },
  });

  return { ok: true };
}
