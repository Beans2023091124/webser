"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Upload,
  Check,
  Loader2,
  MessageSquarePlus,
  AlertTriangle,
  CreditCard,
  FlaskConical,
  RotateCcw,
  Rocket,
  Globe,
} from "lucide-react";
import {
  requestRevision,
  approveProject,
  uploadClientFiles,
  markReadyToBuild,
  type PortalResult,
} from "@/app/portal/[token]/actions";
import { startBuildCheckout, startMaintenanceCheckout } from "@/app/portal/[token]/payment-actions";
import {
  devMarkBuildPaid,
  devStartMaintenance,
  devResetPayments,
  devForceDomainLive,
  type DevResult,
} from "@/app/portal/[token]/dev-actions";

const ACCENT = "#1463FF";

function Notice({ result }: { result: PortalResult | DevResult | null }) {
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

/**
 * A confirmation the client can't miss.
 *
 * The inline notices vanish the moment the page refreshes into its new stage,
 * which is exactly when someone wants reassurance that their click landed.
 * This holds still until they dismiss it, and the refresh happens on the way
 * out. Portaled to the body so the sticky portal chrome can't clip it.
 */
function DoneModal({
  title,
  body,
  cta,
  onClose,
}: {
  title: string;
  body: string;
  cta: string;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-7 text-center shadow-2xl shadow-black/50"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15">
          <Check className="h-7 w-7 text-emerald-400" strokeWidth={2.5} />
        </div>
        <h3 className="mt-5 text-xl font-bold text-slate-50">{title}</h3>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-400">{body}</p>
        <button
          type="button"
          autoFocus
          onClick={onClose}
          className="mt-6 w-full rounded-lg px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: ACCENT }}
        >
          {cta}
        </button>
      </div>
    </div>,
    document.body
  );
}

/**
 * The confirmation itself, rendered from the page rather than from the button
 * that triggered it.
 *
 * A server action always re-renders the current route when it returns, and
 * these actions move the project to its next stage — which unmounts the card
 * the button lives in. Anything the button rendered goes with it. Hanging the
 * modal off a search param instead keeps it on screen until it's dismissed,
 * and survives a reload.
 */
const DONE_COPY: Record<
  string,
  { title: string; body: string; cta: string; scrollTop?: boolean }
> = {
  started: {
    title: "You're all set",
    body: "We've got everything and we've started building your site. Nothing else is needed from you — we'll email as soon as there's something to look at. If you think of anything in the meantime, you can still send it from this page.",
    cta: "Got it",
  },
  approved: {
    title: "Approved — nice one",
    body: "That's your site signed off. One thing left: choosing the web address people will type to find you. The options are at the top of this page, including where to buy one if you haven't got it yet.",
    cta: "Choose my web address",
    // The card it points at is at the top, and they're at the bottom.
    scrollTop: true,
  },
};

export function StageDoneModal({ token, kind }: { token: string; kind?: string }) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const copy = kind ? DONE_COPY[kind] : undefined;

  if (!copy || dismissed) return null;

  return (
    <DoneModal
      title={copy.title}
      body={copy.body}
      cta={copy.cta}
      onClose={() => {
        setDismissed(true);
        router.replace(`/portal/${token}`, { scroll: false });
        if (copy.scrollTop) window.scrollTo({ top: 0, behavior: "smooth" });
      }}
    />
  );
}

export function PayButton({
  token,
  kind,
  label,
}: {
  token: string;
  kind: "build" | "maintenance";
  label: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res =
              kind === "build"
                ? await startBuildCheckout(token)
                : await startMaintenanceCheckout(token);
            if (res.url) window.location.href = res.url;
            else setError(res.error ?? "Something went wrong starting checkout.");
          });
        }}
        disabled={isPending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3.5 text-[15px] font-semibold text-white shadow-lg transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto"
        style={{ backgroundColor: ACCENT }}
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
        {isPending ? "Opening secure checkout…" : label}
      </button>
      {error && (
        <p className="mt-3 flex items-start gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-300 ring-1 ring-inset ring-amber-500/25">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

/**
 * Developer-only payment shortcut.
 *
 * Rendered only when the server says dev payments are enabled, and the server
 * action re-checks that flag — the hidden button is a convenience, not the
 * security control.
 */
export function DevPaymentPanel({
  token,
  canPayBuild,
  canStartMaintenance,
  canForceLive,
}: {
  token: string;
  canPayBuild: boolean;
  canStartMaintenance: boolean;
  canForceLive: boolean;
}) {
  const router = useRouter();
  const [result, setResult] = useState<DevResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(fn: (t: string) => Promise<DevResult>) {
    setResult(null);
    startTransition(async () => {
      const res = await fn(token);
      setResult(res);
      if (res.ok) router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border border-dashed border-amber-500/40 bg-amber-500/[0.06] p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-amber-300">
        <FlaskConical className="h-4 w-4" />
        Developer tools
      </h2>
      <p className="mt-1.5 text-sm text-amber-200/70">
        Only visible in development. These run the same settlement code as the real Stripe webhook,
        so the rest of the flow behaves exactly as it will in production — but no money moves.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {canPayBuild && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(devMarkBuildPaid)}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/20 disabled:opacity-60"
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Simulate build payment
          </button>
        )}
        {canStartMaintenance && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(devStartMaintenance)}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/20 disabled:opacity-60"
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Simulate maintenance signup
          </button>
        )}
        {canForceLive && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(devForceDomainLive)}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/20 disabled:opacity-60"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Globe className="h-3.5 w-3.5" />
            )}
            Skip DNS check and go live
          </button>
        )}
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(devResetPayments)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 disabled:opacity-60"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset to unpaid
        </button>
      </div>

      <Notice result={result} />
    </section>
  );
}

export function RevisionForm({
  token,
  placeholder,
}: {
  token: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const [result, setResult] = useState<PortalResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(fd) =>
        startTransition(async () => {
          const res = await requestRevision(token, fd);
          setResult(res);
          if (res.ok) {
            formRef.current?.reset();
            router.refresh();
          }
        })
      }
    >
      <textarea
        name="description"
        rows={4}
        required
        placeholder={placeholder ?? "What would you like changed?"}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-3 text-[15px] text-slate-100 placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
      />
      <button
        type="submit"
        disabled={isPending}
        className="mt-3 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ backgroundColor: ACCENT }}
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquarePlus className="h-4 w-4" />}
        {isPending ? "Sending…" : "Send changes"}
      </button>
      <Notice result={result} />
    </form>
  );
}

export function ApproveButton({ token }: { token: string }) {
  const router = useRouter();
  const [result, setResult] = useState<PortalResult | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      {confirming ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-slate-400">Happy for us to publish it?</span>
          <button
            type="button"
            onClick={() =>
              startTransition(async () => {
                const res = await approveProject(token);
                setConfirming(false);
                if (res.ok) router.replace(`/portal/${token}?done=approved`, { scroll: false });
                else setResult(res);
              })
            }
            disabled={isPending}
            className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: ACCENT }}
          >
            {isPending ? "Approving…" : "Yes, publish it"}
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="text-sm text-slate-400 underline">
            Not yet
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-[15px] font-semibold text-white shadow-lg transition-opacity hover:opacity-90"
          style={{ backgroundColor: ACCENT }}
        >
          <Check className="h-4 w-4" />
          Approve and publish
        </button>
      )}
      <Notice result={result} />
    </div>
  );
}

export function FileUploadZone({ token }: { token: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<PortalResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function send(files: FileList) {
    setResult(null);
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("files", f));
    startTransition(async () => {
      const res = await uploadClientFiles(token, fd);
      setResult(res);
      if (res.ok) router.refresh();
    });
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files?.length) send(e.dataTransfer.files);
        }}
        onClick={() => !isPending && inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
          dragging ? "border-brand-500 bg-brand-500/10" : "border-slate-700 hover:border-slate-600"
        } ${isPending ? "pointer-events-none opacity-60" : ""}`}
      >
        {isPending ? (
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: ACCENT }} />
        ) : (
          <Upload className="h-6 w-6 text-slate-500" />
        )}
        <p className="text-[15px] font-semibold text-slate-200">
          {isPending ? "Uploading…" : "Drop your logo and photos here"}
        </p>
        <p className="text-sm text-slate-500">Or tap to browse. Images or PDF, up to 12MB each.</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,application/pdf"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) send(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      <Notice result={result} />
    </div>
  );
}

/**
 * Lets the client tell us they've finished sending things over, which starts
 * the build. Confirmed in two taps so a stray tap doesn't move the project on.
 */
export function ReadyToBuildButton({ token }: { token: string }) {
  const router = useRouter();
  const [result, setResult] = useState<PortalResult | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      {confirming ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-slate-400">
            Ready for us to start building?
          </span>
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const res = await markReadyToBuild(token);
                setConfirming(false);
                if (res.ok) router.replace(`/portal/${token}?done=started`, { scroll: false });
                else setResult(res);
              })
            }
            className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: ACCENT }}
          >
            {isPending ? "Starting…" : "Yes, get started"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="text-sm text-slate-400 underline"
          >
            Not yet
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-[15px] font-semibold text-white shadow-lg transition-opacity hover:opacity-90"
          style={{ backgroundColor: ACCENT }}
        >
          <Rocket className="h-4 w-4" />
          I&apos;ve sent everything — start building
        </button>
      )}
      <Notice result={result} />
    </div>
  );
}
