import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { put, del } from "@vercel/blob";

/**
 * Where uploaded files live.
 *
 * Vercel's filesystem is read-only at runtime, so writing into public/ works
 * on a laptop and throws EROFS the moment it's deployed. This routes uploads
 * to Vercel Blob when a token is present and falls back to the local disk
 * when it isn't, so development needs no setup and production doesn't break.
 *
 * Callers pass a key like "previews/<id>/<file>.jpg" and get back a URL to
 * store — absolute for Blob, root-relative for the local fallback. Both are
 * usable directly in <img src>.
 */

const BLOB_HOST_SUFFIX = ".blob.vercel-storage.com";

export function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

/** Human-readable note for the admin UI when uploads would be lost. */
export function storageMode(): "blob" | "local" {
  return blobConfigured() ? "blob" : "local";
}

export async function storeUpload(key: string, file: File): Promise<string> {
  if (blobConfigured()) {
    const { url } = await put(key, file, {
      access: "public",
      // The key already carries a random component; a second suffix would
      // make the stored name unpredictable for the delete path.
      addRandomSuffix: false,
      contentType: file.type || undefined,
    });
    return url;
  }

  const full = path.join(process.cwd(), "public", "uploads", key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, Buffer.from(await file.arrayBuffer()));
  return `/uploads/${key}`;
}

/**
 * True when this URL is a file we stored under the given key prefix.
 *
 * Used before deleting, so a shared template stock photo referenced by many
 * previews is never removed just because one preview dropped it.
 */
export function isOwnUpload(url: string, keyPrefix: string): boolean {
  if (url.startsWith(`/uploads/${keyPrefix}`)) return true;
  try {
    const u = new URL(url);
    return (
      u.hostname.endsWith(BLOB_HOST_SUFFIX) &&
      decodeURIComponent(u.pathname).slice(1).startsWith(keyPrefix)
    );
  } catch {
    return false;
  }
}

/** Best-effort delete. A failure here should never break the calling action. */
export async function deleteUpload(url: string): Promise<void> {
  try {
    if (url.startsWith("/uploads/")) {
      const rel = url.slice("/uploads/".length);
      if (rel.includes("..")) return;
      await unlink(path.join(process.cwd(), "public", "uploads", rel));
      return;
    }
    const u = new URL(url);
    if (u.hostname.endsWith(BLOB_HOST_SUFFIX) && blobConfigured()) {
      await del(url);
    }
  } catch {
    // Already gone, or storage is unreachable — not worth failing the request.
  }
}
