"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Search,
  Loader2,
  MapPin,
  Phone,
  Globe,
  GlobeLock,
  Check,
  AlertCircle,
  ExternalLink,
  Plus,
  Building2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { CATEGORY_GROUPS, RADIUS_CHOICES } from "@/lib/places";
import { searchBusinesses, addProspects, type Found, type SearchState } from "@/app/admin/find/actions";

/**
 * Search OpenStreetMap for local businesses, tick the ones worth calling, add
 * them.
 *
 * The list defaults to businesses with no website and hides chains, because
 * that intersection is the only group this business can sell to. Both are one
 * click to undo and both show their counts, so the default narrows the list
 * without hiding that it did.
 */

/** The action caps a single add at this, so the UI never offers more. */
const ADD_LIMIT = 100;

type Filter = "none" | "has" | "all";

function Banner({ tone, children }: { tone: "good" | "bad"; children: React.ReactNode }) {
  return (
    <div
      className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm ${
        tone === "good"
          ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-inset ring-emerald-500/25"
          : "bg-amber-500/10 text-amber-200 ring-1 ring-inset ring-amber-500/25"
      }`}
    >
      {tone === "good" ? (
        <Check className="mt-0.5 h-4 w-4 flex-none" />
      ) : (
        <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
      )}
      <span className="leading-relaxed">{children}</span>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-400">
      <input
        type="checkbox"
        className="h-4 w-4 accent-brand-500"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {children}
    </label>
  );
}

export function BusinessFinder({ defaultWhere }: { defaultWhere: string }) {
  const [where, setWhere] = useState(defaultWhere);
  const [radius, setRadius] = useState(10);
  const [types, setTypes] = useState<string[]>([]);

  const [state, setState] = useState<SearchState | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>("none");
  const [hideChains, setHideChains] = useState(true);
  const [phoneOnly, setPhoneOnly] = useState(false);
  const [added, setAdded] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  const [searching, startSearch] = useTransition();
  const [adding, startAdd] = useTransition();

  // Memoised because the empty-array branch would otherwise be a fresh array
  // on every render, re-running every derived list below for nothing.
  const results = useMemo(() => (state?.ok ? state.businesses : []), [state]);

  // Chains and missing phone numbers are properties of the business, so they
  // narrow the pool the website counts are then taken from. Counting them the
  // other way round would show "40 with no website" and then list nine.
  const pool = useMemo(
    () => results.filter((b) => (!hideChains || !b.isChain) && (!phoneOnly || Boolean(b.phone))),
    [results, hideChains, phoneOnly]
  );

  const counts = useMemo(
    () => ({
      all: pool.length,
      none: pool.filter((b) => !b.website).length,
      has: pool.filter((b) => b.website).length,
    }),
    [pool]
  );

  const shown = useMemo(
    () =>
      pool.filter((b) =>
        filter === "all" ? true : filter === "none" ? !b.website : Boolean(b.website)
      ),
    [pool, filter]
  );

  const selectable = shown.filter((b) => !b.inPipeline);
  const batch = selectable.slice(0, ADD_LIMIT);
  const allSelected = batch.length > 0 && batch.every((b) => picked.has(b.placeId));

  function toggleType(value: string) {
    setTypes((prev) => (prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]));
  }

  function toggle(placeId: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(placeId)) next.delete(placeId);
      else next.add(placeId);
      return next;
    });
  }

  function runSearch() {
    setAdded(null);
    setAddError(null);
    startSearch(async () => {
      const res = await searchBusinesses({ where, radiusMiles: radius, types });
      setState(res);
      setPicked(new Set());
      setFilter("none");
    });
  }

  function addPicked() {
    if (!state?.ok) return;
    const chosen = results.filter((b) => picked.has(b.placeId) && !b.inPipeline).slice(0, ADD_LIMIT);
    if (chosen.length === 0) return;

    setAdded(null);
    setAddError(null);
    startAdd(async () => {
      const res = await addProspects(
        chosen.map(({ inPipeline: _ignored, ...b }) => b),
        state.where
      );
      if (res.error) {
        setAddError(res.error);
        return;
      }
      // Marked in place rather than re-running the search, which would put a
      // second query on a volunteer-run server to redraw a list already on
      // screen.
      const done = new Set(chosen.map((b) => b.placeId));
      setState({
        ...state,
        businesses: state.businesses.map((b) => (done.has(b.placeId) ? { ...b, inPipeline: true } : b)),
      });
      setPicked(new Set());
      setAdded(
        `Added ${res.added} prospect${res.added === 1 ? "" : "s"}.` +
          (res.skipped ? ` ${res.skipped} were already in your pipeline.` : "")
      );
    });
  }

  return (
    <div className="space-y-4">
      {/* --- Search ------------------------------------------------------- */}
      <Card>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Label htmlFor="where">Search around</Label>
              <Input
                id="where"
                value={where}
                onChange={(e) => setWhere(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !searching && types.length > 0) runSearch();
                }}
                placeholder="Olathe, KS or 66062"
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="radius">Within</Label>
              <Select id="radius" value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
                {RADIUS_CHOICES.map((r) => (
                  <option key={r} value={r}>
                    {r} mile{r === 1 ? "" : "s"}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <Label className="mb-0">Kind of business</Label>
              {types.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTypes([])}
                  className="text-xs font-medium text-slate-500 transition-colors hover:text-slate-300"
                >
                  Clear {types.length} selected
                </button>
              )}
            </div>

            <div className="max-h-60 space-y-3 overflow-y-auto rounded-md border border-slate-800 bg-slate-950/50 p-3">
              {CATEGORY_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    {group.label}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.types.map((t) => {
                      const on = types.includes(t.value);
                      return (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => toggleType(t.value)}
                          aria-pressed={on}
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-colors ${
                            on
                              ? "bg-brand-600 text-white ring-brand-600"
                              : "bg-slate-900 text-slate-400 ring-slate-800 hover:bg-slate-800 hover:text-slate-200"
                          }`}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Button onClick={runSearch} disabled={searching || types.length === 0}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {searching ? "Searching…" : "Search"}
            </Button>
            <Toggle checked={hideChains} onChange={setHideChains}>
              Hide chains
            </Toggle>
            <Toggle checked={phoneOnly} onChange={setPhoneOnly}>
              Only with a phone number
            </Toggle>
          </div>

          {state && !state.ok && <Banner tone="bad">{state.error}</Banner>}
        </CardContent>
      </Card>

      {/* --- Results ------------------------------------------------------ */}
      {state?.ok && (
        <Card>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-200">
                  {counts.all} of {state.total} near {state.where}
                </p>
                <p className="text-xs text-slate-500">
                  &ldquo;No website&rdquo; means none is recorded in OpenStreetMap — check the Maps
                  link before you call.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ["none", "No website", counts.none],
                    ["has", "Has a website", counts.has],
                    ["all", "All", counts.all],
                  ] as const
                ).map(([value, label, n]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-colors ${
                      filter === value
                        ? "bg-brand-600 text-white ring-brand-600"
                        : "bg-slate-900 text-slate-400 ring-slate-800 hover:bg-slate-800"
                    }`}
                  >
                    {label} <span className="opacity-70">{n}</span>
                  </button>
                ))}
              </div>
            </div>

            {added && (
              <Banner tone="good">
                {added}{" "}
                <Link href="/admin/prospects" className="underline underline-offset-4">
                  Open the pipeline
                </Link>
                .
              </Banner>
            )}
            {addError && <Banner tone="bad">{addError}</Banner>}

            {shown.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                {state.total === 0
                  ? "Nothing came back. Try a wider radius or more categories."
                  : counts.all === 0
                  ? "Everything here is filtered out. Try turning off a filter above."
                  : filter === "none"
                  ? "Every business here already has a website on record."
                  : "Nothing in this group."}
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3 border-y border-slate-800 py-2">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-400">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-brand-500"
                      checked={allSelected}
                      disabled={batch.length === 0}
                      onChange={() =>
                        setPicked(allSelected ? new Set() : new Set(batch.map((b) => b.placeId)))
                      }
                    />
                    Select {selectable.length > ADD_LIMIT ? `first ${ADD_LIMIT}` : `all ${batch.length}`}
                  </label>
                  <Button size="sm" onClick={addPicked} disabled={adding || picked.size === 0}>
                    {adding ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    Add {picked.size || ""} prospect{picked.size === 1 ? "" : "s"}
                  </Button>
                </div>

                <ul className="divide-y divide-slate-800">
                  {shown.map((b) => (
                    <BusinessRow
                      key={b.placeId}
                      business={b}
                      checked={picked.has(b.placeId)}
                      onToggle={() => toggle(b.placeId)}
                    />
                  ))}
                </ul>
              </>
            )}

            {/* Required by OpenStreetMap's licence wherever its data is shown. */}
            <p className="pt-1 text-xs text-slate-600">
              Business data ©{" "}
              <a
                href="https://www.openstreetmap.org/copyright"
                target="_blank"
                rel="noreferrer"
                className="hover:text-slate-400"
              >
                OpenStreetMap contributors
              </a>
              , available under the Open Database Licence.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function BusinessRow({
  business: b,
  checked,
  onToggle,
}: {
  business: Found;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <li className={`flex gap-3 py-3 ${b.inPipeline ? "opacity-60" : ""}`}>
      <div className="flex-none pt-0.5">
        {b.inPipeline ? (
          <Check className="h-4 w-4 text-emerald-500" aria-label="Already in pipeline" />
        ) : (
          <input
            type="checkbox"
            className="h-4 w-4 accent-brand-500"
            checked={checked}
            onChange={onToggle}
            aria-label={`Add ${b.name}`}
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold text-slate-100">{b.name}</span>
          {b.category && <span className="text-xs text-slate-500">{b.category}</span>}
          {b.inPipeline && (
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-400">
              In pipeline
            </span>
          )}
          {b.isChain && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-400">
              <Building2 className="h-3 w-3" />
              Chain
            </span>
          )}
          {!b.website && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 ring-1 ring-inset ring-emerald-500/25">
              <GlobeLock className="h-3 w-3" />
              No website
            </span>
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          {b.address && (
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin className="h-3 w-3 flex-none" />
              <span className="truncate">{b.address}</span>
            </span>
          )}
          {b.miles != null && <span>{b.miles} mi</span>}
          {b.phone && (
            <a href={`tel:${b.phone}`} className="inline-flex items-center gap-1 hover:text-slate-300">
              <Phone className="h-3 w-3" />
              {b.phone}
            </a>
          )}
          {b.website && (
            <a
              href={b.website}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-w-0 items-center gap-1 hover:text-slate-300"
            >
              <Globe className="h-3 w-3 flex-none" />
              <span className="truncate">{b.website.replace(/^https?:\/\/(www\.)?/, "")}</span>
            </a>
          )}
          {b.mapsUrl && (
            <a
              href={b.mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-slate-300"
            >
              Maps
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </li>
  );
}
