"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  return session.user;
}

export async function updateTemplate(templateId: string, formData: FormData) {
  await requireAdmin();

  const description = String(formData.get("description") ?? "").trim();
  const isActive = formData.get("isActive") === "on";

  await prisma.template.update({
    where: { id: templateId },
    data: { description: description || null, isActive },
  });

  revalidatePath("/admin/templates");
  revalidatePath(`/admin/templates/${templateId}`);
}
