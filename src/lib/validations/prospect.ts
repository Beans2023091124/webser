import { z } from "zod";
import { ProspectStatus } from "@prisma/client";

export const prospectSchema = z.object({
  businessName: z.string().trim().min(1, "Business name is required").max(200),
  category: z.string().trim().max(100).optional().or(z.literal("")),
  contactName: z.string().trim().max(150).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .max(200)
    .optional()
    .or(z.literal("")),
  address: z.string().trim().max(250).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  state: z.string().trim().max(50).optional().or(z.literal("")),
  zip: z.string().trim().max(20).optional().or(z.literal("")),
  currentWebsite: z.string().trim().max(300).optional().or(z.literal("")),
  gmbUrl: z.string().trim().max(500).optional().or(z.literal("")),
  facebook: z.string().trim().max(300).optional().or(z.literal("")),
  instagram: z.string().trim().max(300).optional().or(z.literal("")),
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
  status: z.nativeEnum(ProspectStatus),
  estimatedPrice: z.coerce.number().min(0).max(1000000).optional().nullable(),
  followUpDate: z.string().optional().or(z.literal("")),
  source: z.string().trim().max(150).optional().or(z.literal("")),
});

export type ProspectFormInput = z.infer<typeof prospectSchema>;

export const activitySchema = z.object({
  prospectId: z.string().min(1),
  type: z.enum(["CALL", "EMAIL", "MEETING", "NOTE", "STATUS_CHANGE", "SYSTEM"]),
  description: z.string().trim().min(1, "Description is required").max(2000),
  outcome: z.string().trim().max(200).optional().or(z.literal("")),
});
