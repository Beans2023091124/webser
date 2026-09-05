/**
 * Finding local businesses to sell websites to.
 *
 * Runs entirely on OpenStreetMap, which costs nothing and needs no key, no
 * signup and no card:
 *
 *   Nominatim  turns "Olathe, KS" or "66062" into a point
 *   Overpass   returns every mapped business inside a circle around it
 *
 * What that buys and what it costs, measured against a 10-mile circle around
 * Olathe rather than guessed: 976 named businesses, 574 of them independent,
 * 301 of those with no website recorded. Storefront trades are covered well
 * (318 restaurants, 51 auto repair, 46 dentists, 43 salons). Businesses that
 * work out of a van are barely mapped at all -- five plumbers and three
 * electricians in a whole metro -- because OSM is drawn by volunteers who map
 * what they can see from the street.
 *
 * The other honest limit is the website signal. A missing `website` tag means
 * nobody recorded one, not that none exists, so "no website" here is a
 * shortlist to check rather than a verified fact. Every result carries a
 * Google Maps search link for exactly that reason: one click confirms it
 * against the real listing, and the link is just a URL, so it stays free.
 *
 * Both services are volunteer-funded. Keep the request rate low, send a real
 * User-Agent, and never loop.
 */

const NOMINATIM = "https://nominatim.openstreetmap.org/search";

/**
 * Overpass mirrors, tried in order. The main instance sheds load by returning
 * 429 or 504 rather than queueing, so a second mirror is the difference
 * between "busy, try later" and a search that just works.
 */
const OVERPASS = (process.env.OVERPASS_ENDPOINTS?.trim() || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .concat([
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ]);

/** Both services ask for a real one, and block generic clients. */
const UA = "Webser/1.0 (local business prospecting; +https://webser.org)";

export const METERS_PER_MILE = 1609.344;

/** Radii offered in the UI. Past 25 miles Overpass starts timing out. */
export const RADIUS_CHOICES = [1, 2, 3, 5, 10, 15, 20, 25] as const;

/** Rendering every hit in a dense metro is pointless; the count is reported honestly. */
const MAX_RESULTS = 300;

/**
 * Categories, mapped to the OSM tags that actually carry US businesses.
 *
 * OSM has no flat type list -- a business is described by a key/value pair,
 * and which key depends on what kind of thing it is: `shop` for retail,
 * `craft` for trades, `office` for professions, `amenity` for most of the
 * rest. Several categories therefore need more than one selector.
 *
 * Every value below was checked against live Overpass results rather than the
 * wiki, because the wiki documents plenty of tags that nobody uses.
 */
export const CATEGORY_GROUPS: {
  label: string;
  types: { value: string; label: string; selectors: string[] }[];
}[] = [
  {
    label: "Food & drink",
    types: [
      { value: "restaurant", label: "Restaurants", selectors: ["amenity=restaurant"] },
      { value: "fast_food", label: "Fast food", selectors: ["amenity=fast_food"] },
      { value: "cafe", label: "Cafes", selectors: ["amenity=cafe"] },
      { value: "bar", label: "Bars & pubs", selectors: ["amenity=bar", "amenity=pub"] },
      { value: "bakery", label: "Bakeries", selectors: ["shop=bakery", "shop=pastry"] },
      { value: "deli", label: "Delis", selectors: ["shop=deli"] },
      { value: "butcher", label: "Butchers", selectors: ["shop=butcher"] },
      { value: "brewery", label: "Breweries", selectors: ["craft=brewery"] },
      { value: "ice_cream", label: "Ice cream", selectors: ["amenity=ice_cream"] },
      { value: "caterer", label: "Caterers", selectors: ["craft=caterer"] },
    ],
  },
  {
    label: "Beauty & wellness",
    types: [
      { value: "hairdresser", label: "Hair & barbers", selectors: ["shop=hairdresser"] },
      { value: "beauty", label: "Beauty & nails", selectors: ["shop=beauty"] },
      { value: "massage", label: "Massage", selectors: ["shop=massage"] },
      { value: "spa", label: "Spas", selectors: ["leisure=spa"] },
      { value: "tattoo", label: "Tattoo studios", selectors: ["shop=tattoo"] },
      { value: "optician", label: "Opticians", selectors: ["shop=optician"] },
    ],
  },
  {
    label: "Health",
    types: [
      { value: "dentist", label: "Dentists", selectors: ["amenity=dentist"] },
      { value: "doctors", label: "Clinics", selectors: ["amenity=doctors"] },
      { value: "veterinary", label: "Vets", selectors: ["amenity=veterinary"] },
      { value: "chiropractor", label: "Chiropractors", selectors: ["healthcare=chiropractor"] },
      { value: "physiotherapist", label: "Physiotherapists", selectors: ["healthcare=physiotherapist"] },
      { value: "pharmacy", label: "Pharmacies", selectors: ["amenity=pharmacy"] },
    ],
  },
  {
    label: "Trades & home",
    types: [
      { value: "plumber", label: "Plumbers", selectors: ["craft=plumber"] },
      { value: "electrician", label: "Electricians", selectors: ["craft=electrician"] },
      { value: "roofer", label: "Roofers", selectors: ["craft=roofer"] },
      { value: "hvac", label: "HVAC", selectors: ["craft=hvac"] },
      { value: "painter", label: "Painters", selectors: ["craft=painter"] },
      { value: "carpenter", label: "Carpenters", selectors: ["craft=carpenter"] },
      { value: "builder", label: "Builders", selectors: ["craft=builder"] },
      { value: "gardener", label: "Landscapers", selectors: ["craft=gardener"] },
      { value: "locksmith", label: "Locksmiths", selectors: ["craft=locksmith", "shop=locksmith"] },
      { value: "cleaner", label: "Cleaners", selectors: ["craft=cleaner", "shop=dry_cleaning"] },
    ],
  },
  {
    label: "Automotive",
    types: [
      { value: "car_repair", label: "Auto repair", selectors: ["shop=car_repair"] },
      { value: "car_wash", label: "Car washes", selectors: ["amenity=car_wash"] },
      { value: "tyres", label: "Tire shops", selectors: ["shop=tyres"] },
      { value: "car", label: "Car dealers", selectors: ["shop=car"] },
      { value: "motorcycle", label: "Motorcycle", selectors: ["shop=motorcycle"] },
    ],
  },
  {
    label: "Professional",
    types: [
      { value: "lawyer", label: "Lawyers", selectors: ["office=lawyer"] },
      { value: "accountant", label: "Accountants", selectors: ["office=accountant"] },
      { value: "insurance", label: "Insurance", selectors: ["office=insurance"] },
      { value: "estate_agent", label: "Real estate", selectors: ["office=estate_agent"] },
      { value: "financial", label: "Financial advisors", selectors: ["office=financial"] },
      { value: "employment_agency", label: "Staffing", selectors: ["office=employment_agency"] },
      { value: "travel_agent", label: "Travel agents", selectors: ["office=travel_agent"] },
      { value: "funeral", label: "Funeral homes", selectors: ["shop=funeral_directors"] },
      { value: "childcare", label: "Childcare", selectors: ["amenity=childcare"] },
    ],
  },
  {
    label: "Fitness & leisure",
    types: [
      { value: "fitness_centre", label: "Gyms", selectors: ["leisure=fitness_centre"] },
      { value: "sports_centre", label: "Sports centers", selectors: ["leisure=sports_centre"] },
      { value: "hotel", label: "Hotels & motels", selectors: ["tourism=hotel", "tourism=motel"] },
      { value: "guest_house", label: "B&Bs", selectors: ["tourism=guest_house"] },
    ],
  },
  {
    label: "Shops & pets",
    types: [
      { value: "florist", label: "Florists", selectors: ["shop=florist"] },
      { value: "jewelry", label: "Jewelers", selectors: ["shop=jewelry"] },
      { value: "clothes", label: "Clothing", selectors: ["shop=clothes"] },
      { value: "furniture", label: "Furniture", selectors: ["shop=furniture"] },
      { value: "hardware", label: "Hardware", selectors: ["shop=hardware", "shop=doityourself"] },
      { value: "pet", label: "Pet stores", selectors: ["shop=pet"] },
      { value: "pet_grooming", label: "Pet grooming", selectors: ["shop=pet_grooming"] },
      { value: "laundry", label: "Laundry", selectors: ["shop=laundry"] },
      { value: "tailor", label: "Tailors", selectors: ["shop=tailor", "craft=tailor"] },
      { value: "photographer", label: "Photographers", selectors: ["craft=photographer"] },
      { value: "copyshop", label: "Print shops", selectors: ["shop=copyshop"] },
    ],
  },
];

const BY_VALUE = new Map(
  CATEGORY_GROUPS.flatMap((g) => g.types).map((t) => [t.value, t])
);

/** Every category the picker can produce. Anything else is dropped before it is queried. */
export const KNOWN_TYPES: ReadonlySet<string> = new Set(BY_VALUE.keys());

export type Point = { lat: number; lng: number; label: string };

export type Business = {
  /** OSM element reference, e.g. "node/1234". Used as a list key only. */
  placeId: string;
  name: string;
  category: string | null;
  address: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  website: string | null;
  /** A Google Maps search link, built from the name and address. Not an API call. */
  mapsUrl: string | null;
  /** OSM records a brand for chains and franchises, which are not worth calling. */
  isChain: boolean;
  miles: number | null;
};

type Ok<T> = { ok: true } & T;
type Err = { ok: false; error: string };

function milesBetween(from: Point, lat: number, lng: number): number {
  const R = 3958.7613;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat - from.lat);
  const dLng = toRad(lng - from.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Turn what the owner typed into a point to search around. */
export async function geocode(query: string): Promise<Ok<{ point: Point }> | Err> {
  const q = query.trim();
  if (!q) return { ok: false, error: "Type a town, city or ZIP code to search around." };

  const country = process.env.OSM_COUNTRY_CODES?.trim() || "us";
  const url =
    `${NOMINATIM}?q=${encodeURIComponent(q)}&format=jsonv2&limit=1` +
    `&countrycodes=${encodeURIComponent(country)}`;

  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": UA, Accept: "application/json" },
    });

    if (!res.ok) {
      console.error("[places] nominatim", res.status);
      return { ok: false, error: "The location lookup is busy. Try again in a few seconds." };
    }

    const rows = (await res.json()) as { lat?: string; lon?: string; display_name?: string }[];
    const first = rows?.[0];
    if (!first?.lat || !first?.lon) {
      return { ok: false, error: `We couldn't find "${q}". Try a city and state, or a ZIP code.` };
    }

    return {
      ok: true,
      point: {
        lat: Number(first.lat),
        lng: Number(first.lon),
        // Nominatim returns the full postal chain; the first three parts are
        // enough to confirm it found the right town.
        label: (first.display_name ?? q).split(",").slice(0, 3).join(",").trim(),
      },
    };
  } catch (e) {
    console.error("[places] nominatim error", e);
    return { ok: false, error: "Couldn't reach OpenStreetMap to look that location up." };
  }
}

/**
 * Build one Overpass query for every selected category.
 *
 * Selectors are grouped by their key so each key becomes a single statement
 * with a regex alternation, rather than one statement per category. A search
 * for twenty categories is then four statements instead of twenty, which is
 * the difference between a fast query and a timeout on a shared instance.
 *
 * `nwr` covers nodes, ways and relations at once -- a business can be mapped
 * as any of the three, and asking for only nodes silently drops every shop
 * someone drew as a building outline.
 */
function buildQuery(point: Point, radiusMeters: number, types: string[]): string {
  const byKey = new Map<string, Set<string>>();
  for (const t of types) {
    for (const sel of BY_VALUE.get(t)?.selectors ?? []) {
      const [key, value] = sel.split("=");
      if (!key || !value) continue;
      if (!byKey.has(key)) byKey.set(key, new Set());
      byKey.get(key)!.add(value);
    }
  }

  const at = `around:${Math.round(radiusMeters)},${point.lat},${point.lng}`;
  const statements = [...byKey.entries()].map(
    ([key, values]) =>
      `  nwr(${at})["${key}"~"^(${[...values].join("|")})$"]["name"];`
  );

  // `out center tags` gives a single coordinate for ways and relations too,
  // so everything downstream can treat all three element types alike.
  return `[out:json][timeout:60];\n(\n${statements.join("\n")}\n);\nout center tags;`;
}

type Element = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

/**
 * US state from a ZIP code.
 *
 * OSM records `addr:city` and `addr:postcode` on most businesses and
 * `addr:state` on almost none, which would leave every prospect saved from
 * here with a blank state. ZIP ranges are assigned by state, so the state is
 * recoverable without another lookup.
 *
 * Approximate at the edges -- a handful of ZIPs sit outside their state's main
 * block -- which is fine for a field used to sort a call list. The one that
 * matters locally is exact: Kansas is 660-679 and Missouri 630-658, so the
 * state line running through Kansas City lands on the right side.
 */
const ZIP_RANGES: [number, number, string][] = [
  [1000, 2799, "MA"], [2800, 2999, "RI"], [3000, 3899, "NH"], [3900, 4999, "ME"],
  [5000, 5999, "VT"], [6000, 6999, "CT"], [7000, 8999, "NJ"], [10000, 14999, "NY"],
  [15000, 19699, "PA"], [19700, 19999, "DE"], [20000, 20599, "DC"], [20600, 21999, "MD"],
  [22000, 24699, "VA"], [24700, 26899, "WV"], [27000, 28999, "NC"], [29000, 29999, "SC"],
  [30000, 31999, "GA"], [32000, 34999, "FL"], [35000, 36999, "AL"], [37000, 38599, "TN"],
  [38600, 39799, "MS"], [39800, 39999, "GA"], [40000, 42799, "KY"], [43000, 45999, "OH"],
  [46000, 47999, "IN"], [48000, 49999, "MI"], [50000, 52899, "IA"], [53000, 54999, "WI"],
  [55000, 56799, "MN"], [57000, 57799, "SD"], [58000, 58899, "ND"], [59000, 59999, "MT"],
  [60000, 62999, "IL"], [63000, 65899, "MO"], [66000, 67999, "KS"], [68000, 69399, "NE"],
  [70000, 71499, "LA"], [71600, 72999, "AR"], [73000, 74999, "OK"], [75000, 79999, "TX"],
  [80000, 81699, "CO"], [82000, 83199, "WY"], [83200, 83899, "ID"], [84000, 84799, "UT"],
  [85000, 86599, "AZ"], [87000, 88499, "NM"], [88900, 89899, "NV"], [90000, 96199, "CA"],
  [96700, 96899, "HI"], [97000, 97999, "OR"], [98000, 99499, "WA"], [99500, 99999, "AK"],
];

function stateFromZip(zip: string | null): string | null {
  if (!zip) return null;
  const n = Number(zip.trim().slice(0, 5));
  if (!Number.isInteger(n)) return null;
  return ZIP_RANGES.find(([lo, hi]) => n >= lo && n <= hi)?.[2] ?? null;
}

function firstTag(tags: Record<string, string>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = tags[k]?.trim();
    if (v) return v;
  }
  return null;
}

/** A link to the real Google listing. Just a URL -- no API, no key, no cost. */
function mapsSearchUrl(name: string, address: string | null): string {
  const q = [name, address].filter(Boolean).join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/** The human label for whichever tag matched, e.g. "Hair & barbers". */
function categoryOf(tags: Record<string, string>): string | null {
  for (const [key, value] of Object.entries(tags)) {
    for (const t of BY_VALUE.values()) {
      if (t.selectors.includes(`${key}=${value}`)) return t.label;
    }
  }
  return null;
}

async function askOverpass(body: string): Promise<Ok<{ elements: Element[] }> | Err> {
  let lastError = "The business search is busy. Try again in a minute.";

  for (const endpoint of OVERPASS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "text/plain", "User-Agent": UA },
        body,
      });

      // 429 is the rate limiter and 504 is the load shedder. Both mean "this
      // mirror, right now" rather than "this query", so the next one is worth
      // trying; anything else is a real failure and stops here.
      if (res.status === 429 || res.status === 504) {
        lastError = "OpenStreetMap's search servers are busy. Try again in a minute.";
        continue;
      }
      if (!res.ok) {
        console.error("[places] overpass", endpoint, res.status);
        return { ok: false, error: "The business search failed. Try again." };
      }

      const json = (await res.json()) as { elements?: Element[] };
      return { ok: true, elements: json.elements ?? [] };
    } catch (e) {
      console.error("[places] overpass error", endpoint, e);
      lastError = "Couldn't reach OpenStreetMap to run that search.";
    }
  }

  return { ok: false, error: lastError };
}

/**
 * Businesses of the given categories inside a circle.
 *
 * Unlike a commercial API there is no page limit, so a dense metro can return
 * a thousand rows. `total` is the true count and the list is trimmed to the
 * nearest few hundred, rather than quietly returning a page and letting the
 * owner believe they had seen a town out.
 */
export async function findNearby(opts: {
  point: Point;
  radiusMiles: number;
  types: string[];
}): Promise<Ok<{ businesses: Business[]; total: number }> | Err> {
  const types = opts.types.filter((t) => KNOWN_TYPES.has(t));
  if (types.length === 0) return { ok: true, businesses: [], total: 0 };

  const radius = Math.max(opts.radiusMiles, 0.5) * METERS_PER_MILE;
  const res = await askOverpass(buildQuery(opts.point, radius, types));
  if (!res.ok) return res;

  const seen = new Set<string>();
  const all: Business[] = [];

  for (const el of res.elements) {
    const tags = el.tags;
    const name = tags?.name?.trim();
    if (!tags || !name) continue;

    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;

    // The same business is often mapped twice -- once as a point inside the
    // shop and once as the building outline around it. Keyed on the name and
    // a ~100m grid square, which merges those without merging two genuine
    // branches of one business in the same town.
    const key =
      lat != null && lon != null
        ? `${name.toLowerCase()}@${lat.toFixed(3)},${lon.toFixed(3)}`
        : name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const street = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ") || null;
    const city = firstTag(tags, "addr:city");
    const zip = firstTag(tags, "addr:postcode");
    const state = firstTag(tags, "addr:state") ?? stateFromZip(zip);
    const address = [street, city, [state, zip].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(", ") || null;

    all.push({
      placeId: `${el.type}/${el.id}`,
      name,
      category: categoryOf(tags),
      address,
      street,
      city,
      state,
      zip,
      phone: firstTag(tags, "phone", "contact:phone", "contact:mobile"),
      website: firstTag(tags, "website", "contact:website", "url"),
      mapsUrl: mapsSearchUrl(name, address),
      isChain: Boolean(tags.brand || tags["brand:wikidata"]),
      miles:
        lat != null && lon != null
          ? Math.round(milesBetween(opts.point, lat, lon) * 10) / 10
          : null,
    });
  }

  all.sort((a, b) => (a.miles ?? Infinity) - (b.miles ?? Infinity));

  return { ok: true, businesses: all.slice(0, MAX_RESULTS), total: all.length };
}
