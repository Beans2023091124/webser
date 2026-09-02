"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ProjectStatus, RevisionStatus } from "@prisma/client";
import {
  Copy,
  RefreshCw,
  Check,
  Loader2,
  Sparkles,
  AlertTriangle,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/input";
import {
  updateProjectStatus,
  setRevisionStatus,
  rotatePortalToken,
} from "@/app/admin/projects/actions";
import {
  applyRevisionWithAi,
  type ApplyRevisionResult,
} from "@/app/admin/projects/ai-revision-actions";
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS } from "@/lib/project";

export function StatusSelect({ projectId, status }: { projectId: string; status: ProjectStatus }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <Select
        value={status}
        disabled={isPending}
        onChange={(e) =>
          startTransition(async () => {
            await updateProjectStatus(projectId, e.target.value as ProjectStatus);
            router.refresh();
          })
        }
        className="w-56"
      >
        {PROJECT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {PROJECT_STATUS_LABELS[s]}
          </option>
        ))}
      </Select>
      {isPending && <Loader2 className="h-4 w-4 animate-spin text-slate-500" />}
    </div>
  );
}

/**
 * The one move that actually matters at each stage, as a button.
 *
 * The Stage dropdown can reach any status, but the common case is "I've
 * finished this bit, push it forward" — and hunting for the right option in a
 * ten-item list to do that is both slower and easier to get wrong.
 */
const NEXT_STEP: Partial<
  Record<ProjectStatus, { next: ProjectStatus; label: string; hint: string }>
> = {
  INFORMATION_NEEDED: {
    next: "IN_DEVELOPMENT",
    label: "Start building",
    hint: "Use this if you have what you need and don't want to wait for the client to press their button.",
  },
  IN_DEVELOPMENT: {
    next: "FINAL_REVIEW",
    label: "Send for final review",
    hint: "Shows the client the site and asks them to approve it. Nothing publishes until they do.",
  },
  REVISION_REQUESTED: {
    next: "FINAL_REVIEW",
    label: "Changes done — send back for review",
    hint: "Puts the site back in front of the client with your changes applied.",
  },
  FINAL_REVIEW: {
    next: "APPROVED",
    label: "Approve on their behalf",
    hint: "Only if they've told you elsewhere. Normally the client approves from their portal.",
  },
  APPROVED: {
    next: "LIVE",
    label: "Mark as live",
    hint: "Use this once the site is published. The client normally reaches Live themselves by connecting their domain.",
  },
  DEPLOYING: {
    next: "LIVE",
    label: "Mark as live",
    hint: "Their domain is working and the site is up.",
  },
};

export function StageActionButton({
  projectId,
  status,
}: {
  projectId: string;
  status: ProjectStatus;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const step = NEXT_STEP[status];

  if (!step) return null;

  return (
    <div className="mt-3 rounded-md border border-slate-800 bg-slate-950/50 p-3">
      <Button
        type="button"
        size="sm"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await updateProjectStatus(projectId, step.next);
            router.refresh();
          })
        }
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <ArrowRight className="h-3.5 w-3.5" />
        )}
        {step.label}
      </Button>
      <p className="mt-2 text-xs text-slate-500">{step.hint}</p>
    </div>
  );
}

export function RevisionToggle({
  revisionId,
  status,
}: {
  revisionId: string;
  status: RevisionStatus;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const next: RevisionStatus =
    status === "OPEN" ? "IN_PROGRESS" : status === "IN_PROGRESS" ? "DONE" : "OPEN";
  const label = status === "OPEN" ? "Start" : status === "IN_PROGRESS" ? "Mark done" : "Reopen";

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await setRevisionStatus(revisionId, next);
          router.refresh();
        })
      }
    >
      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
      {label}
    </Button>
  );
}

export function PortalLink({ projectId, token }: { projectId: string; token: string }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  const url = typeof window !== "undefined" ? `${window.location.origin}/portal/${token}` : `/portal/${token}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-800 bg-slate-950 px-3 py-2.5">
        <code className="min-w-0 flex-1 truncate text-xs text-brand-400">/portal/{token}</code>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            navigator.clipboard.writeText(url).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            })
          }
        >
          <Copy className="h-3.5 w-3.5" /> {copied ? "Copied!" : "Copy"}
        </Button>
      </div>

      <p className="text-xs text-slate-500">
        Anyone with this link can see and pay for the project — there is no password. Send it
        directly to the client.
      </p>

      {confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400">
            The old link stops working immediately. Continue?
          </span>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await rotatePortalToken(projectId);
                setConfirming(false);
                router.refresh();
              })
            }
          >
            {isPending ? "Generating…" : "Yes, replace it"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => setConfirming(true)}>
          <RefreshCw className="h-3.5 w-3.5" /> Generate a new link
        </Button>
      )}
    </div>
  );
}

/**
 * Runs a client's change request through the AI editor.
 *
 * Shows exactly which fields were touched so the admin can spot-check rather
 * than trust it blindly.
 */
export function ApplyWithAiButton({
  revisionId,
  previewSlug,
}: {
  revisionId: string;
  previewSlug?: string | null;
}) {
  const router = useRouter();
  const [result, setResult] = useState<ApplyRevisionResult | null>(null);
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setShowNote((v) => !v)}
          className="text-xs text-slate-500 underline underline-offset-2 hover:text-slate-300"
        >
          {showNote ? "Hide direction" : note.trim() ? "Edit direction" : "Add direction"}
        </button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const res = await applyRevisionWithAi(revisionId, note.trim() || undefined);
              setResult(res);
              if (res.ok) router.refresh();
            })
          }
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 text-brand-400" />
          )}
          {isPending ? "Applying…" : "Apply with AI"}
        </Button>
      </div>

      {showNote && (
        <div className="mt-2">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Anything the AI should know — e.g. keep the tagline as it is, use the second gallery photo for the hero, don't touch the pricing."
            className="text-xs"
          />
          <p className="mt-1 text-[11px] text-slate-600">
            Your direction is followed over the customer&apos;s wording where the two disagree.
          </p>
        </div>
      )}

      {result && (
        <div
          className={`mt-2 rounded-md px-3 py-2 text-xs ring-1 ring-inset ${
            result.ok
              ? "bg-slate-800/70 text-slate-300 ring-slate-700"
              : "bg-amber-500/10 text-amber-300 ring-amber-500/30"
          }`}
        >
          <p className="flex items-start gap-1.5">
            {result.ok ? (
              <Sparkles className="mt-0.5 h-3 w-3 flex-none text-brand-400" />
            ) : (
              <AlertTriangle className="mt-0.5 h-3 w-3 flex-none" />
            )}
            <span>{result.message}</span>
          </p>

          {result.setupHint && (
            <code className="mt-1.5 block rounded bg-slate-950 px-2 py-1 text-[10px] text-slate-400">
              {result.setupHint}
            </code>
          )}

          {result.ok && result.changed && result.changed.length > 0 && (
            <p className="mt-1.5 flex flex-wrap items-center gap-1 text-emerald-400">
              <Check className="h-3 w-3" />
              Updated: {result.changed.join(", ")}
              {previewSlug && (
                <a
                  href={`/p/${previewSlug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-1 inline-flex items-center gap-0.5 text-brand-400 hover:text-brand-300"
                >
                  view <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
            </p>
          )}

          {result.ok && result.changed && result.changed.length === 0 && (
            <p className="mt-1.5 text-slate-500">
              Nothing was changed automatically — this one needs doing by hand.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
