"use client";

import { useEffect } from "react";

/**
 * Catches a render failure anywhere under the root layout.
 *
 * Without this, Next serves its stark built-in "Application error: a
 * server-side exception has occurred" screen — on a client's own domain, in
 * front of their customers. This keeps a failure calm and offers a way out.
 *
 * The digest is shown deliberately: it's the only handle on the server log for
 * that specific failure, and asking someone to read out a short code beats
 * asking them to describe what happened.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[render error]", error);
  }, [error]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-6 py-16 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          background:
            "radial-gradient(50rem 26rem at 50% 20%, rgba(20,99,255,0.22), transparent 70%)",
        }}
      />

      <div className="relative max-w-md">
        <h1 className="text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl">
          Something went wrong
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-slate-400">
          This page didn&apos;t load properly. Trying again usually sorts it.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-7 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-brand-600/20 transition-opacity hover:opacity-90 sm:w-auto"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex w-full items-center justify-center rounded-lg border border-slate-800 px-7 py-3.5 text-[15px] font-semibold text-slate-200 transition-colors hover:bg-slate-900 sm:w-auto"
          >
            Back to the homepage
          </a>
        </div>
        {error.digest && (
          <p className="mt-8 text-sm text-slate-500">
            Reference <code className="font-mono text-slate-400">{error.digest}</code>
          </p>
        )}
      </div>
    </main>
  );
}
