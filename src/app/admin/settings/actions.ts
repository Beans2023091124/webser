"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

/**
 * Saves whichever settings the submitted form actually carried.
 *
 * The page has more than one form posting here, so a full overwrite would let
 * saving "Your details" silently blank the payment handles set in the card
 * below it. Only keys present in the FormData are written, which makes each
 * form independent without either needing to carry hidden copies of the
 * other's fields.
 *
 * A field that is present but empty is a deliberate clear, and becomes null.
 */
export async function updateSettings(formData: FormData) {
  await requireAdmin();

  const text = (key: string, max: number): string | null | undefined => {
    if (!formData.has(key)) return undefined;
    const v = formData.get(key);
    return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
  };

  const venmoHandle = text("venmoHandle", 60);
  const cashAppTag = text("cashAppTag", 60);
  const paymentNote = text("paymentNote", 1000);
  const contactPhone = text("contactPhone", 40);
  const contactEmail = text("contactEmail", 200);
  const ownerName = text("ownerName", 80);
  const businessName = text("businessName", 80);

  const update: Prisma.SettingsUpdateInput = {};
  // The two name columns are non-null with defaults, so a cleared field falls
  // back rather than writing null into them.
  if (ownerName !== undefined) update.ownerName = ownerName ?? "";
  if (businessName !== undefined) update.businessName = businessName ?? "Webser";
  if (contactPhone !== undefined) update.contactPhone = contactPhone;
  if (contactEmail !== undefined) update.contactEmail = contactEmail;
  if (venmoHandle !== undefined) update.venmoHandle = venmoHandle;
  if (cashAppTag !== undefined) update.cashAppTag = cashAppTag;
  if (paymentNote !== undefined) update.paymentNote = paymentNote;

  await prisma.settings.upsert({
    where: { id: "app" },
    update,
    create: {
      id: "app",
      ownerName: ownerName ?? "",
      businessName: businessName ?? "Webser",
      contactPhone: contactPhone ?? null,
      contactEmail: contactEmail ?? null,
      venmoHandle: venmoHandle ?? null,
      cashAppTag: cashAppTag ?? null,
      paymentNote: paymentNote ?? null,
    },
  });

  revalidatePath("/admin/settings");
  // Text templates sign off with the owner's name.
  revalidatePath("/admin/prospects", "layout");
  revalidatePath("/admin/projects", "layout");
  // The client portal shows the payment handles on its payment step.
  revalidatePath("/portal", "layout");
}
