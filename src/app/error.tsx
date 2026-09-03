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
 * that specific failure, and asking a customer to read out a short code beats
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
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-16 text-center">
      <div className="max-w-md">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Something went wrong
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-500">
          This page didn&apos;t load properly. Trying again usually sorts it.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-6 py-3 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 sm:w-auto"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 px-6 py-3 text-[15px] font-semibold text-slate-700 transition-colors hover:bg-slate-100 sm:w-auto"
          >
            Back to the homepage
          </a>
        </div>
        {error.digest && (
          <p className="mt-8 text-xs text-slate-400">
            Reference <code className="font-mono text-slate-500">{error.digest}</code>
          </p>
        )}
      </div>
    </main>
  );
}
