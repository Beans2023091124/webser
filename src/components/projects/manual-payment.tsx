"use client";

import { useState, useTransition } from "react";
import { HandCoins, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { MANUAL_METHODS } from "@/lib/project";

/**
 * Recording a payment that arrived somewhere other than Stripe.
 *
 * Collapsed until asked for. Marking a project paid is the one control on this
 * page that moves it down the pipeline and opens the client's portal up, so it
 * should take a deliberate click rather than sit under the cursor next to the
 * revision box.
 */
export function ManualPaymentForm({
  action,
  defaultAmount,
  label,
  hint,
}: {
  action: (formData: FormData) => Promise<void>;
  defaultAmount: number;
  label: string;
  hint: string;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button variant="outline" size="sm" className="w-full" onClick={() => setOpen(true)}>
        <HandCoins className="h-3.5 w-3.5" />
        {label}
      </Button>
    );
  }

  return (
    <form
      action={action}
      className="space-y-3 rounded-md border border-slate-800 bg-slate-950/50 p-3"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs leading-relaxed text-slate-500">{hint}</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Cancel"
          className="-mr-1 -mt-1 flex-none rounded p-1 text-slate-500 hover:text-slate-300"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="method" className="text-xs">
            How they paid
          </Label>
          <Select id="method" name="method" defaultValue="Venmo">
            {MANUAL_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="amount" className="text-xs">
            Amount received
          </Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0"
            defaultValue={defaultAmount}
            inputMode="decimal"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="reference" className="text-xs">
          Reference <span className="font-normal text-slate-500">(optional)</span>
        </Label>
        <Input
          id="reference"
          name="reference"
          placeholder="@their-handle, check no., confirmation code"
          autoComplete="off"
        />
        <p className="mt-1.5 text-xs text-slate-600">
          Whatever lets you find this payment again in your Venmo or bank history.
        </p>
      </div>

      <SubmitButton size="sm" pendingLabel="Recording…" className="w-full">
        Mark as paid
      </SubmitButton>
    </form>
  );
}

/**
 * Undoes a hand-recorded payment.
 *
 * The server refuses to touch anything without a recorded method, so this can
 * never unpick a real Stripe payment -- but it still asks first, because
 * getting it wrong reopens the client's payment step.
 */
export function ReversePaymentButton({ action }: { action: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1 text-xs text-slate-500 transition-colors hover:text-slate-300"
      >
        <Undo2 className="h-3 w-3" />
        Undo
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 text-xs">
      <span className="text-slate-500">Undo this?</span>
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => action())}
        className="font-semibold text-red-400 hover:text-red-300 disabled:opacity-50"
      >
        {isPending ? "Undoing…" : "Yes"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-slate-500 hover:text-slate-300"
      >
        Cancel
      </button>
    </span>
  );
}
