"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { galleryStyleOf } from "@/lib/preview";

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

/**
 * Masonry needs uneven heights to look like masonry, and a set of photos shot
 * on the same phone is usually all one shape. Cycling three ratios guarantees
 * the stagger whatever gets uploaded.
 */
const MASONRY_RATIOS = ["aspect-[4/5]", "aspect-[4/3]", "aspect-[1/1]", "aspect-[3/4]"];

export function GalleryGrid({
  urls,
  businessName,
  accent,
  style,
}: {
  urls: string[];
  businessName: string;
  accent: string;
  style?: string | null;
}) {
  const layout = galleryStyleOf(style);
  const [lead, setLead] = useState(0);
  const strip = useRef<HTMLDivElement>(null);
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

  // One photo per tile, shared by every layout.
  const Tile = ({
    url,
    i,
    className,
    ratio,
    onClick,
    label,
  }: {
    url: string;
    i: number;
    className?: string;
    ratio?: string;
    onClick?: () => void;
    label?: string;
  }) => (
    <button
      type="button"
      onClick={onClick ?? (() => setOpen(i))}
      aria-label={label ?? `View photo ${i + 1} of ${n}`}
      className={`group relative block w-full overflow-hidden rounded-lg ${ratio ?? "aspect-[4/3]"} ${className ?? ""}`}
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
  );

  const scrollStrip = (dir: 1 | -1) => {
    const el = strip.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <>
      {layout === "mosaic" && (
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          {urls.map((url, i) => (
            <div
              key={i}
              className={`reveal ${tileClass(i, n)}`}
              style={{ transitionDelay: `${Math.min(i, 6) * 55}ms` }}
            >
              <Tile url={url} i={i} className="h-full" />
            </div>
          ))}
        </div>
      )}

      {layout === "filmstrip" && (
        <div className="reveal relative mt-10">
          {/*
            Bleeds past the page gutter on phones so the strip runs off the edge
            of the screen -- that overflow is what tells you it can be swiped.
          */}
          <div
            ref={strip}
            className="hide-scrollbar -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 sm:mx-0 sm:gap-4 sm:px-0"
          >
            {urls.map((url, i) => (
              <div
                key={i}
                className="w-[78%] flex-none snap-center sm:w-[46%] lg:w-[31.5%]"
              >
                <Tile url={url} i={i} ratio="aspect-[4/3]" />
              </div>
            ))}
          </div>

          {n > 2 && (
            <div className="mt-4 hidden justify-end gap-2 sm:flex">
              <button
                type="button"
                onClick={() => scrollStrip(-1)}
                aria-label="Scroll photos left"
                className="flex h-10 w-10 items-center justify-center rounded-full ring-1 transition-colors"
                style={{ color: accent, ["--tw-ring-color" as string]: accent }}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => scrollStrip(1)}
                aria-label="Scroll photos right"
                className="flex h-10 w-10 items-center justify-center rounded-full ring-1 transition-colors"
                style={{ color: accent, ["--tw-ring-color" as string]: accent }}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      )}

      {layout === "masonry" && (
        <div className="mt-10 gap-3 [column-count:2] sm:gap-4 lg:[column-count:3]">
          {urls.map((url, i) => (
            <div
              key={i}
              className="reveal mb-3 break-inside-avoid sm:mb-4"
              style={{ transitionDelay: `${Math.min(i, 6) * 55}ms` }}
            >
              <Tile url={url} i={i} ratio={MASONRY_RATIOS[i % MASONRY_RATIOS.length]} />
            </div>
          ))}
        </div>
      )}

      {layout === "showcase" && (
        <div className="reveal mt-10">
          <Tile
            url={urls[lead]}
            i={lead}
            ratio="aspect-[16/10] sm:aspect-[16/9]"
            label={`View photo ${lead + 1} of ${n} full size`}
          />
          {n > 1 && (
            <div className="hide-scrollbar -mx-5 mt-3 flex gap-2.5 overflow-x-auto px-5 sm:mx-0 sm:mt-4 sm:grid sm:grid-cols-5 sm:gap-3 sm:overflow-visible sm:px-0">
              {urls.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setLead(i)}
                  aria-label={`Show photo ${i + 1}`}
                  aria-current={i === lead}
                  className={`relative aspect-[4/3] w-24 flex-none overflow-hidden rounded-md transition-opacity sm:w-auto ${
                    i === lead ? "opacity-100" : "opacity-55 hover:opacity-85"
                  }`}
                  style={
                    i === lead
                      ? { outline: `2px solid ${accent}`, outlineOffset: "2px" }
                      : undefined
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`${businessName} — photo ${i + 1} thumbnail`}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

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
