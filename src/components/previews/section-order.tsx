"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, GripVertical, RotateCcw } from "lucide-react";
import {
  PAGE_SECTIONS,
  DEFAULT_SECTION_ORDER,
  orderSections,
  type PageSectionKey,
} from "@/lib/preview";

const META = Object.fromEntries(PAGE_SECTIONS.map((s) => [s.key, s])) as Record<
  PageSectionKey,
  (typeof PAGE_SECTIONS)[number]
>;

/**
 * Reorders the body sections of a site.
 *
 * Up/down buttons rather than drag and drop: they work with a keyboard, they
 * work on a phone, and there are only seven rows to move. The order is mirrored
 * into a hidden input so a submit before hydration still posts something valid.
 */
export function SectionOrder({
  value,
  filled,
}: {
  value: string[] | null | undefined;
  /** Which sections currently have content — the rest are reordered but hidden. */
  filled: Partial<Record<PageSectionKey, boolean>>;
}) {
  const [order, setOrder] = useState<PageSectionKey[]>(() => orderSections(value));

  const isDefault = order.every((k, i) => k === DEFAULT_SECTION_ORDER[i]);

  function move(from: number, to: number) {
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setOrder(next);
  }

  return (
    <div>
      <input type="hidden" name="sectionOrder" value={order.join(",")} readOnly />

      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          The order these appear down the page. The hero always opens and the quote form
          always closes.
        </p>
        {!isDefault && (
          <button
            type="button"
            onClick={() => setOrder([...DEFAULT_SECTION_ORDER])}
            className="inline-flex flex-none items-center gap-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-slate-200"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        )}
      </div>

      <ol className="space-y-2">
        {order.map((key, i) => {
          const meta = META[key];
          const hidden = filled[key] === false;
          return (
            <li
              key={key}
              className="flex items-center gap-3 rounded-md border border-slate-800 bg-slate-950/50 p-2.5 transition-colors hover:border-slate-700"
            >
              <GripVertical className="h-4 w-4 flex-none text-slate-700" aria-hidden />
              <span className="w-5 flex-none text-center text-xs font-semibold tabular-nums text-slate-600">
                {i + 1}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span
                    className={`text-sm font-medium ${hidden ? "text-slate-500" : "text-slate-200"}`}
                  >
                    {meta.label}
                  </span>
                  {hidden && (
                    <span
                      title="Hidden until this section has something in it"
                      className="whitespace-nowrap rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-400"
                    >
                      no content yet
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-slate-500">{meta.hint}</span>
              </span>

              <span className="flex flex-none items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(i, i - 1)}
                  disabled={i === 0}
                  aria-label={`Move ${meta.label} up`}
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-800 sm:h-8 sm:w-8 text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-100 disabled:pointer-events-none disabled:opacity-30"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, i + 1)}
                  disabled={i === order.length - 1}
                  aria-label={`Move ${meta.label} down`}
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-800 sm:h-8 sm:w-8 text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-100 disabled:pointer-events-none disabled:opacity-30"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
