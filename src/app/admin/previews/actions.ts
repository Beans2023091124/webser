"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { ProspectStatus } from "@prisma/client";
import {
  previewSchema,
  parseServices,
  parseTestimonials,
  parseGallery,
  parseHours,
  parseWhyChooseUs,
  parseFaq,
  parseList,
} from "@/lib/validations/preview";
import {
  INDUSTRY_DEFAULTS,
  mapCategoryToIndustry,
  slugify,
  defaultHours,
  fillTokens,
  parseSectionOrder,
  galleryStyleOf,
  suggestServiceAreas,
  templateHero,
  templateGallery,
} from "@/lib/preview";

async function uniqueSlug(base: string) {
  const root = slugify(base) || "preview";
  let slug = root;
  let attempt = 0;
  while (await prisma.preview.findUnique({ where: { slug } })) {
    attempt += 1;
    slug = `${root}-${nanoid(6).toLowerCase()}`;
    if (attempt > 5) break;
  }
  return slug;
}

export async function generatePreviewFromProspect(prospectId: string, industryOverride?: string) {
  await requireAdmin();

  const prospect = await prisma.prospect.findUniqueOrThrow({ where: { id: prospectId } });
  const industry = industryOverride || mapCategoryToIndustry(prospect.category);
  const defaults = INDUSTRY_DEFAULTS[industry] ?? INDUSTRY_DEFAULTS["general-contractor"];

  const template = await prisma.template.upsert({
    where: { slug: industry },
    update: {},
    create: {
      slug: industry,
      name: `${defaults.label} Template`,
      industry,
      description: `Starting point for ${defaults.label.toLowerCase()} businesses.`,
      sections: {},
    },
  });

  const slug = await uniqueSlug(prospect.businessName);
  const fill = (s: string) => fillTokens(s, prospect.businessName, prospect.city);

  const preview = await prisma.preview.create({
    data: {
      slug,
      prospectId: prospect.id,
      templateId: template.id,
      businessName: prospect.businessName,
      tagline: fill(defaults.tagline),

      primaryColor: defaults.primaryColor,
      secondaryColor: defaults.secondaryColor,
      fontFamily: defaults.bodyFont,
      headingFont: defaults.headingFont,
      layoutVariant: defaults.variant,

      heroHeadline: fill(defaults.heroHeadline),
      heroSubheadline: fill(defaults.heroSubheadline),
      heroImageUrl: templateHero(industry),
      aboutText: fill(defaults.aboutText),

      services: defaults.services,
      whyChooseUs: defaults.whyChooseUs,
      faq: defaults.faq.map((f) => ({ question: fill(f.question), answer: fill(f.answer) })),
      trustBadges: defaults.trustBadges,
      serviceAreas: suggestServiceAreas(prospect.city),
      testimonials: [],
      gallery: templateGallery(industry),

      emergencyService: defaults.emergencyService,
      freeEstimates: true,

      phone: prospect.phone,
      email: prospect.email,
      address: [prospect.address, [prospect.city, prospect.state].filter(Boolean).join(", ")]
        .filter(Boolean)
        .join(", "),
      hours: defaultHours(defaults.variant),
      ctaText: defaults.ctaText,
      status: "DRAFT",
    },
  });

  if (
    prospect.status === "NEW" ||
    prospect.status === "RESEARCHING" ||
    prospect.status === "CONTACTED" ||
    prospect.status === "INTERESTED"
  ) {
    await prisma.prospect.update({
      where: { id: prospect.id },
      data: { status: ProspectStatus.PREVIEW_CREATED },
    });
  }

  await prisma.activity.create({
    data: {
      prospectId: prospect.id,
      type: "SYSTEM",
      description: `Website preview generated (${defaults.label} template).`,
    },
  });

  revalidatePath(`/admin/prospects/${prospect.id}`);
  revalidatePath("/admin/previews");
  redirect(`/admin/previews/${preview.id}`);
}

export async function updatePreview(previewId: string, formData: FormData) {
  await requireAdmin();

  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  const parsed = previewSchema.parse(raw);

  const preview = await prisma.preview.update({
    where: { id: previewId },
    data: {
      businessName: parsed.businessName,
      tagline: parsed.tagline || null,

      primaryColor: parsed.primaryColor,
      secondaryColor: parsed.secondaryColor,
      fontFamily: parsed.fontFamily,
      headingFont: parsed.headingFont,
      layoutVariant: parsed.layoutVariant,
      surfaceColor: parsed.surfaceColor,
      headingColor: parsed.headingColor,
      footerColor: parsed.footerColor,
      textColor: parsed.textColor,
      mutedTextColor: parsed.mutedTextColor,
      galleryHeading: parsed.galleryHeading || null,
      galleryStyle: galleryStyleOf(raw.galleryStyle),

      heroHeadline: parsed.heroHeadline || null,
      heroSubheadline: parsed.heroSubheadline || null,
      aboutText: parsed.aboutText || null,

      // Images are owned by the image manager, which writes them the moment
      // they're uploaded. This form is rendered once and its inputs are
      // uncontrolled, so if it also carried hero/gallery values it would post
      // whatever was on screen at page load and silently undo every upload
      // made since. Only touch them if a field for them was actually sent.
      ...("heroImageUrl" in raw ? { heroImageUrl: parsed.heroImageUrl || null } : {}),
      ...("galleryText" in raw ? { gallery: parseGallery(raw.galleryText) } : {}),

      services: parseServices(raw.servicesJson),
      testimonials: parseTestimonials(raw.testimonialsJson),
      whyChooseUs: parseWhyChooseUs(raw.whyChooseUsJson),
      faq: parseFaq(raw.faqJson),
      trustBadges: parseList(raw.trustBadgesText),
      serviceAreas: parseList(raw.serviceAreasText),

      yearsInBusiness: parsed.yearsInBusiness ?? null,
      licenseNumber: parsed.licenseNumber || null,
      googleRating: parsed.googleRating ?? null,
      reviewCount: parsed.reviewCount ?? null,
      emergencyService: raw.emergencyService === "on",
      smsEnabled: raw.smsEnabled === "on",
      showEmailContact: raw.showEmailContact === "on",
      bookingUrl: parsed.bookingUrl || null,
      contactNote: parsed.contactNote || null,
      formHeading: parsed.formHeading || null,
      formBlurb: parsed.formBlurb || null,
      formButtonText: parsed.formButtonText || null,
      formNote: parsed.formNote || null,
      formServiceLabel: parsed.formServiceLabel || null,
      formMessageLabel: parsed.formMessageLabel || null,
      formShowService: raw.formShowService === "on",
      formShowMessage: raw.formShowMessage === "on",
      formRequireEmail: raw.formRequireEmail === "on",
      freeEstimates: raw.freeEstimates === "on",
      showStats: raw.showStats === "on",
      sectionOrder: parseSectionOrder(raw.sectionOrder),

      phone: parsed.phone || null,
      email: parsed.email || null,
      address: parsed.address || null,
      hours: parseHours(raw.hoursJson),
      mapEmbedUrl: parsed.mapEmbedUrl || null,
      ctaText: parsed.ctaText,
      status: parsed.status,
    },
    include: { prospect: true },
  });

  if (preview.prospect && preview.status === "ACTIVE" && preview.prospect.status === "PREVIEW_CREATED") {
    await prisma.prospect.update({
      where: { id: preview.prospect.id },
      data: { status: ProspectStatus.PREVIEW_SENT },
    });
  }

  revalidatePath(`/admin/previews/${previewId}`);
  revalidatePath("/admin/previews");
  revalidatePath(`/p/${preview.slug}`);
  // The marketing page caches its example cards, so a demo edit has to clear it
  // or the cards keep showing the old name and colour for up to an hour.
  if (preview.isDemo) revalidatePath("/");
  if (preview.prospectId) revalidatePath(`/admin/prospects/${preview.prospectId}`);

  return preview;
}

export async function deletePreview(previewId: string) {
  await requireAdmin();

  // The example sites are linked from the marketing page, so losing one breaks
  // a public link. The button is hidden for them, but hiding a button is not a
  // rule -- the rule is here, where the deleting actually happens.
  const existing = await prisma.preview.findUnique({
    where: { id: previewId },
    select: { isDemo: true },
  });
  if (existing?.isDemo) {
    throw new Error(
      "Example sites can't be deleted from the dashboard. Edit scripts/seed-demos.ts and re-run it."
    );
  }

  const preview = await prisma.preview.delete({ where: { id: previewId } });
  revalidatePath("/admin/previews");
  if (preview.prospectId) revalidatePath(`/admin/prospects/${preview.prospectId}`);
  redirect("/admin/previews");
}

export async function markLeadRead(leadId: string, previewId: string) {
  await requireAdmin();
  await prisma.previewLead.update({ where: { id: leadId }, data: { readAt: new Date() } });
  revalidatePath(`/admin/previews/${previewId}`);
}
