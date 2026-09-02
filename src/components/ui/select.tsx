"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Lives in its own client module because of the wheel handler below.
 *
 * The rest of the form primitives in ./input.tsx are server-safe and stay
 * that way — a Server Component may render a client component, but it may not
 * attach an event handler to a DOM element itself. Keeping only this one on
 * the client keeps the boundary (and the shipped JS) as small as the fix
 * allows.
 */
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, onWheel, ...props }, ref) => {
  return (
    <select
      ref={ref}
      // A focused native <select> changes value on scroll, firing onChange.
      // Since several of these commit immediately (project stage, layout
      // variant), scrolling past one could silently change a client's data.
      // Blurring hands the wheel back to the page.
      onWheel={(e) => {
        (e.currentTarget as HTMLSelectElement).blur();
        onWheel?.(e);
      }}
      className={cn(
        "flex h-9 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-100 shadow-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-brand-500",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});
Select.displayName = "Select";
