import Link from "next/link";

export const metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

/**
 * Shown for any unmatched URL.
 *
 * Themed to match the rest of Webser, but deliberately carries no Webser logo
 * or wording: one deployment serves every client domain, so a plumber's
 * customer who mistypes a URL lands here too, and putting our name on their
 * site would be wrong.
 */
export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-6 py-16 text-center">
      {/* The same glow the marketing page opens with, centred. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          background:
            "radial-gradient(50rem 26rem at 50% 20%, rgba(20,99,255,0.22), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.12) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(34rem 20rem at 50% 30%, #000, transparent 75%)",
          WebkitMaskImage: "radial-gradient(34rem 20rem at 50% 30%, #000, transparent 75%)",
        }}
      />

      <div className="relative max-w-md">
        <p className="inline-flex items-center rounded-full border border-slate-800 bg-slate-900/70 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
          404
        </p>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl">
          We couldn&apos;t find that page
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-slate-400">
          The link may be out of date, or the address might have a typo in it.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center justify-center rounded-lg bg-brand-600 px-7 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-brand-600/20 transition-opacity hover:opacity-90"
        >
          Back to the homepage
        </Link>
      </div>
    </main>
  );
}
