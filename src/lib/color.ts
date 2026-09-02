/** Small color helpers for the generated public sites. */

function clamp(n: number) {
  return Math.min(255, Math.max(0, Math.round(n)));
}

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const int = parseInt(full, 16);
  if (Number.isNaN(int)) return [15, 23, 42];
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function shade(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const f = amount < 0 ? 0 : 255;
  const p = Math.abs(amount);
  return `#${[
    clamp((f - r) * p + r),
    clamp((f - g) * p + g),
    clamp((f - b) * p + b),
  ]
    .map((c) => c.toString(16).padStart(2, "0"))
    .join("")}`;
}

/** Perceived luminance — used to pick readable text on a brand color. */
export function isLight(hex: string): boolean {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

export function readableOn(hex: string): string {
  return isLight(hex) ? "#111111" : "#ffffff";
}

/** Linear blend between two hex colors. t=0 returns a, t=1 returns b. */
export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const c = (x: number, y: number) => clamp(x + (y - x) * t);
  return `#${[c(r1, r2), c(g1, g2), c(b1, b2)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Page surfaces for a generated site.
 *
 * Pure #fff over a full page is harsh to read against, so every light surface
 * is a faint wash of the site's own dark colour. That also means each industry
 * gets a subtly different neutral — a navy plumber reads cool, a brown
 * restaurant reads warm — instead of all eight looking like the same template.
 */
export function surfaces(secondary: string) {
  return {
    page: mix("#ffffff", secondary, 0.075),
    alt: mix("#ffffff", secondary, 0.14),
    card: mix("#ffffff", secondary, 0.02),
    border: mix("#ffffff", secondary, 0.2),
    borderStrong: mix("#ffffff", secondary, 0.3),
  };
}
