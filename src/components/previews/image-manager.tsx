"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, Trash2, ImagePlus, Star, Loader2, Shapes } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  uploadToGallery,
  uploadHeroImage,
  uploadLogo,
  uploadFavicon,
  clearImageField,
  removeGalleryImage,
  type UploadResult,
} from "@/app/admin/previews/upload-actions";

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
  onFiles: (files: FileList) => void;
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
        if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files);
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
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files);
          e.target.value = "";
        }}
      />
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
  onFiles: (f: FileList) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  if (!url) {
    return <DropZone label={label} hint={hint} multiple={false} busy={busy} onFiles={onFiles} />;
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
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
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-200">{label}</p>
        <p className="truncate text-xs text-slate-500">{url.split("/").pop()}</p>
      </div>
      <div className="flex flex-none gap-1.5">
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => inputRef.current?.click()}>
          <ImagePlus className="h-3.5 w-3.5" /> Replace
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
          if (e.target.files?.length) onFiles(e.target.files);
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
  const [busy, setBusy] = useState<"hero" | "gallery" | "logo" | "favicon" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function send(kind: "hero" | "gallery" | "logo" | "favicon", files: FileList) {
    setError(null);
    setBusy(kind);

    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("files", f));

    const action =
      kind === "hero"
        ? uploadHeroImage
        : kind === "logo"
        ? uploadLogo
        : kind === "favicon"
        ? uploadFavicon
        : uploadToGallery;

    startTransition(async () => {
      const res: UploadResult = await action(previewId, fd);
      setBusy(null);
      if (!res.ok) setError(res.error ?? "Upload failed.");
      else router.refresh();
    });
  }

  function clearField(field: "logoUrl" | "faviconUrl" | "heroImageUrl") {
    setError(null);
    startTransition(async () => {
      const res = await clearImageField(previewId, field);
      if (!res.ok) setError(res.error ?? "Could not remove that image.");
      else router.refresh();
    });
  }

  function remove(url: string) {
    setError(null);
    startTransition(async () => {
      const res = await removeGalleryImage(previewId, url);
      if (!res.ok) setError(res.error ?? "Could not remove that image.");
      else router.refresh();
    });
  }

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
          hint="Browser tab icon. Square PNG, SVG, or ICO. Falls back to generated initials."
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
        <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-100">
          <Star className="h-3.5 w-3.5 text-slate-500" />
          Hero background
        </h4>
        {heroImageUrl ? (
          <div className="group relative overflow-hidden rounded-lg border border-slate-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroImageUrl} alt="Hero background" className="h-36 w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => document.getElementById("hero-replace")?.click()}
              >
                <ImagePlus className="h-3.5 w-3.5" /> Replace
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="ml-2"
                disabled={isPending}
                onClick={() => clearField("heroImageUrl")}
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </Button>
            </div>
            <input
              id="hero-replace"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) send("hero", e.target.files);
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
          <div className="mb-3 grid grid-cols-3 gap-2">
            {gallery.map((url) => (
              <div key={url} className="group relative overflow-hidden rounded-md border border-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="aspect-[4/3] w-full object-cover" />
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => remove(url)}
                  title="Remove"
                  className="absolute right-1.5 top-1.5 rounded-md bg-slate-950/80 p-1.5 text-slate-300 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
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
        <p className="mt-2 text-xs text-slate-500">
          Real job photos from the business convert far better than stock. Swap these out as soon as the
          customer sends theirs.
        </p>
      </div>
    </div>
  );
}
