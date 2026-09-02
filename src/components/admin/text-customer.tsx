"use client";

import { useState } from "react";
import { MessageSquare, Copy, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { formatUsPhone } from "@/components/ui/phone-input";

export type TextTemplate = { label: string; body: string };

/**
 * Composes a text and hands it to the phone's own Messages app.
 *
 * Deliberately not an SMS API. An `sms:` link sends from the number in your
 * hand, so the message lands in the real thread the customer already has with
 * you, replies come back to your phone as normal, and there's no provider,
 * no per-message cost, and no carrier registration to wait on. The trade is
 * that you tap send yourself — which for a handful of messages a day is the
 * right trade.
 */
export function TextCustomer({
  phone,
  templates,
}: {
  phone: string;
  templates: TextTemplate[];
}) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(0);
  const [body, setBody] = useState(templates[0]?.body ?? "");
  const [copied, setCopied] = useState(false);

  const digits = phone.replace(/[^\d+]/g, "");
  // The `?&body=` form is the one both iOS and Android accept.
  const href = `sms:${digits}?&body=${encodeURIComponent(body)}`;

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <MessageSquare className="h-3.5 w-3.5" />
        Text {formatUsPhone(phone)}
      </Button>
    );
  }

  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/50 p-3">
      <div className="mb-2.5 flex flex-wrap gap-1.5">
        {templates.map((t, i) => (
          <button
            key={t.label}
            type="button"
            onClick={() => {
              setPicked(i);
              setBody(t.body);
            }}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              picked === i
                ? "bg-brand-500/15 text-brand-300 ring-1 ring-inset ring-brand-500/40"
                : "bg-slate-900 text-slate-400 ring-1 ring-inset ring-slate-800 hover:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Textarea
        rows={4}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="text-sm"
      />

      <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-600">
        <span>Sends from your phone, in their existing thread.</span>
        <span className={body.length > 300 ? "text-amber-400" : ""}>{body.length} chars</span>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <a href={href}>
          <Button type="button" size="sm">
            <ExternalLink className="h-3.5 w-3.5" />
            Open Messages
          </Button>
        </a>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            navigator.clipboard?.writeText(body).then(
              () => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
              },
              () => undefined
            );
          }}
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy text"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
        On a phone this opens Messages with the text ready to send. On a desktop it needs a
        messaging app linked to your phone &mdash; otherwise use Copy and paste it there.
      </p>
    </div>
  );
}
