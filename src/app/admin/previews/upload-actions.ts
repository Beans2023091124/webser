"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storeUpload, deleteUpload, isOwnUpload, StorageUnavailableError } from "@/lib/storage";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB

const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
};

export type UploadResult = { ok: boolean; urls?: string[]; error?: string };

/** Key prefix every file for this preview is stored under. */
function keyPrefix(previewId: string) {
  return `${previewId}/`;
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
}

/**
 * Accepts customer-supplied photos for a preview.
 *
 * The stored filename is always randomly generated and the extension comes
 * from an allow-list keyed on MIME type — the client's filename is never used
 * to build a path, so there's nothing to traverse with.
 */
export async function uploadPreviewImages(previewId: string, formData: FormData): Promise<UploadResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "You need to be signed in." };
  }

  const preview = await prisma.preview.findUnique({
    where: { id: previewId },
    select: { id: true, slug: true, gallery: true },
  });
  if (!preview) return { ok: false, error: "That preview no longer exists." };

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { ok: false, error: "No files selected." };
  if (files.length > 12) return { ok: false, error: "Please upload 12 images or fewer at a time." };

  const urls: string[] = [];
  for (const file of files) {
    const ext = ALLOWED[file.type];
    if (!ext) {
      return { ok: false, error: `"${file.name}" isn't a supported image (JPG, PNG, WebP, AVIF, or GIF).` };
    }
    if (file.size > MAX_BYTES) {
      return { ok: false, error: `"${file.name}" is larger than 8MB.` };
    }

    const name = `${Date.now().toString(36)}-${randomBytes(5).toString("hex")}.${ext}`;
    try {
      urls.push(await storeUpload(`${keyPrefix(previewId)}${name}`, file));
    } catch (e) {
      // A storage problem is a message, not a crashed page.
      console.error("[upload] preview upload failed", e);
      if (e instanceof StorageUnavailableError) return { ok: false, error: e.message };
      return {
        ok: false,
        error: e instanceof Error ? `Upload failed: ${e.message}` : "Upload failed.",
      };
    }
  }

  revalidatePath(`/admin/previews/${previewId}`);
  revalidatePath(`/p/${preview.slug}`);
  return { ok: true, urls };
}

/** Appends uploads straight into the gallery so one click both stores and uses them. */
export async function uploadToGallery(previewId: string, formData: FormData): Promise<UploadResult> {
  const res = await uploadPreviewImages(previewId, formData);
  if (!res.ok || !res.urls) return res;

  const preview = await prisma.preview.findUnique({ where: { id: previewId }, select: { gallery: true, slug: true } });
  const existing = ((preview?.gallery as string[] | null) ?? []).filter(Boolean);

  await prisma.preview.update({
    where: { id: previewId },
    data: { gallery: [...existing, ...res.urls] },
  });

  revalidatePath(`/admin/previews/${previewId}`);
  if (preview?.slug) revalidatePath(`/p/${preview.slug}`);
  return res;
}

export async function uploadLogo(previewId: string, formData: FormData): Promise<UploadResult> {
  const res = await uploadPreviewImages(previewId, formData);
  if (!res.ok || !res.urls?.[0]) return res;

  const preview = await prisma.preview.update({
    where: { id: previewId },
    data: { logoUrl: res.urls[0] },
    select: { slug: true },
  });

  revalidatePath(`/admin/previews/${previewId}`);
  revalidatePath(`/p/${preview.slug}`);
  return res;
}

export async function uploadFavicon(previewId: string, formData: FormData): Promise<UploadResult> {
  const res = await uploadPreviewImages(previewId, formData);
  if (!res.ok || !res.urls?.[0]) return res;

  const preview = await prisma.preview.update({
    where: { id: previewId },
    data: { faviconUrl: res.urls[0] },
    select: { slug: true },
  });

  revalidatePath(`/admin/previews/${previewId}`);
  revalidatePath(`/p/${preview.slug}`);
  return res;
}

/** Clears one of the single-image slots without touching the gallery. */
export async function clearImageField(
  previewId: string,
  field: "logoUrl" | "faviconUrl" | "heroImageUrl"
): Promise<UploadResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "You need to be signed in." };
  }

  const current = await prisma.preview.findUnique({
    where: { id: previewId },
    select: { slug: true, logoUrl: true, faviconUrl: true, heroImageUrl: true },
  });
  if (!current) return { ok: false, error: "That preview no longer exists." };

  const url = current[field];
  const preview = await prisma.preview.update({
    where: { id: previewId },
    data: { [field]: null },
    select: { slug: true },
  });

  // Only delete files we actually stored for this preview.
  if (url && isOwnUpload(url, keyPrefix(previewId))) await deleteUpload(url);

  revalidatePath(`/admin/previews/${previewId}`);
  revalidatePath(`/p/${preview.slug}`);
  return { ok: true };
}

export async function uploadHeroImage(previewId: string, formData: FormData): Promise<UploadResult> {
  const res = await uploadPreviewImages(previewId, formData);
  if (!res.ok || !res.urls?.[0]) return res;

  const preview = await prisma.preview.update({
    where: { id: previewId },
    data: { heroImageUrl: res.urls[0] },
    select: { slug: true },
  });

  revalidatePath(`/admin/previews/${previewId}`);
  revalidatePath(`/p/${preview.slug}`);
  return res;
}

/**
 * Removes an image from the gallery, and deletes the file too when it's one
 * we uploaded. Template stock photos are shared across previews, so those are
 * only removed from this gallery — never deleted from storage.
 */
export async function removeGalleryImage(previewId: string, url: string): Promise<UploadResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "You need to be signed in." };
  }

  const preview = await prisma.preview.findUnique({
    where: { id: previewId },
    select: { gallery: true, slug: true },
  });
  if (!preview) return { ok: false, error: "That preview no longer exists." };

  const remaining = ((preview.gallery as string[] | null) ?? []).filter((u) => u !== url);
  await prisma.preview.update({ where: { id: previewId }, data: { gallery: remaining } });

  if (isOwnUpload(url, keyPrefix(previewId))) await deleteUpload(url);

  revalidatePath(`/admin/previews/${previewId}`);
  revalidatePath(`/p/${preview.slug}`);
  return { ok: true, urls: remaining };
}
