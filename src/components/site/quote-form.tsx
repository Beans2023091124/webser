"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Check } from "lucide-react";
import { usePhoneField } from "@/components/ui/phone-input";
import { submitLead, type LeadResult } from "@/app/p/[slug]/actions";

type Theme = {
  primary: string;
  onLight: boolean;
  /** Field background on light surfaces — keeps inputs from glaring white. */
  field?: string;
  border?: string;
};

function SubmitButton({ label, primary }: { label: string; primary: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md px-6 py-3.5 text-[15px] font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
      style={{ backgroundColor: primary }}
    >
      {pending ? "Sending…" : label}
    </button>
  );
}

export function QuoteForm({
  previewId,
  services,
  ctaText,
  theme,
  serviceLabel = "What do you need?",
  messageLabel = "Tell us about the job",
  note = "We'll never share your information.",
  showService = true,
  showMessage = true,
  requireEmail = false,
}: {
  previewId: string;
  services: string[];
  ctaText: string;
  theme: Theme;
  serviceLabel?: string;
  messageLabel?: string;
  note?: string;
  showService?: boolean;
  showMessage?: boolean;
  requireEmail?: boolean;
}) {
  const [state, formAction] = useFormState<LeadResult | null, FormData>(submitLead, null);
  const phone = usePhoneField();

  const fieldBase = theme.onLight
    ? "w-full rounded-md border px-3.5 py-3 text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2"
    : "w-full rounded-md border border-white/20 bg-white/10 px-3.5 py-3 text-[15px] text-white placeholder:text-white/50 focus:outline-none focus:ring-2";

  const fieldStyle: React.CSSProperties = theme.onLight
    ? {
        backgroundColor: theme.field ?? "#ffffff",
        borderColor: theme.border ?? "#cbd5e1",
        ["--tw-ring-color" as string]: theme.primary,
      }
    : { ["--tw-ring-color" as string]: theme.primary };

  const labelBase = theme.onLight
    ? "mb-1.5 block text-sm font-medium text-slate-700"
    : "mb-1.5 block text-sm font-medium text-white/80";

  if (state?.ok) {
    return (
      <div
        className={`rounded-lg p-8 text-center ${
          theme.onLight ? "bg-white ring-1 ring-slate-200" : "bg-white/10 ring-1 ring-white/20"
        }`}
      >
        <div
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
          style={{ backgroundColor: `${theme.primary}1f`, color: theme.primary }}
        >
          <Check className="h-6 w-6" strokeWidth={2.5} />
        </div>
        <p className={`text-lg font-semibold ${theme.onLight ? "text-slate-900" : "text-white"}`}>
          Thanks — we got it.
        </p>
        <p className={`mt-2 text-sm ${theme.onLight ? "text-slate-600" : "text-white/70"}`}>
          We&apos;ll get back to you shortly. If it&apos;s urgent, give us a call and we&apos;ll pick up.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="previewId" value={previewId} />

      <div>
        <label htmlFor="lead-name" className={labelBase}>
          Name
        </label>
        <input
          id="lead-name"
          name="name"
          required
          placeholder="Your name"
          className={fieldBase}
          style={fieldStyle}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="lead-phone" className={labelBase}>
            Phone
          </label>
          <input
            id="lead-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(913) 555-0100"
            className={fieldBase}
            style={fieldStyle}
            ref={phone.ref}
            value={phone.value}
            onChange={phone.onChange}
          />
        </div>
        <div>
          <label htmlFor="lead-email" className={labelBase}>
            Email{requireEmail ? "" : " (optional)"}
          </label>
          <input
            id="lead-email"
            name="email"
            type="email"
            required={requireEmail}
            placeholder="you@example.com"
            className={fieldBase}
            style={fieldStyle}
          />
        </div>
      </div>

      {showService && services.length > 0 && (
        <div>
          <label htmlFor="lead-service" className={labelBase}>
            {serviceLabel}
          </label>
          <select
            id="lead-service"
            name="service"
            className={fieldBase}
            style={fieldStyle}
          >
            <option value="">Select one…</option>
            {services.map((s) => (
              <option key={s} value={s} className="text-slate-900">
                {s}
              </option>
            ))}
            <option value="Something else" className="text-slate-900">
              Something else
            </option>
          </select>
        </div>
      )}

      {showMessage && (
        <div>
          <label htmlFor="lead-message" className={labelBase}>
            {messageLabel}
          </label>
          <textarea
            id="lead-message"
            name="message"
            rows={4}
            placeholder="A short description helps us give you an accurate price."
            className={fieldBase}
            style={fieldStyle}
          />
        </div>
      )}

      {state?.error && (
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-500 ring-1 ring-red-500/30">{state.error}</p>
      )}

      <SubmitButton label={ctaText} primary={theme.primary} />

      {note && (
        <p className={`text-center text-xs ${theme.onLight ? "text-slate-500" : "text-white/50"}`}>
          {note}
        </p>
      )}
    </form>
  );
}
