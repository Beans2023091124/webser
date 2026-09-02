import type Anthropic from "@anthropic-ai/sdk";
import { HEADING_FONT_OPTIONS, BODY_FONT_OPTIONS } from "@/lib/preview";

/**
 * The set of preview fields the assistant is allowed to change.
 *
 * Everything is optional — the model returns only what the instruction asked
 * for, so a request to "make the headline punchier" can't silently wipe the
 * services list. Contact details are deliberately excluded: those are facts
 * about a real business, not copy to be rewritten.
 */
export const EDIT_TOOL: Anthropic.Tool = {
  name: "edit_website",
  description:
    "Apply the requested changes to the website preview. Only include fields you are actually changing. Omit everything else.",
  input_schema: {
    type: "object",
    properties: {
      summary: {
        type: "string",
        description:
          "One or two sentences, addressed to the user, describing what you changed and why. Plain language, no field names.",
      },

      businessName: { type: "string" },
      tagline: { type: "string", description: "Short eyebrow line above the headline." },
      ctaText: { type: "string", description: "Call-to-action button text. Max ~30 chars." },

      heroHeadline: { type: "string" },
      heroSubheadline: { type: "string" },
      aboutText: { type: "string" },

      primaryColor: { type: "string", description: "Hex like #1463FF. The accent/CTA color." },
      secondaryColor: {
        type: "string",
        description: "Hex. The dark color used for headers, hero background, and footer. Should be dark.",
      },
      headingFont: { type: "string", enum: HEADING_FONT_OPTIONS },
      fontFamily: { type: "string", enum: BODY_FONT_OPTIONS, description: "Body font." },
      layoutVariant: {
        type: "string",
        enum: ["trade", "hospitality", "care", "style"],
        description:
          "Overall design personality. trade = bold/high-contrast for contractors; hospitality = warm serif; care = soft and calm for medical; style = dark and fashion-forward.",
      },

      services: {
        type: "array",
        description: "Replaces the full services list.",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            icon: {
              type: "string",
              description:
                "Icon key. One of: siren, waves, flame, gitBranch, droplets, droplet, zap, gauge, disc, cog, wind, circleDot, home, cloudLightning, layers, search, scissors, penTool, leaf, mountain, treePine, chefHat, bath, hammer, wrench, utensils, shoppingBag, partyPopper, sparkles, userRound, baby, palette, shield, sun, anchor, heartPulse",
            },
          },
          required: ["name"],
        },
      },
      whyChooseUs: {
        type: "array",
        description: "Replaces the full differentiators list.",
        items: {
          type: "object",
          properties: { title: { type: "string" }, description: { type: "string" } },
          required: ["title"],
        },
      },
      faq: {
        type: "array",
        description: "Replaces the full FAQ list.",
        items: {
          type: "object",
          properties: { question: { type: "string" }, answer: { type: "string" } },
          required: ["question"],
        },
      },
      testimonials: {
        type: "array",
        description:
          "Replaces the testimonials list. Never invent testimonials unless the user explicitly asks for placeholders.",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            quote: { type: "string" },
            rating: { type: "number" },
          },
          required: ["quote"],
        },
      },
      trustBadges: {
        type: "array",
        description: "Short badge phrases, e.g. 'Licensed & Insured'.",
        items: { type: "string" },
      },
      serviceAreas: { type: "array", items: { type: "string" } },
    },
    required: ["summary"],
  },
};

export const SYSTEM_PROMPT = `You are editing a website for a small local business. The site was generated from an industry template and is being customised before it's shown to the business owner as a sales pitch.

Write like a competent human copywriter for a local trade business — plain, specific, and confident. Avoid marketing filler, and never use phrases like "we're passionate about", "your trusted partner", "take your business to the next level", "elevate", or "unlock".

Rules:
- Call the edit_website tool exactly once.
- Only include fields the user actually asked you to change. Omit everything else.
- Arrays replace the whole list, so when changing one item include the others unchanged.
- Never invent facts about the business: no made-up years in business, license numbers, awards, or testimonials.
- Keep copy proportionate — headlines short, service descriptions one sentence.
- If the request is ambiguous or you cannot do it with the available fields, still call the tool with only a summary explaining what you'd need.`;

/** Compact snapshot of the current preview, used as model context. */
export function buildContext(preview: Record<string, unknown>) {
  const pick = [
    "businessName",
    "tagline",
    "ctaText",
    "heroHeadline",
    "heroSubheadline",
    "aboutText",
    "primaryColor",
    "secondaryColor",
    "headingFont",
    "fontFamily",
    "layoutVariant",
    "services",
    "whyChooseUs",
    "faq",
    "testimonials",
    "trustBadges",
    "serviceAreas",
    "phone",
    "email",
    "address",
    "yearsInBusiness",
    "licenseNumber",
  ];
  const out: Record<string, unknown> = {};
  for (const k of pick) {
    const v = preview[k];
    if (v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0)) out[k] = v;
  }
  return out;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

/**
 * Only let through fields we recognise, with the right shape. The model is
 * well-behaved but this is what actually reaches the database.
 */
export function sanitizeEdit(input: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  const changed: string[] = [];

  const str = (k: string, max: number) => {
    const v = input[k];
    if (typeof v === "string" && v.trim()) {
      data[k] = v.trim().slice(0, max);
      changed.push(k);
    }
  };

  str("businessName", 200);
  str("tagline", 200);
  str("ctaText", 60);
  str("heroHeadline", 200);
  str("heroSubheadline", 400);
  str("aboutText", 3000);

  for (const k of ["primaryColor", "secondaryColor"]) {
    const v = input[k];
    if (typeof v === "string" && HEX.test(v.trim())) {
      data[k] = v.trim();
      changed.push(k);
    }
  }

  if (typeof input.headingFont === "string" && HEADING_FONT_OPTIONS.includes(input.headingFont)) {
    data.headingFont = input.headingFont;
    changed.push("headingFont");
  }
  if (typeof input.fontFamily === "string" && BODY_FONT_OPTIONS.includes(input.fontFamily)) {
    data.fontFamily = input.fontFamily;
    changed.push("fontFamily");
  }
  if (
    typeof input.layoutVariant === "string" &&
    ["trade", "hospitality", "care", "style"].includes(input.layoutVariant)
  ) {
    data.layoutVariant = input.layoutVariant;
    changed.push("layoutVariant");
  }

  const arr = (k: string, map: (x: Record<string, unknown>) => unknown | null) => {
    const v = input[k];
    if (!Array.isArray(v)) return;
    const cleaned = v
      .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
      .map(map)
      .filter(Boolean);
    data[k] = cleaned;
    changed.push(k);
  };

  arr("services", (s) =>
    typeof s.name === "string" && s.name.trim()
      ? {
          name: String(s.name).trim().slice(0, 120),
          description: String(s.description ?? "").trim().slice(0, 300),
          icon: typeof s.icon === "string" ? s.icon : undefined,
        }
      : null
  );
  arr("whyChooseUs", (w) =>
    typeof w.title === "string" && w.title.trim()
      ? {
          title: String(w.title).trim().slice(0, 120),
          description: String(w.description ?? "").trim().slice(0, 400),
        }
      : null
  );
  arr("faq", (f) =>
    typeof f.question === "string" && f.question.trim()
      ? {
          question: String(f.question).trim().slice(0, 250),
          answer: String(f.answer ?? "").trim().slice(0, 800),
        }
      : null
  );
  arr("testimonials", (t) =>
    typeof t.quote === "string" && t.quote.trim()
      ? {
          name: String(t.name ?? "").trim().slice(0, 120),
          quote: String(t.quote).trim().slice(0, 600),
          rating: Math.min(5, Math.max(1, Number(t.rating) || 5)),
        }
      : null
  );

  for (const k of ["trustBadges", "serviceAreas"]) {
    const v = input[k];
    if (Array.isArray(v)) {
      data[k] = v
        .filter((x) => typeof x === "string" && x.trim())
        .map((x) => String(x).trim().slice(0, 80))
        .slice(0, 20);
      changed.push(k);
    }
  }

  return { data, changed };
}

const FIELD_LABELS: Record<string, string> = {
  businessName: "business name",
  tagline: "tagline",
  ctaText: "button text",
  heroHeadline: "headline",
  heroSubheadline: "subheadline",
  aboutText: "about section",
  primaryColor: "accent color",
  secondaryColor: "dark color",
  headingFont: "heading font",
  fontFamily: "body font",
  layoutVariant: "layout style",
  services: "services",
  whyChooseUs: "why choose us",
  faq: "FAQ",
  testimonials: "testimonials",
  trustBadges: "trust badges",
  serviceAreas: "service areas",
};

export function labelFields(changed: string[]): string[] {
  return changed.map((c) => FIELD_LABELS[c] ?? c);
}
