"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { prospectSchema, activitySchema } from "@/lib/validations/prospect";
import { ProspectStatus } from "@prisma/client";

function readSocials(formData: FormData) {
  const facebook = String(formData.get("facebook") ?? "");
  const instagram = String(formData.get("instagram") ?? "");
  const links: Record<string, string> = {};
  if (facebook) links.facebook = facebook;
  if (instagram) links.instagram = instagram;
  return Object.keys(links).length > 0 ? links : undefined;
}

export async function createProspect(formData: FormData) {
  const admin = await requireAdmin();

  const raw = Object.fromEntries(formData.entries());
  const parsed = prospectSchema.parse(raw);

  const prospect = await prisma.prospect.create({
    data: {
      businessName: parsed.businessName,
      category: parsed.category || null,
      contactName: parsed.contactName || null,
      phone: parsed.phone || null,
      email: parsed.email || null,
      address: parsed.address || null,
      city: parsed.city || null,
      state: parsed.state || null,
      zip: parsed.zip || null,
      currentWebsite: parsed.currentWebsite || null,
      gmbUrl: parsed.gmbUrl || null,
      socialLinks: readSocials(formData),
      notes: parsed.notes || null,
      status: parsed.status,
      estimatedPrice: parsed.estimatedPrice ?? null,
      followUpDate: parsed.followUpDate ? new Date(parsed.followUpDate) : null,
      source: parsed.source || null,
    },
  });

  await prisma.activity.create({
    data: {
      prospectId: prospect.id,
      type: "SYSTEM",
      description: "Prospect added to pipeline.",
      createdById: admin.id,
    },
  });

  revalidatePath("/admin/prospects");
  revalidatePath("/admin/dashboard");
  redirect(`/admin/prospects/${prospect.id}`);
}

export async function updateProspect(prospectId: string, formData: FormData) {
  const admin = await requireAdmin();

  const raw = Object.fromEntries(formData.entries());
  const parsed = prospectSchema.parse(raw);

  const before = await prisma.prospect.findUniqueOrThrow({ where: { id: prospectId } });

  const prospect = await prisma.prospect.update({
    where: { id: prospectId },
    data: {
      businessName: parsed.businessName,
      category: parsed.category || null,
      contactName: parsed.contactName || null,
      phone: parsed.phone || null,
      email: parsed.email || null,
      address: parsed.address || null,
      city: parsed.city || null,
      state: parsed.state || null,
      zip: parsed.zip || null,
      currentWebsite: parsed.currentWebsite || null,
      gmbUrl: parsed.gmbUrl || null,
      socialLinks: readSocials(formData),
      notes: parsed.notes || null,
      status: parsed.status,
      estimatedPrice: parsed.estimatedPrice ?? null,
      followUpDate: parsed.followUpDate ? new Date(parsed.followUpDate) : null,
      source: parsed.source || null,
      dateContacted:
        before.status === "NEW" && parsed.status !== "NEW" && !before.dateContacted
          ? new Date()
          : before.dateContacted,
    },
  });

  if (before.status !== parsed.status) {
    await prisma.activity.create({
      data: {
        prospectId,
        type: "STATUS_CHANGE",
        description: `Status changed from "${before.status}" to "${parsed.status}".`,
        createdById: admin.id,
      },
    });
  }

  revalidatePath("/admin/prospects");
  revalidatePath(`/admin/prospects/${prospectId}`);
  revalidatePath("/admin/dashboard");

  return prospect;
}

export async function deleteProspect(prospectId: string) {
  await requireAdmin();
  await prisma.prospect.delete({ where: { id: prospectId } });
  revalidatePath("/admin/prospects");
  revalidatePath("/admin/dashboard");
  redirect("/admin/prospects");
}

export async function logActivity(formData: FormData) {
  const admin = await requireAdmin();

  const raw = Object.fromEntries(formData.entries());
  const parsed = activitySchema.parse(raw);

  await prisma.activity.create({
    data: {
      prospectId: parsed.prospectId,
      type: parsed.type,
      description: parsed.description,
      outcome: parsed.outcome || null,
      createdById: admin.id,
    },
  });

  // Calling/emailing counts as contact — auto-advance out of NEW.
  const prospect = await prisma.prospect.findUnique({ where: { id: parsed.prospectId } });
  if (prospect && prospect.status === "NEW" && (parsed.type === "CALL" || parsed.type === "EMAIL")) {
    await prisma.prospect.update({
      where: { id: parsed.prospectId },
      data: { status: ProspectStatus.CONTACTED, dateContacted: new Date() },
    });
  }

  revalidatePath(`/admin/prospects/${parsed.prospectId}`);
  revalidatePath("/admin/dashboard");
}
