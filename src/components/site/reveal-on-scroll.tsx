"use client";

import { useEffect } from "react";

/**
 * Reveals anything tagged `.reveal` as it scrolls into view.
 *
 * Deliberately a single page-level observer rather than a wrapper component:
 * the public site is a server component, and this keeps the whole animation
 * system to one small client island instead of turning every section into one.
 *
 * Fails open — if IntersectionObserver is unavailable, or motion is reduced,
 * everything is shown immediately rather than staying invisible.
 */
export function RevealOnScroll() {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    if (nodes.length === 0) return;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const showAll = () => nodes.forEach((n) => n.classList.add("is-visible"));

    if (reduced || typeof IntersectionObserver === "undefined") {
      showAll();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );

    // Anything already on screen at load reveals immediately, so the hero
    // never flashes empty.
    for (const node of nodes) {
      const box = node.getBoundingClientRect();
      if (box.top < window.innerHeight * 0.92) node.classList.add("is-visible");
      else observer.observe(node);
    }

    return () => observer.disconnect();
  }, []);

  return null;
}
