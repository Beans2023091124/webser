"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
}

export async function updateSettings(formData: FormData) {
  await requireAdmin();

  const str = (k: string, max: number) => {
    const v = formData.get(k);
    return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
  };

  await prisma.settings.upsert({
    where: { id: "app" },
    update: {
      ownerName: str("ownerName", 80) ?? "",
      businessName: str("businessName", 80) ?? "Webser",
      contactPhone: str("contactPhone", 40),
      contactEmail: str("contactEmail", 200),
    },
    create: {
      id: "app",
      ownerName: str("ownerName", 80) ?? "",
      businessName: str("businessName", 80) ?? "Webser",
      contactPhone: str("contactPhone", 40),
      contactEmail: str("contactEmail", 200),
    },
  });

  revalidatePath("/admin/settings");
  // Text templates sign off with the owner's name.
  revalidatePath("/admin/prospects", "layout");
  revalidatePath("/admin/projects", "layout");
}
