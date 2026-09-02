import { z } from "zod";

export const packageSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  price: z.coerce.number().min(0).max(1000000),
  monthlyPrice: z
    .union([z.literal(""), z.coerce.number().min(0).max(100000)])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  featuresText: z.string().trim().max(3000).optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().min(0).max(999).optional().default(0),
  isActive: z.union([z.literal("on"), z.literal("")]).optional(),
});

export type PackageFormInput = z.infer<typeof packageSchema>;

export function parseFeatures(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
