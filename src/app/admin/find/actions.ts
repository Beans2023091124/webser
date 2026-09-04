"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ProspectStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { geocode, findNearby, KNOWN_TYPES, type Business } from "@/lib/places";

/**
 * Searching Google for local businesses, and turning the ones worth calling
 * into prospects.
 *
 * Both actions are admin-only. Nothing here is reachable from a client portal
 * or a public page -- it spends money on a Google API per call and reads the
 * whole prospect pipeline, so it stays behind the same check as the rest of
 * /admin.
 */

/** A search hit, plus whether it is already in the pipeline. */
export type Found = Business & { inPipeline: boolean };

export type SearchState =
  | { ok: true; where: string; businesses: Found[]; capped: boolean }
  | { ok: false; error: string };

/**
 * Which businesses do we already have?
 *
 * Matched on the Google Maps link first, which is stable for a place even if
 * it is renamed, and on an exact name as a fallback for prospects typed in by
 * hand before this tool existed. Neither is perfect -- a hand-typed "joes
 * plumbing" will not match Google's "Joe's Plumbing" -- so this is a courtesy
 * that stops the obvious duplicates, not a uniqueness guarantee.
 */
async function alreadyHave(businesses: Business[]) {
  const urls = businesses.map((b) => b.mapsUrl).filter((u): u is string => Boolean(u));
  const names = businesses.map((b) => b.name);

  const rows = await prisma.prospect.findMany({
    where: { OR: [{ gmbUrl: { in: urls } }, { businessName: { in: names } }] },
    select: { businessName: true, gmbUrl: true },
  });

  const byUrl = new Set(rows.map((r) => r.gmbUrl).filter(Boolean) as string[]);
  const byName = new Set(rows.map((r) => r.businessName.toLowerCase()));

  return (b: Business) =>
    (b.mapsUrl != null && byUrl.has(b.mapsUrl)) || byName.has(b.name.toLowerCase());
}

const searchSchema = z.object({
  where: z.string().trim().min(1, "Type a town, city or ZIP code to search around.").max(120),
  radiusMiles: z.coerce.number().min(0.5).max(30),
  types: z.array(z.string()).max(20),
  rankBy: z.enum(["POPULARITY", "DISTANCE"]),
});

export async function searchBusinesses(input: {
  where: string;
  radiusMiles: number;
  types: string[];
  rankBy: "POPULARITY" | "DISTANCE";
}): Promise<SearchState> {
  await requireAdmin();

  const parsed = searchSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "That search doesn't look right." };
  }

  const types = parsed.data.types.filter((t) => KNOWN_TYPES.has(t));
  if (types.length === 0) {
    return { ok: false, error: "Pick at least one kind of business to look for." };
  }

  const located = await geocode(parsed.data.where);
  if (!located.ok) return { ok: false, error: located.error };

  const found = await findNearby({
    point: located.point,
    radiusMiles: parsed.data.radiusMiles,
    types,
    rankBy: parsed.data.rankBy,
  });
  if (!found.ok) return { ok: false, error: found.error };

  const have = await alreadyHave(found.businesses);

  return {
    ok: true,
    where: located.point.label,
    capped: found.capped,
    businesses: found.businesses.map((b) => ({ ...b, inPipeline: have(b) })),
  };
}

/**
 * The shape the browser is allowed to send back.
 *
 * Re-validated rather than trusted: the results went out to a client component
 * and came back, so by the time they land here they are ordinary user input
 * that happens to have originated with us.
 */
const pickSchema = z.object({
  placeId: z.string().trim().min(1).max(200),
  name: z.string().trim().min(1).max(200),
  category: z.string().trim().max(100).nullable(),
  address: z.string().trim().max(250).nullable(),
  street: z.string().trim().max(250).nullable(),
  city: z.string().trim().max(100).nullable(),
  state: z.string().trim().max(50).nullable(),
  zip: z.string().trim().max(20).nullable(),
  phone: z.string().trim().max(30).nullable(),
  website: z.string().trim().max(300).nullable(),
  mapsUrl: z.string().trim().max(500).nullable(),
  rating: z.number().nullable(),
  reviews: z.number().int().nullable(),
  miles: z.number().nullable(),
});

export type AddResult = { added: number; skipped: number; error?: string };

/** Everything worth knowing before the first phone call, in the notes field. */
function notesFor(b: z.infer<typeof pickSchema>, where: string): string {
  const lines = [
    b.website ? `Current site: ${b.website}` : "No website listed on Google.",
    b.rating != null && b.reviews
      ? `${b.rating.toFixed(1)} stars from ${b.reviews} Google review${b.reviews === 1 ? "" : "s"}.`
      : "No Google reviews yet.",
  ];
  if (b.miles != null) lines.push(`About ${b.miles} mi from ${where}.`);
  return lines.join("\n");
}

export async function addProspects(picks: unknown[], where: string): Promise<AddResult> {
  const admin = await requireAdmin();

  const parsed = z.array(pickSchema).max(20).safeParse(picks);
  if (!parsed.success) return { added: 0, skipped: 0, error: "That selection didn't come through cleanly." };
  if (parsed.data.length === 0) return { added: 0, skipped: 0, error: "Tick at least one business to add." };

  const origin = String(where ?? "").trim().slice(0, 120);

  // Checked again here rather than relying on the flags the browser was shown.
  // Those were computed when the search ran, and two searches over overlapping
  // areas is the normal way to use this page.
  const have = await alreadyHave(parsed.data as Business[]);

  let added = 0;
  let skipped = 0;

  for (const b of parsed.data) {
    if (have(b as Business)) {
      skipped += 1;
      continue;
    }

    const prospect = await prisma.prospect.create({
      data: {
        businessName: b.name,
        category: b.category,
        phone: b.phone,
        address: b.street ?? b.address,
        city: b.city,
        state: b.state,
        zip: b.zip,
        currentWebsite: b.website,
        gmbUrl: b.mapsUrl,
        notes: notesFor(b, origin || "the search centre"),
        status: ProspectStatus.NEW,
        source: `Google Maps — near ${origin}`.slice(0, 150),
      },
    });

    await prisma.activity.create({
      data: {
        prospectId: prospect.id,
        type: "SYSTEM",
        description: b.website
          ? "Found on Google Maps. Has a website already."
          : "Found on Google Maps with no website listed.",
        createdById: admin.id,
      },
    });

    added += 1;
  }

  revalidatePath("/admin/prospects");
  revalidatePath("/admin/dashboard");

  return { added, skipped };
}
