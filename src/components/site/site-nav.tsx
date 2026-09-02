"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Menu, X, Phone } from "lucide-react";

export type NavLink = { href: string; label: string };

/**
 * Site navigation: scroll-spy on desktop, slide-down menu on mobile.
 *
 * Below `lg` there was previously no navigation at all, which matters because
 * most prospects open a texted link on a phone.
 */
export function SiteNav({
  links,
  dark,
  accent,
  phone,
  ctaText,
  businessName,
}: {
  links: NavLink[];
  dark: boolean;
  accent: string;
  phone: string | null;
  ctaText: string;
  businessName: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  // Kept mounted through the closing animation, then dropped.
  const [closing, setClosing] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const CLOSE_MS = 200;
  const close = useCallback(() => {
    setClosing(true);
    window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, CLOSE_MS);
  }, []);

  // Highlight whichever section currently occupies the upper part of the screen.
  useEffect(() => {
    if (links.length === 0) return;
    const ids = links.map((l) => l.href.replace("#", ""));
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const onScroll = () => {
      const line = window.innerHeight * 0.3;
      let current: string | null = null;
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= line) current = section.id;
      }
      // Near the bottom the last section may never cross the line.
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 80) {
        current = sections[sections.length - 1].id;
      }
      setActive(current);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [links]);

  // Lock scrolling behind the mobile sheet.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const idle = dark ? "text-white/65" : "text-slate-500";
  const hover = dark ? "hover:text-white" : "hover:text-slate-900";

  return (
    <>
      {/* Desktop */}
      <nav className="hidden items-center gap-7 text-sm font-medium lg:flex">
        {links.map((l) => {
          const isActive = active === l.href.replace("#", "");
          return (
            <a
              key={l.href}
              href={l.href}
              className={`relative py-1 transition-colors ${
                isActive ? (dark ? "text-white" : "text-slate-900") : `${idle} ${hover}`
              }`}
            >
              {l.label}
              <span
                className="absolute -bottom-0.5 left-0 h-0.5 rounded-full transition-all duration-300"
                style={{ backgroundColor: accent, width: isActive ? "100%" : "0%" }}
              />
            </a>
          );
        })}
      </nav>

      {/*
        Mobile trigger. `order-last` puts it at the far right of the header
        without disturbing the desktop arrangement, where this button is hidden
        and the nav above sits between the logo and the call-to-action.
      */}
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className={`order-last flex h-10 w-10 flex-none items-center justify-center rounded-md transition-colors lg:hidden ${
          dark ? "bg-white/10 text-white" : "bg-black/[0.06] text-slate-900"
        }`}
      >
        <span className="relative block h-5 w-5">
          <Menu
            className={`absolute inset-0 h-5 w-5 transition-all duration-200 ${
              open ? "rotate-90 opacity-0" : "rotate-0 opacity-100"
            }`}
          />
          <X
            className={`absolute inset-0 h-5 w-5 transition-all duration-200 ${
              open ? "rotate-0 opacity-100" : "-rotate-90 opacity-0"
            }`}
          />
        </span>
      </button>

      {/* Mobile sheet */}
      {open && mounted && createPortal(
        <div className="fixed inset-0 z-[80] lg:hidden">
          <div
            className={`absolute inset-0 bg-black/60 backdrop-blur-sm ${
              closing ? "animate-[scrimOut_200ms_ease-out_forwards]" : "animate-[scrimIn_200ms_ease-out]"
            }`}
            onClick={close}
          />
          <div
            className={`absolute inset-x-0 top-0 max-h-[88vh] overflow-y-auto p-5 shadow-2xl ${
              closing
                ? "animate-[sheetOut_200ms_cubic-bezier(0.4,0,1,1)_forwards]"
                : "animate-[sheetIn_260ms_cubic-bezier(0.22,1,0.36,1)]"
            }`}
            style={{ backgroundColor: dark ? "#0e0e0e" : "#ffffff" }}
          >
            <div className="mb-5 flex items-center justify-between">
              <span
                className={`text-lg font-extrabold ${dark ? "text-white" : "text-slate-900"}`}
              >
                {businessName}
              </span>
              <button
                type="button"
                onClick={close}
                aria-label="Close menu"
                className={`rounded-md p-2 ${dark ? "text-white/70" : "text-slate-500"}`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex flex-col">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={close}
                  className={`border-b py-3.5 text-base font-medium ${
                    dark ? "border-white/10 text-white/85" : "border-slate-200 text-slate-700"
                  }`}
                >
                  {l.label}
                </a>
              ))}
            </nav>

            <div className="mt-5 flex flex-col gap-2.5">
              <a
                href="#quote"
                onClick={close}
                className="rounded-md px-5 py-3.5 text-center text-[15px] font-semibold text-white"
                style={{ backgroundColor: accent }}
              >
                {ctaText}
              </a>
              {phone && (
                <a
                  href={`tel:${phone}`}
                  className={`flex items-center justify-center gap-2 rounded-md border px-5 py-3.5 text-[15px] font-semibold ${
                    dark ? "border-white/25 text-white" : "border-slate-300 text-slate-800"
                  }`}
                >
                  <Phone className="h-4 w-4" />
                  {phone}
                </a>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
