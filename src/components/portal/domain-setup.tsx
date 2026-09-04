"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe, Check, Copy, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import type { DnsRecord } from "@/lib/domain";
import { connectDomain, checkDomain, disconnectDomain, type DomainResult } from "@/app/portal/[token]/domain-actions";

const ACCENT = "#2570ff";

/**
 * Connecting a customer's own web address.
 *
 * The site is already live when this renders, which shapes the whole thing:
 * nothing here is a step someone is stuck in, so it reads as an optional
 * upgrade rather than a hurdle. Three states only -- not started, records
 * pending, connected.
 */

function CopyValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="group flex min-w-0 items-center gap-2 rounded px-1.5 py-0.5 font-mono text-[13px] text-slate-200 transition-colors hover:bg-slate-800"
      title="Copy"
    >
      <span className="truncate">{value}</span>
      {copied ? (
        <Check className="h-3.5 w-3.5 flex-none text-emerald-400" />
      ) : (
        <Copy className="h-3.5 w-3.5 flex-none text-slate-500 group-hover:text-slate-300" />
      )}
    </button>
  );
}

function Result({ result }: { result: DomainResult | null }) {
  if (!result) return null;
  const good = result.ok;
  return (
    <div
      className={`mt-3 flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm ${
        good
          ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-inset ring-emerald-500/25"
          : "bg-amber-500/10 text-amber-200 ring-1 ring-inset ring-amber-500/25"
      }`}
    >
      {good ? (
        <Check className="mt-0.5 h-4 w-4 flex-none" />
      ) : (
        <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
      )}
      <span className="leading-relaxed">{result.message ?? result.error}</span>
    </div>
  );
}

export function DomainSetup({
  token,
  domainName,
  connected,
  records,
  freeUrl,
  registrars,
  suggestion,
}: {
  token: string;
  domainName: string | null;
  connected: boolean;
  records: DnsRecord[];
  freeUrl: string;
  registrars: { name: string; url: string; note: string }[];
  suggestion: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [result, setResult] = useState<DomainResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showBuy, setShowBuy] = useState(false);

  const run = (fn: () => Promise<DomainResult>) =>
    startTransition(async () => {
      const res = await fn();
      setResult(res);
      if (res.ok) router.refresh();
    });

  // --- Connected -----------------------------------------------------------
  if (connected && domainName) {
    return (
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-50">
          <Globe className="h-4 w-4" style={{ color: ACCENT }} />
          Your web address
        </h2>
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-4 py-3">
          <Check className="h-4 w-4 flex-none text-emerald-400" />
          <a
            href={`https://${domainName}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 font-semibold text-emerald-200 hover:underline"
          >
            {domainName}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <span className="text-sm text-emerald-200/70">is connected to your site.</span>
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(() => disconnectDomain(token))}
          className="mt-3 text-xs font-medium text-slate-500 transition-colors hover:text-slate-300 disabled:opacity-50"
        >
          Use a different address
        </button>
        <Result result={result} />
      </div>
    );
  }

  // --- Records pending -----------------------------------------------------
  if (domainName) {
    return (
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-50">
          <Globe className="h-4 w-4" style={{ color: ACCENT }} />
          Connect {domainName}
        </h2>
        <p className="mt-1.5 text-[15px] leading-relaxed text-slate-400">
          Log in wherever you bought {domainName}, find the DNS settings, and add these two rows.
          Your site stays live at its current address the whole time.
        </p>

        <div className="mt-5 overflow-hidden rounded-lg border border-slate-800">
          <div className="hidden bg-slate-950/60 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:grid sm:grid-cols-[70px_80px_1fr]">
            <span>Type</span>
            <span>Name</span>
            <span>Points to</span>
          </div>
          {records.map((r, i) => (
            <div
              key={`${r.type}-${r.name}`}
              className={`px-4 py-3 sm:grid sm:grid-cols-[70px_80px_1fr] sm:items-center sm:gap-2 ${
                i > 0 ? "border-t border-slate-800" : ""
              }`}
            >
              <div className="flex items-center gap-2 sm:block">
                <span className="w-14 text-xs text-slate-500 sm:hidden">Type</span>
                <span className="font-mono text-[13px] text-slate-300">{r.type}</span>
              </div>
              <div className="mt-1 flex items-center gap-2 sm:mt-0 sm:block">
                <span className="w-14 text-xs text-slate-500 sm:hidden">Name</span>
                <span className="font-mono text-[13px] text-slate-300">{r.name}</span>
              </div>
              <div className="mt-1 flex min-w-0 items-center gap-2 sm:mt-0">
                <span className="w-14 flex-none text-xs text-slate-500 sm:hidden">Value</span>
                <CopyValue value={r.value} />
              </div>
              {r.note && (
                <p className="mt-1 text-xs text-slate-600 sm:col-span-3 sm:mt-1.5">{r.note}</p>
              )}
            </div>
          ))}
        </div>

        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          If your registrar refuses the <span className="font-mono text-slate-400">@</span> row,
          that is usually one of their own services &mdash; a parking page, website builder or shop
          &mdash; still attached to the domain. Remove that and it will save. Either row on its own
          is enough to connect your site.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(() => checkDomain(token))}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: ACCENT }}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            I&apos;ve added them &mdash; check now
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(() => disconnectDomain(token))}
            className="text-sm font-medium text-slate-400 underline underline-offset-4 transition-colors hover:text-slate-200 disabled:opacity-50"
          >
            Use a different address
          </button>
        </div>
        <Result result={result} />
      </div>
    );
  }

  // --- Not started ---------------------------------------------------------
  return (
    <div>
      <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-50">
        <Globe className="h-4 w-4" style={{ color: ACCENT }} />
        Use your own web address
      </h2>
      <p className="mt-1.5 text-[15px] leading-relaxed text-slate-400">
        Your site is live at{" "}
        <a
          href={freeUrl}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-slate-200 hover:underline"
        >
          {freeUrl.replace(/^https?:\/\//, "")}
        </a>
        . If you own a web address, or want one, you can point it here &mdash; nothing gets rebuilt
        and your site stays up while you do it.
      </p>

      <form
        action={(fd) => run(() => connectDomain(token, fd))}
        className="mt-4 flex flex-col gap-2 sm:flex-row"
      >
        <input
          name="domain"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            // Submit on Enter explicitly. A single-input form is meant to do
            // this on its own and was not, and typing an address then pressing
            // Enter is the obvious thing to do.
            if (e.key === "Enter") {
              e.preventDefault();
              if (value.trim() && !isPending) e.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="mybusiness.com"
          autoComplete="off"
          spellCheck={false}
          className="h-11 min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 text-[15px] text-slate-100 placeholder:text-slate-600 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        />
        <button
          type="submit"
          disabled={isPending || !value.trim()}
          className="inline-flex h-11 flex-none items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: ACCENT }}
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Connect it
        </button>
      </form>
      <Result result={result} />

      <button
        type="button"
        onClick={() => setShowBuy((v) => !v)}
        className="mt-4 text-sm font-medium text-slate-400 underline underline-offset-4 transition-colors hover:text-slate-200"
      >
        {showBuy ? "Hide" : "I don't have one yet"}
      </button>

      {showBuy && (
        <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/50 p-4">
          <p className="text-sm text-slate-400">
            Buy it in your own name so it stays yours &mdash; usually about $12 a year, paid to
            them rather than to us. Something like{" "}
            <span className="font-mono text-slate-200">{suggestion}</span> works well.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {registrars.map((r) => (
              <a
                key={r.name}
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 transition-colors hover:border-slate-700"
              >
                <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-200">
                  {r.name}
                  <ExternalLink className="h-3 w-3 text-slate-500" />
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">{r.note}</span>
              </a>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Once you have it, type it above and we&apos;ll give you the two rows to add.
          </p>
        </div>
      )}
    </div>
  );
}
