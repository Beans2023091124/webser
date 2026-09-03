import Link from "next/link";

export const metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

/**
 * Shown for any unmatched URL — including on a client's own domain, since one
 * deployment serves every site. That's why there's no Webser branding here: a
 * plumber's customer who mistypes a URL should get a calm page that sends them
 * back to the site they were looking for, not somebody else's logo.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-16 text-center">
      <div className="max-w-md">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
          404
        </p>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          We couldn&apos;t find that page
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-500">
          The link may be out of date, or the address might have a typo in it.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center justify-center rounded-lg bg-slate-900 px-6 py-3 text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          Back to the homepage
        </Link>
      </div>
    </main>
  );
}
