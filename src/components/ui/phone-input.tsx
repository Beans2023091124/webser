"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";

/**
 * A phone field that formats as you type: 9133000258 becomes (913) 300-0258.
 *
 * Anything starting with "+" is left alone — an international number has its
 * own shape and forcing US brackets onto it would be wrong.
 */
export function formatUsPhone(raw: string): string {
  if (raw.trim().startsWith("+")) return raw;

  let digits = raw.replace(/\D/g, "");
  // A leading country code on an 11-digit number isn't part of the display.
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  digits = digits.slice(0, 10);

  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** How many digits sit before this position in the string. */
function digitsBefore(value: string, caret: number): number {
  return value.slice(0, caret).replace(/\D/g, "").length;
}

/** The offset just after the nth digit, so the caret lands where it was. */
function offsetAfterDigits(value: string, count: number): number {
  if (count <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < value.length; i++) {
    if (/\d/.test(value[i])) {
      seen += 1;
      if (seen === count) return i + 1;
    }
  }
  return value.length;
}

/**
 * The formatting behaviour on its own, so a field with bespoke styling (the
 * quote form on a client's site) gets the same typing experience without
 * inheriting the admin input's appearance.
 */
export function usePhoneField(initial?: string | null) {
  const [value, setValue] = React.useState(() => formatUsPhone(initial ?? ""));
  const ref = React.useRef<HTMLInputElement>(null);
  // Where the caret should end up after React re-renders with the new value.
  const caretRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (caretRef.current !== null && ref.current) {
      ref.current.setSelectionRange(caretRef.current, caretRef.current);
      caretRef.current = null;
    }
  });

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.target;
    const caret = el.selectionStart ?? el.value.length;
    const wanted = digitsBefore(el.value, caret);

    const formatted = formatUsPhone(el.value);
    // Backspacing over a separator should take the digit with it, otherwise
    // the formatter puts the character straight back and the key does nothing.
    const next =
      formatted === value && el.value.length < value.length
        ? formatUsPhone(el.value.replace(/\d(?=\D*$)/, ""))
        : formatted;

    caretRef.current = offsetAfterDigits(next, wanted);
    setValue(next);
  };

  return { value, onChange, ref, setValue };
}

export function PhoneInput({
  defaultValue = "",
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "defaultValue"> & {
  defaultValue?: string | null;
}) {
  const { value, onChange, ref } = usePhoneField(defaultValue);

  return (
    <Input
      {...props}
      ref={ref}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      value={value}
      onChange={onChange}
    />
  );
}
