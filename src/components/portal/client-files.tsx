"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { FileText, Trash2, X, ChevronLeft, ChevronRight, Loader2, AlertTriangle } from "lucide-react";
import { deleteClientFile } from "@/app/portal/[token]/actions";

export type ClientFile = {
  id: string;
  url: string;
  filename: string;
  type: string;
  uploadedBy: string;
  createdAt: string;
};

/**
 * The files a client has sent, as thumbnails they can open and remove.
 *
 * A list of filenames is useless for checking you sent the right photo, and
 * without a delete the only fix for a wrong upload is asking us to do it.
 */
export function ClientFiles({ token, files }: { token: string; files: ClientFile[] }) {
  const router = useRouter();
  const [viewing, setViewing] = useState<number | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const images = files.filter((f) => f.type !== "DOCUMENT");
  const close = useCallback(() => setViewing(null), []);

  const step = useCallback(
    (delta: number) => {
      setViewing((i) => {
        if (i === null || images.length === 0) return i;
        return (i + delta + images.length) % images.length;
      });
    },
    [images.length]
  );

  useEffect(() => {
    if (viewing === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [viewing, close, step]);

  function remove(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await deleteClientFile(token, id);
      setConfirming(null);
      if (!res.ok) setError(res.error ?? "Couldn't remove that file.");
      else router.refresh();
    });
  }

  if (files.length === 0) return null;

  return (
    <div className="mt-5">
      {error && (
        <p className="mb-3 flex items-start gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-300 ring-1 ring-inset ring-amber-500/25">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
          {error}
        </p>
      )}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {files.map((f) => {
          const isImage = f.type !== "DOCUMENT";
          const imageIndex = images.findIndex((i) => i.id === f.id);
          const canRemove = f.uploadedBy === "CLIENT";

          return (
            <li
              key={f.id}
              className="group relative overflow-hidden rounded-lg border border-slate-800 bg-slate-950/50"
            >
              {isImage ? (
                <button
                  type="button"
                  onClick={() => setViewing(imageIndex)}
                  className="block w-full"
                  aria-label={`View ${f.filename}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={f.url}
                    alt={f.filename}
                    loading="lazy"
                    className="aspect-square w-full object-cover transition-opacity hover:opacity-90"
                  />
                </button>
              ) : (
                <a
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex aspect-square w-full flex-col items-center justify-center gap-2 text-slate-500 transition-colors hover:text-slate-300"
                >
                  <FileText className="h-8 w-8" />
                  <span className="px-2 text-center text-[11px]">PDF</span>
                </a>
              )}

              <p className="truncate px-2.5 py-2 text-xs text-slate-400" title={f.filename}>
                {f.filename}
              </p>

              {canRemove &&
                (confirming === f.id ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/90 p-3 text-center">
                    <p className="text-xs text-slate-300">Remove this file?</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => remove(f.id)}
                        className="rounded-md bg-red-500/90 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Remove"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirming(null)}
                        className="rounded-md px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                      >
                        Keep
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirming(f.id)}
                    aria-label={`Remove ${f.filename}`}
                    title="Remove"
                    // Always visible: there is no hover on a phone.
                    className="absolute right-1.5 top-1.5 rounded-md bg-slate-950/80 p-1.5 text-slate-300 backdrop-blur-sm transition-colors hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                ))}
            </li>
          );
        })}
      </ul>

      {viewing !== null && images[viewing] && (
        <Lightbox
          file={images[viewing]}
          hasSiblings={images.length > 1}
          index={viewing}
          total={images.length}
          onClose={close}
          onStep={step}
        />
      )}
    </div>
  );
}

function Lightbox({
  file,
  hasSiblings,
  index,
  total,
  onClose,
  onStep,
}: {
  file: ClientFile;
  hasSiblings: boolean;
  index: number;
  total: number;
  onClose: () => void;
  onStep: (d: number) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>

      {hasSiblings && (
        <>
          <button
            type="button"
            aria-label="Previous"
            onClick={(e) => {
              e.stopPropagation();
              onStep(-1);
            }}
            className="absolute left-2 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20 sm:left-6"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={(e) => {
              e.stopPropagation();
              onStep(1);
            }}
            className="absolute right-2 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20 sm:right-6"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={file.url}
        alt={file.filename}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[82vh] max-w-full rounded-lg object-contain"
      />

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1.5 text-center text-xs text-white/80">
        <span className="max-w-[60vw] truncate">{file.filename}</span>
        {hasSiblings && <span className="ml-2 text-white/50">{index + 1} / {total}</span>}
      </div>
    </div>,
    document.body
  );
}
