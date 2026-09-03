"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Globe,
  Check,
  Copy,
  Loader2,
  AlertTriangle,
  ExternalLink,
  ShoppingCart,
  ArrowRight,
} from "lucide-react";
import {
  saveCustomDomain,
  claimFreeAddress,
  verifyDomain,
  clearCustomDomain,
  type DomainResult,
} from "@/app/portal/[token]/domain-actions";

const ACCENT = "#1463FF";

type DnsRecord = { type: string; name: string; value: string; note?: string };

type Props = {
  token: string;
  domainName: string | null;
  dnsStatus: string | null;
  records: DnsRecord[] | null;
  hostConfigured: boolean;
  canUseFreeAddress: boolean;
  /** "primary" while publishing, "secondary" as a nudge once already live. */
  variant: "primary" | "secondary";
  registrars: { name: string; url: string; note: string }[];
  /** A sensible domain to try, from their business name. */
  suggestion: string;
};

function Result({ result }: { result: DomainResult | null }) {
  if (!result) return null;
  return (
    <p
      className={`mt-3 flex items-start gap-2 rounded-md px-3 py-2 text-sm ring-1 ring-inset ${
        result.ok
          ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/25"
          : "bg-amber-500/10 text-amber-300 ring-amber-500/25"
      }`}
    >
      {result.ok ? (
        <Check className="mt-0.5 h-4 w-4 flex-none" />
      ) : (
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
      )}
      <span>{result.ok ? result.message : result.error}</span>
    </p>
  );
}

function CopyValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(value).then(
          () => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          },
          () => undefined
        );
      }}
      className="group inline-flex max-w-full items-center gap-1.5 rounded px-1.5 py-0.5 font-mono text-[13px] text-slate-200 transition-colors hover:bg-slate-800"
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

/** The address entry box, shared by the "I own one" and "I'll buy one" paths. */
function DomainInput({
  token,
  label,
  onDone,
}: {
  token: string;
  label: string;
  onDone: () => void;
}) {
  const [value, setValue] = useState("");
  const [result, setResult] = useState<DomainResult | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          const res = await saveCustomDomain(token, fd);
          setResult(res);
          if (res.ok) onDone();
        })
      }
      className="mt-4"
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          name="domain"
          value={value}
          onChange={(e) => setValue(e.target.value)}
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
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {label}
        </button>
      </div>
      <Result result={result} />
    </form>
  );
}

export function DomainSetup({
  token,
  domainName,
  dnsStatus,
  records,
  hostConfigured,
  canUseFreeAddress,
  variant,
  registrars,
  suggestion,
}: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"own" | "buy" | null>(null);
  const [expanded, setExpanded] = useState(variant === "primary");
  const [result, setResult] = useState<DomainResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const run = (fn: () => Promise<DomainResult>) =>
    startTransition(async () => {
      const res = await fn();
      setResult(res);
      if (res.ok) router.refresh();
    });

  // --- Already live, just offering the option ------------------------------
  if (variant === "secondary" && !expanded) {
    return (
      <>
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-50">
          <Globe className="h-4 w-4" style={{ color: ACCENT }} />
          Want your own web address?
        </h2>
        <p className="mt-1.5 text-[15px] text-slate-400">
          Something like <span className="text-slate-200">yourbusiness.com</span> instead of the
          long link. Around $12 a year from a registrar &mdash; we&apos;ll set it up for you.
        </p>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-800"
        >
          Set one up <ArrowRight className="h-4 w-4" />
        </button>
      </>
    );
  }

  // --- Records stage: they've told us the domain ---------------------------
  if (domainName) {
    return (
      <>
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-50">
          <Globe className="h-4 w-4" style={{ color: ACCENT }} />
          Connect {domainName}
        </h2>
        <p className="mt-1.5 text-[15px] leading-relaxed text-slate-400">
          One last step, and it happens at the company you bought the domain from &mdash; not
          here. Log in there, find the DNS settings, and add these two records.
        </p>

        {records && records.length > 0 ? (
          <div className="mt-5 overflow-hidden rounded-lg border border-slate-800">
            <div className="hidden bg-slate-950/60 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:grid sm:grid-cols-[80px_80px_1fr]">
              <span>Type</span>
              <span>Name</span>
              <span>Points to</span>
            </div>
            {records.map((r, i) => (
              <div
                key={`${r.type}-${r.name}`}
                className={`px-4 py-3 sm:grid sm:grid-cols-[80px_80px_1fr] sm:items-center sm:gap-2 ${
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
        ) : (
          <div className="mt-5 rounded-lg border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-400">
            We&apos;re getting the hosting ready for your site. As soon as it is, we&apos;ll email
            you the exact records to add &mdash; you don&apos;t need to do anything yet.
          </div>
        )}

        {dnsStatus === "PENDING" && (
          <p className="mt-4 flex items-start gap-2 text-sm text-slate-400">
            <Loader2 className="mt-0.5 h-4 w-4 flex-none animate-spin text-slate-500" />
            Waiting on {domainName} to start pointing at us. This is normal &mdash; DNS changes can
            take a few hours to spread.
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-800 pt-5">
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(() => verifyDomain(token))}
            className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: ACCENT }}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {hostConfigured ? "I've added the records — check now" : "I've added the records"}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(() => clearCustomDomain(token))}
            className="text-sm text-slate-400 underline hover:text-slate-200"
          >
            Use a different address
          </button>
        </div>
        <Result result={result} />
      </>
    );
  }

  // --- Choice stage --------------------------------------------------------
  return (
    <>
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-50">
        <Globe className="h-4 w-4" style={{ color: ACCENT }} />
        Your web address
      </h2>
      <p className="mt-1.5 text-[15px] leading-relaxed text-slate-400">
        Your site is built and approved. Last thing: what should people type to find you?
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setMode(mode === "own" ? null : "own")}
          className={`rounded-xl border p-4 text-left transition-colors ${
            mode === "own"
              ? "border-brand-500 bg-brand-500/5"
              : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
          }`}
        >
          <span className="flex items-center gap-2 font-semibold text-slate-100">
            <Check className="h-4 w-4 text-slate-500" />I already have one
          </span>
          <span className="mt-1 block text-sm text-slate-400">
            You bought a domain before &mdash; we&apos;ll point it at your new site.
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === "buy" ? null : "buy")}
          className={`rounded-xl border p-4 text-left transition-colors ${
            mode === "buy"
              ? "border-brand-500 bg-brand-500/5"
              : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
          }`}
        >
          <span className="flex items-center gap-2 font-semibold text-slate-100">
            <ShoppingCart className="h-4 w-4 text-slate-500" />I need to buy one
          </span>
          <span className="mt-1 block text-sm text-slate-400">
            Usually about $12 a year. Takes five minutes.
          </span>
        </button>
      </div>

      {mode === "own" && (
        <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
          <p className="text-sm text-slate-400">
            Type it exactly as you bought it &mdash; no{" "}
            <span className="text-slate-300">https://</span> or{" "}
            <span className="text-slate-300">www</span> needed.
          </p>
          <DomainInput token={token} label="Continue" onDone={() => router.refresh()} />
        </div>
      )}

      {mode === "buy" && (
        <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
          <ol className="space-y-3 text-sm text-slate-400">
            <li className="flex gap-3">
              <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-slate-300">
                1
              </span>
              <span>
                Pick a name. Short and obvious beats clever. Try{" "}
                <span className="text-slate-300">.com</span> first; if it&apos;s taken, add your
                town or try <span className="text-slate-300">.co</span>. Worth a look:
                <span className="ml-1 inline-flex align-middle">
                  <CopyValue value={suggestion} />
                </span>
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-slate-300">
                2
              </span>
              <span>
                Buy it at any of these &mdash; they all work the same for us. Decline the extras
                they try to sell you at checkout; you only need the domain itself.
              </span>
            </li>
          </ol>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {registrars.map((r) => (
              <a
                key={r.name}
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 transition-colors hover:border-slate-700 hover:bg-slate-800"
              >
                <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-100">
                  {r.name} <ExternalLink className="h-3 w-3 text-slate-500" />
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">{r.note}</span>
              </a>
            ))}
          </div>

          <div className="mt-5 border-t border-slate-800 pt-4">
            <p className="flex gap-3 text-sm text-slate-400">
              <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-slate-300">
                3
              </span>
              <span>Bought it? Type it here and we&apos;ll take it from there.</span>
            </p>
            <DomainInput token={token} label="Continue" onDone={() => router.refresh()} />
          </div>
        </div>
      )}

      {canUseFreeAddress && (
        <div className="mt-6 border-t border-slate-800 pt-5">
          <p className="text-sm text-slate-400">
            Not ready to decide? We can publish now on a free address and swap in your own domain
            whenever you like &mdash; nothing has to be rebuilt.
          </p>
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(() => claimFreeAddress(token))}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-800 disabled:opacity-60"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Publish on the free address
          </button>
        </div>
      )}
      <Result result={result} />
    </>
  );
}
