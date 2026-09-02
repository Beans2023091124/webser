"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, Trash2, ImagePlus, Loader2, Shapes, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  uploadToGallery,
  uploadHeroImage,
  uploadLogo,
  uploadFavicon,
  clearImageField,
  removeGalleryImage,
  addImageByUrl,
  type UploadResult,
} from "@/app/admin/previews/upload-actions";

type Slot = "hero" | "gallery" | "logo" | "favicon";

/**
 * Shrinks a favicon to 256px square in the browser before it's uploaded.
 *
 * People drop a 3000px logo in here and every browser tab then downloads it to
 * draw 16 pixels. Doing it client-side keeps the server dependency-free, and a
 * failure just falls back to the original file rather than blocking the upload.
 */
async function resizeForFavicon(file: File): Promise<File> {
  // SVG scales on its own, and ICO already holds small sizes.
  if (file.type === "image/svg+xml" || file.type.includes("icon")) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const size = 256;
    if (bitmap.width <= size && bitmap.height <= size) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    // Contain, centred, on transparency — never crop someone's mark.
    const scale = Math.min(size / bitmap.width, size / bitmap.height);
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, Math.round((size - w) / 2), Math.round((size - h) / 2), w, h);
    bitmap.close();

    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".png", { type: "image/png" });
  } catch {
    return file;
  }
}

function DropZone({
  label,
  hint,
  multiple,
  busy,
  onFiles,
}: {
  label: string;
  hint: string;
  multiple: boolean;
  busy: boolean;
  onFiles: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files?.length) onFiles(Array.from(e.dataTransfer.files));
      }}
      onClick={() => !busy && inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-7 text-center transition-colors ${
        dragging
          ? "border-brand-500 bg-brand-500/10"
          : "border-slate-700 bg-slate-950/40 hover:border-slate-600"
      } ${busy ? "pointer-events-none opacity-60" : ""}`}
    >
      {busy ? (
        <Loader2 className="h-5 w-5 animate-spin text-brand-400" />
      ) : (
        <Upload className="h-5 w-5 text-slate-500" />
      )}
      <p className="text-sm font-medium text-slate-200">{busy ? "Uploading…" : label}</p>
      <p className="text-xs text-slate-500">{hint}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        multiple={multiple}
        className="hidden"
        // The input sits inside the clickable div; without this its own click
        // bubbles back up and reopens the picker.
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          if (e.target.files?.length) onFiles(Array.from(e.target.files));
          e.target.value = "";
        }}
      />
    </div>
  );
}

/** Paste an address for an image hosted elsewhere. */
function UrlAdder({
  label,
  busy,
  onAdd,
}: {
  label: string;
  busy: boolean;
  onAdd: (url: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-500 underline underline-offset-2 hover:text-slate-300"
      >
        <Link2 className="h-3 w-3" />
        {label}
      </button>
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
      <input
        value={value}
        autoFocus
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) {
            e.preventDefault();
            onAdd(value.trim());
            setValue("");
            setOpen(false);
          }
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="https://example.com/photo.jpg"
        className="h-9 min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
      />
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={busy || !value.trim()}
          onClick={() => {
            onAdd(value.trim());
            setValue("");
            setOpen(false);
          }}
        >
          Add
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

/** A single-image slot: shows the current image with replace/remove, or a drop zone. */
function SingleSlot({
  label,
  hint,
  url,
  busy,
  disabled,
  checkered,
  onFiles,
  onClear,
}: {
  label: string;
  hint: string;
  url: string | null;
  busy: boolean;
  disabled: boolean;
  checkered?: boolean;
  onFiles: (f: File[]) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  if (!url) {
    return <DropZone label={label} hint={hint} multiple={false} busy={busy} onFiles={onFiles} />;
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
      <div
        className="flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-md"
        // A transparent logo needs a backdrop to be judged properly.
        style={
          checkered
            ? {
                backgroundImage:
                  "linear-gradient(45deg,#334155 25%,transparent 25%),linear-gradient(-45deg,#334155 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#334155 75%),linear-gradient(-45deg,transparent 75%,#334155 75%)",
                backgroundSize: "12px 12px",
                backgroundPosition: "0 0,0 6px,6px -6px,-6px 0",
                backgroundColor: "#1e293b",
              }
            : { backgroundColor: "#1e293b" }
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={label} className="max-h-16 max-w-16 object-contain" />
      </div>
      <div className="min-w-0 flex-1 basis-32">
        <p className="text-sm font-medium text-slate-200">{label}</p>
        <p className="truncate text-xs text-slate-500">{url.split("/").pop()}</p>
      </div>
      <div className="flex flex-none gap-1.5">
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => inputRef.current?.click()}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />} Replace
        </Button>
        <Button type="button" variant="ghost" size="icon" disabled={disabled} title="Remove" onClick={onClear}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/svg+xml,image/x-icon"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onFiles(Array.from(e.target.files));
          e.target.value = "";
        }}
      />
    </div>
  );
}

export function ImageManager({
  previewId,
  gallery,
  heroImageUrl,
  logoUrl,
  faviconUrl,
}: {
  previewId: string;
  gallery: string[];
  heroImageUrl: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState<Slot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);

  function send(kind: Slot, files: File[]) {
    setError(null);
    setBusy(kind);

    startTransition(async () => {
      // Favicons get shrunk in the browser first; everything else goes as-is.
      const prepared = kind === "favicon" ? await Promise.all(files.map(resizeForFavicon)) : files;

      const fd = new FormData();
      prepared.forEach((f) => fd.append("files", f));

      const action =
        kind === "hero"
          ? uploadHeroImage
          : kind === "logo"
          ? uploadLogo
          : kind === "favicon"
          ? uploadFavicon
          : uploadToGallery;

      const res: UploadResult = await action(previewId, fd);
      setBusy(null);
      if (!res.ok) setError(res.error ?? "Upload failed.");
      else router.refresh();
    });
  }

  function run(fn: () => Promise<UploadResult>, fallback: string) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? fallback);
      else router.refresh();
    });
  }

  const clearField = (field: "logoUrl" | "faviconUrl" | "heroImageUrl") =>
    run(() => clearImageField(previewId, field), "Could not remove that image.");

  const remove = (url: string) =>
    run(() => removeGalleryImage(previewId, url), "Could not remove that image.");

  const addUrl = (field: "gallery" | "heroImageUrl", url: string) =>
    run(() => addImageByUrl(previewId, field, url), "Could not add that image.");

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400 ring-1 ring-inset ring-red-500/30">
          {error}
        </p>
      )}

      {/* Brand marks */}
      <div className="space-y-3">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
          <Shapes className="h-3.5 w-3.5 text-slate-500" />
          Brand
        </h4>
        <SingleSlot
          label="Logo"
          hint="Shown in the header instead of the business name. PNG or SVG with transparency works best."
          url={logoUrl}
          busy={busy === "logo"}
          disabled={isPending}
          checkered
          onFiles={(f) => send("logo", f)}
          onClear={() => clearField("logoUrl")}
        />
        <SingleSlot
          label="Favicon"
          hint="Browser tab icon. Drop any square image — it's resized to 256px for you."
          url={faviconUrl}
          busy={busy === "favicon"}
          disabled={isPending}
          checkered
          onFiles={(f) => send("favicon", f)}
          onClear={() => clearField("faviconUrl")}
        />
      </div>

      {/* Hero */}
      <div>
        <h4 className="mb-2 text-sm font-semibold text-slate-100">Hero background</h4>
        {heroImageUrl ? (
          <div className="overflow-hidden rounded-lg border border-slate-800">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={heroImageUrl} alt="Hero background" className="h-36 w-full object-cover" />
              {busy === "hero" && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70">
                  <Loader2 className="h-5 w-5 animate-spin text-brand-400" />
                </div>
              )}
            </div>
            {/* Buttons sit under the image rather than on hover: a hover-only
                control is unreachable on a touch screen. */}
            <div className="flex gap-2 border-t border-slate-800 bg-slate-950/60 p-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => heroInputRef.current?.click()}
              >
                <ImagePlus className="h-3.5 w-3.5" /> Replace
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isPending}
                onClick={() => clearField("heroImageUrl")}
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </Button>
            </div>
            <input
              ref={heroInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) send("hero", Array.from(e.target.files));
                e.target.value = "";
              }}
            />
          </div>
        ) : (
          <DropZone
            label="Upload a hero photo"
            hint="Wide shots work best. JPG, PNG, WebP up to 4MB."
            multiple={false}
            busy={busy === "hero"}
            onFiles={(f) => send("hero", f)}
          />
        )}
        <UrlAdder
          label="or paste an image address"
          busy={isPending}
          onAdd={(url) => addUrl("heroImageUrl", url)}
        />
      </div>

      {/* Gallery */}
      <div>
        <h4 className="mb-2 text-sm font-semibold text-slate-100">
          Gallery{" "}
          <span className="font-normal text-slate-500">
            ({gallery.length} photo{gallery.length === 1 ? "" : "s"})
          </span>
        </h4>

        {gallery.length > 0 && (
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {gallery.map((url) => (
              <div key={url} className="relative overflow-hidden rounded-md border border-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="aspect-[4/3] w-full object-cover" />
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => remove(url)}
                  title="Remove"
                  aria-label="Remove photo"
                  // Always visible: on a phone there is no hover to reveal it.
                  className="absolute right-1.5 top-1.5 rounded-md bg-slate-950/80 p-1.5 text-slate-300 transition-colors hover:text-red-400 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <DropZone
          label="Drop customer photos here"
          hint="Or click to browse. Up to 12 at a time, 4MB each."
          multiple
          busy={busy === "gallery"}
          onFiles={(f) => send("gallery", f)}
        />
        <UrlAdder
          label="or paste an image address"
          busy={isPending}
          onAdd={(url) => addUrl("gallery", url)}
        />
        <p className="mt-2 text-xs text-slate-500">
          Real job photos from the business convert far better than stock. Swap these out as soon as
          the customer sends theirs.
        </p>
      </div>
    </div>
  );
}
