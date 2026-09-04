/**
 * Finding local businesses to sell websites to.
 *
 * Two Google APIs, both driven by one key:
 *
 *   Geocoding API    turns "Olathe, KS" or "66062" into a point
 *   Places API (New) returns the businesses inside a circle around that point
 *
 * The field mask is the part worth understanding. Google prices a Places call
 * at the most expensive tier any requested field belongs to: `formattedAddress`
 * and `location` are Essentials, `displayName` and `googleMapsUri` are Pro, and
 * `websiteUri`, `nationalPhoneNumber` and `rating` are Enterprise. Asking for
 * `websiteUri` therefore prices the whole call at Enterprise -- which is worth
 * paying here and nowhere else, because "this business has no website" is the
 * entire qualifying signal for what we sell. Once a call is already at that
 * tier the cheaper fields are free to add, so the mask below is deliberately
 * generous within the tier it has already committed to.
 */

const NEARBY = "https://places.googleapis.com/v1/places:searchNearby";
const GEOCODE = "https://maps.googleapis.com/maps/api/geocode/json";

/** Nearby Search caps the circle at 50km and a single page at 20 places. */
export const MAX_RADIUS_METERS = 50_000;
export const MAX_RESULTS = 20;
export const METERS_PER_MILE = 1609.344;

/** Radii offered in the UI. The last one is close to the API's 50km ceiling. */
export const RADIUS_CHOICES = [1, 2, 3, 5, 10, 15, 20, 25, 30] as const;

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.addressComponents",
  "places.location",
  "places.types",
  "places.primaryTypeDisplayName",
  "places.googleMapsUri",
  "places.businessStatus",
  "places.websiteUri",
  "places.nationalPhoneNumber",
  "places.rating",
  "places.userRatingCount",
].join(",");

function key(): string {
  return process.env.GOOGLE_MAPS_API_KEY?.trim() ?? "";
}

/** False until a Google Maps key is set, which the page reports rather than failing. */
export function placesConfigured(): boolean {
  return Boolean(key());
}

function region(): string {
  return process.env.GOOGLE_GEOCODE_COUNTRY?.trim() || "US";
}

/**
 * Category groups shown in the picker.
 *
 * Every string here is a Table A place type from the Places API. An unknown
 * type makes Google reject the whole request with a 400, so this list is not a
 * place to guess: `general_contractor`, `hvac` and `landscaping` all read like
 * they should exist and none of them do, which is why the trades group is
 * shorter than you would expect.
 *
 * The selection is deliberately narrow -- local businesses that sell to
 * consumers and plausibly answer their own phone. Hospitals, airports, chains
 * and civic buildings are all valid types and all a waste of a call.
 */
export const CATEGORY_GROUPS: { label: string; types: { value: string; label: string }[] }[] = [
  {
    label: "Trades & home",
    types: [
      { value: "plumber", label: "Plumbers" },
      { value: "electrician", label: "Electricians" },
      { value: "roofing_contractor", label: "Roofers" },
      { value: "painter", label: "Painters" },
      { value: "locksmith", label: "Locksmiths" },
      { value: "moving_company", label: "Movers" },
      { value: "storage", label: "Storage" },
      { value: "laundry", label: "Laundry" },
      { value: "tailor", label: "Tailors" },
    ],
  },
  {
    label: "Food & drink",
    types: [
      { value: "restaurant", label: "Restaurants" },
      { value: "cafe", label: "Cafes" },
      { value: "coffee_shop", label: "Coffee shops" },
      { value: "bakery", label: "Bakeries" },
      { value: "deli", label: "Delis" },
      { value: "pizza_restaurant", label: "Pizzerias" },
      { value: "bar", label: "Bars" },
      { value: "pub", label: "Pubs" },
      { value: "brewery", label: "Breweries" },
      { value: "ice_cream_shop", label: "Ice cream" },
      { value: "catering_service", label: "Caterers" },
    ],
  },
  {
    label: "Beauty & wellness",
    types: [
      { value: "hair_salon", label: "Hair salons" },
      { value: "barber_shop", label: "Barbers" },
      { value: "beauty_salon", label: "Beauty salons" },
      { value: "nail_salon", label: "Nail salons" },
      { value: "spa", label: "Spas" },
      { value: "massage", label: "Massage" },
      { value: "tanning_studio", label: "Tanning" },
      { value: "skin_care_clinic", label: "Skin care" },
      { value: "yoga_studio", label: "Yoga studios" },
    ],
  },
  {
    label: "Health",
    types: [
      { value: "dentist", label: "Dentists" },
      { value: "chiropractor", label: "Chiropractors" },
      { value: "physiotherapist", label: "Physiotherapists" },
      { value: "medical_clinic", label: "Clinics" },
      { value: "veterinary_care", label: "Vets" },
    ],
  },
  {
    label: "Automotive",
    types: [
      { value: "car_repair", label: "Auto repair" },
      { value: "car_wash", label: "Car washes" },
      { value: "tire_shop", label: "Tire shops" },
      { value: "car_dealer", label: "Car dealers" },
    ],
  },
  {
    label: "Professional",
    types: [
      { value: "lawyer", label: "Lawyers" },
      { value: "accounting", label: "Accountants" },
      { value: "insurance_agency", label: "Insurance" },
      { value: "real_estate_agency", label: "Real estate" },
      { value: "consultant", label: "Consultants" },
      { value: "employment_agency", label: "Staffing" },
      { value: "travel_agency", label: "Travel agents" },
      { value: "funeral_home", label: "Funeral homes" },
      { value: "child_care_agency", label: "Childcare" },
    ],
  },
  {
    label: "Fitness",
    types: [
      { value: "gym", label: "Gyms" },
      { value: "fitness_center", label: "Fitness centers" },
      { value: "sports_coaching", label: "Coaching" },
    ],
  },
  {
    label: "Shops & pets",
    types: [
      { value: "florist", label: "Florists" },
      { value: "jewelry_store", label: "Jewelers" },
      { value: "clothing_store", label: "Clothing" },
      { value: "furniture_store", label: "Furniture" },
      { value: "home_goods_store", label: "Home goods" },
      { value: "hardware_store", label: "Hardware" },
      { value: "pet_store", label: "Pet stores" },
      { value: "pet_care", label: "Pet grooming" },
    ],
  },
];

/** Every type the picker can produce. Anything else is dropped before it reaches Google. */
export const KNOWN_TYPES: ReadonlySet<string> = new Set(
  CATEGORY_GROUPS.flatMap((g) => g.types.map((t) => t.value))
);

export type Point = { lat: number; lng: number; label: string };

export type Business = {
  placeId: string;
  name: string;
  /** Google's own human wording for the primary type, e.g. "Plumber". */
  category: string | null;
  address: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  website: string | null;
  mapsUrl: string | null;
  rating: number | null;
  reviews: number | null;
  miles: number | null;
};

type Ok<T> = { ok: true } & T;
type Err = { ok: false; error: string };

/** Straight-line distance, only ever used to show "1.8 mi" beside a result. */
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

type AddressComponent = { longText?: string; shortText?: string; types?: string[] };

/**
 * Split Google's address into the columns a prospect record has.
 *
 * Parsed from `addressComponents` rather than by slicing `formattedAddress` on
 * commas, which looks equivalent right up until a business has a suite number
 * or a two-word town and every field after it shifts along by one.
 */
function splitAddress(components: AddressComponent[] | undefined) {
  const list = components ?? [];
  const pick = (type: string, short = false) => {
    const c = list.find((x) => x.types?.includes(type));
    return (short ? c?.shortText : c?.longText)?.trim() || null;
  };
  const number = pick("street_number");
  const route = pick("route");
  return {
    street: [number, route].filter(Boolean).join(" ") || null,
    city: pick("locality") ?? pick("sublocality_level_1") ?? pick("postal_town"),
    state: pick("administrative_area_level_1", true),
    zip: pick("postal_code"),
  };
}

/** Turn what the owner typed into a point to search around. */
export async function geocode(query: string): Promise<Ok<{ point: Point }> | Err> {
  const k = key();
  if (!k) return { ok: false, error: "Business search isn't set up yet." };

  const q = query.trim();
  if (!q) return { ok: false, error: "Type a town, city or ZIP code to search around." };

  const url =
    `${GEOCODE}?address=${encodeURIComponent(q)}` +
    `&components=country:${encodeURIComponent(region())}&key=${encodeURIComponent(k)}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    const body = (await res.json()) as {
      status?: string;
      error_message?: string;
      results?: {
        formatted_address?: string;
        geometry?: { location?: { lat: number; lng: number } };
      }[];
    };

    if (body.status === "ZERO_RESULTS") {
      return { ok: false, error: `We couldn't find "${q}". Try a city and state, or a ZIP code.` };
    }
    if (body.status !== "OK" || !body.results?.length) {
      console.error("[places] geocode failed", body.status, body.error_message);
      return { ok: false, error: "Couldn't look that location up. Check the Geocoding API is enabled." };
    }

    const first = body.results[0];
    const loc = first.geometry?.location;
    if (!loc) return { ok: false, error: "That location came back without coordinates." };

    return { ok: true, point: { lat: loc.lat, lng: loc.lng, label: first.formatted_address ?? q } };
  } catch (e) {
    console.error("[places] geocode error", e);
    return { ok: false, error: "Couldn't reach Google to look that location up." };
  }
}

/**
 * Businesses of the given types inside a circle.
 *
 * Nearby Search returns at most 20 places and, unlike Text Search, has no page
 * token -- so 20 is a hard ceiling per call, not a first page. `capped` says
 * when we hit it, because silently showing 20 of 200 plumbers would leave the
 * owner believing they had worked a town they had barely touched.
 */
export async function findNearby(opts: {
  point: Point;
  radiusMiles: number;
  types: string[];
  rankBy: "POPULARITY" | "DISTANCE";
}): Promise<Ok<{ businesses: Business[]; capped: boolean }> | Err> {
  const k = key();
  if (!k) return { ok: false, error: "Business search isn't set up yet." };

  const types = opts.types.filter((t) => KNOWN_TYPES.has(t));
  const radius = Math.min(Math.max(opts.radiusMiles, 0.1) * METERS_PER_MILE, MAX_RADIUS_METERS);

  try {
    const res = await fetch(NEARBY, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": k,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify({
        // Omitted entirely when nothing is picked. An empty array is not "any
        // type" to Google, it is a filter that matches nothing.
        ...(types.length ? { includedTypes: types } : {}),
        maxResultCount: MAX_RESULTS,
        rankPreference: opts.rankBy,
        languageCode: "en",
        regionCode: region(),
        locationRestriction: {
          circle: {
            center: { latitude: opts.point.lat, longitude: opts.point.lng },
            radius,
          },
        },
      }),
    });

    const body = (await res.json().catch(() => null)) as {
      places?: Record<string, unknown>[];
      error?: { message?: string; status?: string };
    } | null;

    if (!res.ok) {
      console.error("[places] search failed", res.status, body?.error);
      // A key that has not been granted the Places API is far and away the
      // likeliest cause here, and it is the one failure the owner can fix.
      if (res.status === 403) {
        return {
          ok: false,
          error:
            "Google rejected the request. Check the Places API (New) is enabled and the key is allowed to use it.",
        };
      }
      return { ok: false, error: body?.error?.message ?? "The business search failed. Try again." };
    }

    const raw = body?.places ?? [];

    const businesses: Business[] = raw
      .filter((p) => p.businessStatus !== "CLOSED_PERMANENTLY")
      .map((p) => {
        const loc = p.location as { latitude?: number; longitude?: number } | undefined;
        const parts = splitAddress(p.addressComponents as AddressComponent[] | undefined);
        return {
          placeId: String(p.id ?? ""),
          name: ((p.displayName as { text?: string } | undefined)?.text ?? "").trim(),
          category: (p.primaryTypeDisplayName as { text?: string } | undefined)?.text ?? null,
          address: (p.formattedAddress as string | undefined) ?? null,
          ...parts,
          phone: (p.nationalPhoneNumber as string | undefined) ?? null,
          website: (p.websiteUri as string | undefined) ?? null,
          mapsUrl: (p.googleMapsUri as string | undefined) ?? null,
          rating: typeof p.rating === "number" ? p.rating : null,
          reviews: typeof p.userRatingCount === "number" ? p.userRatingCount : null,
          miles:
            loc?.latitude != null && loc?.longitude != null
              ? Math.round(milesBetween(opts.point, loc.latitude, loc.longitude) * 10) / 10
              : null,
        };
      })
      .filter((b) => b.placeId && b.name);

    return { ok: true, businesses, capped: raw.length >= MAX_RESULTS };
  } catch (e) {
    console.error("[places] search error", e);
    return { ok: false, error: "Couldn't reach Google to run that search." };
  }
}
