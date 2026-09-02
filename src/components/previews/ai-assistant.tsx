"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Send, AlertTriangle, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { editPreviewWithAi, type AiTurn, type AiEditResult } from "@/app/admin/previews/ai-actions";

type Entry =
  | { kind: "user"; text: string }
  | { kind: "assistant"; text: string; changed?: string[] }
  | { kind: "error"; text: string; setupHint?: string };

const SUGGESTIONS = [
  "Make the headline punchier",
  "Rewrite the about section to sound more local",
  "Use a darker, more premium color scheme",
  "Add an FAQ about pricing and scheduling",
  "Shorten every service description to one line",
];

export function AiAssistant({ previewId }: { previewId: string }) {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [entries, isPending]);

  function send(text: string) {
    const instruction = text.trim();
    if (!instruction || isPending) return;

    // Only successful exchanges become model context.
    const history: AiTurn[] = entries
      .filter((e): e is Extract<Entry, { kind: "user" | "assistant" }> => e.kind !== "error")
      .map((e) => ({ role: e.kind === "user" ? "user" : "assistant", content: e.text }));

    setEntries((prev) => [...prev, { kind: "user", text: instruction }]);
    setInput("");

    startTransition(async () => {
      const res: AiEditResult = await editPreviewWithAi(previewId, instruction, history);
      setEntries((prev) => [
        ...prev,
        res.ok
          ? { kind: "assistant", text: res.message, changed: res.changed }
          : { kind: "error", text: res.message, setupHint: res.setupHint },
      ]);
      if (res.ok && res.changed && res.changed.length > 0) {
        // Pull the updated values back into the form below.
        router.refresh();
      }
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div
        ref={scrollRef}
        className="max-h-[420px] min-h-[180px] flex-1 space-y-3 overflow-y-auto pr-1"
      >
        {entries.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-400">
              Describe a change in plain English and I'll edit the site. I can rewrite copy, change
              colors and fonts, swap the layout style, or rework the services and FAQ.
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-brand-500 hover:text-brand-300"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {entries.map((e, i) => {
          if (e.kind === "user") {
            return (
              <div key={i} className="flex justify-end">
                <p className="max-w-[85%] rounded-lg rounded-br-sm bg-brand-600 px-3 py-2 text-sm text-white">
                  {e.text}
                </p>
              </div>
            );
          }
          if (e.kind === "error") {
            return (
              <div
                key={i}
                className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-300 ring-1 ring-inset ring-amber-500/30"
              >
                <p className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
                  <span>{e.text}</span>
                </p>
                {e.setupHint && (
                  <code className="mt-2 block rounded bg-slate-950 px-2 py-1.5 text-[11px] text-slate-400">
                    {e.setupHint}
                  </code>
                )}
              </div>
            );
          }
          return (
            <div key={i} className="max-w-[92%] rounded-lg rounded-bl-sm bg-slate-800/70 px-3 py-2">
              <p className="text-sm text-slate-200">{e.text}</p>
              {e.changed && e.changed.length > 0 && (
                <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-emerald-400">
                  <Check className="h-3 w-3" />
                  Updated: {e.changed.join(", ")}
                </p>
              )}
              {e.changed && e.changed.length === 0 && (
                <p className="mt-2 text-[11px] text-slate-500">No fields were changed.</p>
              )}
            </div>
          );
        })}

        {isPending && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Sparkles className="h-4 w-4 animate-pulse text-brand-400" />
            Thinking…
          </div>
        )}
      </div>

      <form
        className="mt-3 flex items-end gap-2 border-t border-slate-800 pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={2}
          placeholder="e.g. Make the hero headline shorter and mention emergency service"
          className="flex-1 resize-none rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        />
        <div className="flex flex-col gap-2">
          <Button type="submit" size="icon" disabled={isPending || !input.trim()} title="Send">
            <Send className="h-4 w-4" />
          </Button>
          {entries.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              title="Clear conversation"
              onClick={() => setEntries([])}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
