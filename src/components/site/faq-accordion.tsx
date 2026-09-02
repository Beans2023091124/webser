"use client";

import { useEffect } from "react";

/**
 * Smooth open/close for the FAQ.
 *
 * The tempting CSS-only approach (animating grid-template-rows 0fr → 1fr)
 * does not actually transition here: when <details> flips open the browser
 * renders the content in the same frame and skips the transition entirely.
 * Measured pixel heights animate reliably in every engine, so this drives
 * both directions explicitly.
 *
 * Progressive enhancement: with JS off, or motion reduced, <details> keeps
 * its native instant behaviour and everything still opens.
 */
export function FaqAccordion() {
  // A closed <details> keeps its content out of the render tree entirely, so
  // no print stylesheet can reveal it. Force them open around printing.
  useEffect(() => {
    const wasClosed: HTMLDetailsElement[] = [];

    const before = () => {
      wasClosed.length = 0;
      document.querySelectorAll<HTMLDetailsElement>("details.faq").forEach((d) => {
        if (!d.open) {
          wasClosed.push(d);
          d.open = true;
        }
      });
    };
    const after = () => {
      wasClosed.forEach((d) => (d.open = false));
      wasClosed.length = 0;
    };

    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const items = Array.from(document.querySelectorAll<HTMLDetailsElement>("details.faq"));
    if (items.length === 0) return;

    const DURATION = 280;
    const EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
    const animating = new WeakSet<HTMLDetailsElement>();
    const cleanups: (() => void)[] = [];

    for (const item of items) {
      const summary = item.querySelector("summary");
      const body = item.querySelector<HTMLElement>(".faq-body");
      if (!summary || !body) continue;

      body.style.overflow = "hidden";

      const onClick = (e: Event) => {
        e.preventDefault();
        if (animating.has(item)) return;
        animating.add(item);

        const opening = !item.open;
        if (opening) item.open = true;

        const target = opening ? body.scrollHeight : 0;
        const from = opening ? 0 : body.scrollHeight;

        item.dataset.closing = opening ? "false" : "true";
        body.style.transition = "none";
        body.style.height = `${from}px`;

        // Force a reflow so the starting height is committed before animating.
        void body.offsetHeight;

        body.style.transition = `height ${DURATION}ms ${EASING}`;
        body.style.height = `${target}px`;

        window.setTimeout(() => {
          body.style.transition = "";
          body.style.height = "";
          if (!opening) item.open = false;
          delete item.dataset.closing;
          animating.delete(item);
        }, DURATION);
      };

      summary.addEventListener("click", onClick);
      cleanups.push(() => summary.removeEventListener("click", onClick));
    }

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return null;
}
