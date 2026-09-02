"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { packageSchema, parseFeatures } from "@/lib/validations/package";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  return session.user;
}

export async function createPackage(formData: FormData) {
  await requireAdmin();

  const raw = Object.fromEntries(formData.entries());
  const parsed = packageSchema.parse(raw);

  await prisma.package.create({
    data: {
      name: parsed.name,
      description: parsed.description || null,
      price: parsed.price,
      monthlyPrice: parsed.monthlyPrice,
      features: parseFeatures(raw.featuresText as string),
      sortOrder: parsed.sortOrder ?? 0,
      isActive: parsed.isActive === "on",
    },
  });

  revalidatePath("/admin/pricing");
}

export async function updatePackage(packageId: string, formData: FormData) {
  await requireAdmin();

  const raw = Object.fromEntries(formData.entries());
  const parsed = packageSchema.parse(raw);

  await prisma.package.update({
    where: { id: packageId },
    data: {
      name: parsed.name,
      description: parsed.description || null,
      price: parsed.price,
      monthlyPrice: parsed.monthlyPrice,
      features: parseFeatures(raw.featuresText as string),
      sortOrder: parsed.sortOrder ?? 0,
      isActive: parsed.isActive === "on",
    },
  });

  revalidatePath("/admin/pricing");
}

export async function deletePackage(packageId: string) {
  await requireAdmin();
  await prisma.package.delete({ where: { id: packageId } });
  revalidatePath("/admin/pricing");
}

export async function togglePackageActive(packageId: string, isActive: boolean) {
  await requireAdmin();
  await prisma.package.update({ where: { id: packageId }, data: { isActive } });
  revalidatePath("/admin/pricing");
}
