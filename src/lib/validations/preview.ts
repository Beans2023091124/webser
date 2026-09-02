import { z } from "zod";
import { PreviewStatus } from "@prisma/client";

const hexColor = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex color like #1463FF");

/** Blank means "derive it automatically", so empty must stay valid. */
const optionalHex = z
  .union([z.literal(""), hexColor])
  .optional()
  .transform((v) => (v ? v : null));

const optionalInt = z
  .union([z.literal(""), z.coerce.number().int().min(0).max(500)])
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v));

export const previewSchema = z.object({
  businessName: z.string().trim().min(1, "Business name is required").max(200),
  tagline: z.string().trim().max(200).optional().or(z.literal("")),

  primaryColor: hexColor,
  secondaryColor: hexColor,
  fontFamily: z.string().trim().min(1).max(50),
  headingFont: z.string().trim().min(1).max(50),
  layoutVariant: z.enum(["trade", "hospitality", "care", "style"]),

  surfaceColor: optionalHex,
  headingColor: optionalHex,
  footerColor: optionalHex,
  textColor: optionalHex,
  mutedTextColor: optionalHex,
  galleryHeading: z.string().trim().max(80).optional().or(z.literal("")),

  heroHeadline: z.string().trim().max(200).optional().or(z.literal("")),
  heroSubheadline: z.string().trim().max(400).optional().or(z.literal("")),
  heroImageUrl: z.string().trim().max(500).optional().or(z.literal("")),
  aboutText: z.string().trim().max(3000).optional().or(z.literal("")),
  bookingUrl: z.string().trim().max(500).optional().or(z.literal("")),
  contactNote: z.string().trim().max(160).optional().or(z.literal("")),
  formHeading: z.string().trim().max(80).optional().or(z.literal("")),
  formBlurb: z.string().trim().max(200).optional().or(z.literal("")),
  formButtonText: z.string().trim().max(40).optional().or(z.literal("")),
  formNote: z.string().trim().max(120).optional().or(z.literal("")),
  formServiceLabel: z.string().trim().max(60).optional().or(z.literal("")),
  formMessageLabel: z.string().trim().max(60).optional().or(z.literal("")),

  yearsInBusiness: optionalInt,
  licenseNumber: z.string().trim().max(60).optional().or(z.literal("")),
  googleRating: z
    .union([z.literal(""), z.coerce.number().min(1).max(5)])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  reviewCount: optionalInt,

  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email").max(200).optional().or(z.literal("")),
  address: z.string().trim().max(250).optional().or(z.literal("")),
  mapEmbedUrl: z.string().trim().max(1000).optional().or(z.literal("")),
  ctaText: z.string().trim().min(1).max(60),

  status: z.nativeEnum(PreviewStatus),
});

export type PreviewFormInput = z.infer<typeof previewSchema>;

function safeJsonArray(raw: string | undefined): unknown[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseServices(raw: string | undefined) {
  return safeJsonArray(raw)
    .filter((s): s is { name: string; description?: string; icon?: string } => !!s && typeof s === "object" && "name" in s)
    .map((s) => ({
      name: String(s.name).trim(),
      description: String(s.description ?? "").trim(),
      icon: String(s.icon ?? "").trim() || undefined,
    }))
    .filter((s) => s.name.length > 0);
}

export function parseTestimonials(raw: string | undefined) {
  return safeJsonArray(raw)
    .filter((t): t is { name: string; quote: string; rating?: number } => !!t && typeof t === "object" && "quote" in t)
    .map((t) => ({
      name: String(t.name ?? "").trim(),
      quote: String(t.quote ?? "").trim(),
      rating: Math.min(5, Math.max(1, Number(t.rating) || 5)),
    }))
    .filter((t) => t.quote.length > 0);
}

export function parseWhyChooseUs(raw: string | undefined) {
  return safeJsonArray(raw)
    .filter((w): w is { title: string; description?: string } => !!w && typeof w === "object" && "title" in w)
    .map((w) => ({ title: String(w.title).trim(), description: String(w.description ?? "").trim() }))
    .filter((w) => w.title.length > 0);
}

export function parseFaq(raw: string | undefined) {
  return safeJsonArray(raw)
    .filter((f): f is { question: string; answer?: string } => !!f && typeof f === "object" && "question" in f)
    .map((f) => ({ question: String(f.question).trim(), answer: String(f.answer ?? "").trim() }))
    .filter((f) => f.question.length > 0);
}

export function parseGallery(raw: string | undefined): string[] {
  return parseList(raw);
}

/** Newline-separated textarea → trimmed string array. */
export function parseList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function parseHours(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    // ignore malformed input and fall through to empty hours
  }
  return {};
}
