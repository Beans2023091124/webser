"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Gallery with a lightbox.
 *
 * Tiling rule keeps the final row full for any photo count: on a 3-wide grid
 * a remainder of 0 promotes the first tile to 2x2, 1 makes the last tile
 * full-width, and 2 makes it double-width. Each lands on a multiple of three.
 */
function tileClass(i: number, n: number) {
  const rem = n % 3;
  const featured = n >= 3 && rem === 0;
  const isLast = i === n - 1;
  const mobile = n % 2 === 1 && isLast ? "col-span-2" : "";

  if (featured && i === 0) return `${mobile} sm:col-span-2 sm:row-span-2`;
  if (!featured && isLast) {
    return rem === 1
      ? `${mobile} sm:col-span-3 sm:aspect-[4/1]`
      : `${mobile} sm:col-span-2 sm:aspect-[8/3]`;
  }
  return mobile;
}

export function GalleryGrid({
  urls,
  businessName,
  accent,
}: {
  urls: string[];
  businessName: string;
  accent: string;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const touchX = useRef<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const n = urls.length;
  const close = useCallback(() => setOpen(null), []);
  const next = useCallback(() => setOpen((i) => (i === null ? i : (i + 1) % n)), [n]);
  const prev = useCallback(() => setOpen((i) => (i === null ? i : (i - 1 + n) % n)), [n]);

  // Keyboard control + scroll lock while the lightbox is up.
  useEffect(() => {
    if (open === null) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close, next, prev]);

  return (
    <>
      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {urls.map((url, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setOpen(i)}
            aria-label={`View photo ${i + 1} of ${n}`}
            className={`reveal group relative block w-full overflow-hidden rounded-lg aspect-[4/3] ${tileClass(
              i,
              n
            )}`}
            style={{ transitionDelay: `${Math.min(i, 6) * 55}ms` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`${businessName} — photo ${i + 1}`}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-105"
            />
            {/* A subtle darkening on hover reads as "clickable" without
                dropping a magnifier icon on top of the photo. */}
            <span className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/15" />
          </button>
        ))}
      </div>

      {open !== null && mounted && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Photo ${open + 1} of ${n}`}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/92 p-4 backdrop-blur-sm"
          onClick={close}
          onTouchStart={(e) => {
            touchX.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(dx) > 50) (dx < 0 ? next : prev)();
            touchX.current = null;
          }}
        >
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>

          {n > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous photo"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                className="absolute left-2 flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-900 shadow-xl ring-1 ring-black/10 transition-transform hover:scale-110 sm:left-6 sm:h-14 sm:w-14"
              >
                <ChevronLeft className="h-7 w-7" strokeWidth={2.2} />
              </button>
              <button
                type="button"
                aria-label="Next photo"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                className="absolute right-2 flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-900 shadow-xl ring-1 ring-black/10 transition-transform hover:scale-110 sm:right-6 sm:h-14 sm:w-14"
              >
                <ChevronRight className="h-7 w-7" strokeWidth={2.2} />
              </button>
            </>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={urls[open]}
            alt={`${businessName} — photo ${open + 1}`}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl"
          />

          <div
            // Sits above the sticky call bar on phones, which occupies the
            // bottom ~76px.
            className="absolute bottom-24 left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 text-sm font-medium text-white sm:bottom-6"
            style={{ backgroundColor: accent }}
          >
            {open + 1} / {n}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
