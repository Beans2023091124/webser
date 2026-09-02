/**
 * Creates the three example sites linked from the marketing page.
 *
 *   npx tsx scripts/seed-demos.ts
 *
 * Idempotent — upserts by slug, so running it again refreshes the content
 * rather than making duplicates.
 *
 * The businesses are invented. Names are fictional, every phone number is in
 * the 555-01xx range reserved for fiction, and each site carries an "example"
 * banner. Real local businesses do not get their names or photos used as
 * marketing props without asking, and a visitor should never think one of
 * these is a company they can actually hire.
 */
import { prisma } from "../src/lib/prisma";
import { INDUSTRY_DEFAULTS, templateHero, templateGallery } from "../src/lib/preview";

type Demo = {
  slug: string;
  industry: string;
  businessName: string;
  tagline: string;
  phone: string;
  address: string;
  serviceAreas: string[];
  heroHeadline?: string;
  heroSubheadline?: string;
  testimonials: { name: string; quote: string; rating: number }[];
  hours: Record<string, string>;
  yearsInBusiness: number;
  googleRating: number;
  reviewCount: number;
};

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const hours = (weekday: string, sat?: string, sun = "Closed") => ({
  ...Object.fromEntries(WEEKDAYS.map((d) => [d, weekday])),
  Saturday: sat ?? "Closed",
  Sunday: sun,
});

const DEMOS: Demo[] = [
  {
    slug: "ridgeline-plumbing",
    industry: "plumbing",
    businessName: "Ridgeline Plumbing & Drain",
    tagline: "Licensed & insured · Olathe",
    phone: "(913) 555-0142",
    address: "1420 S Ridgeline Dr, Olathe, KS",
    serviceAreas: ["Olathe", "Overland Park", "Lenexa", "Shawnee", "Gardner"],
    heroHeadline: "Water where it shouldn't be? We'll be there today.",
    heroSubheadline:
      "Same-day repairs for leaks, blocked drains and failed water heaters. You get a fixed price before we start, not after.",
    testimonials: [
      { name: "Karen M.", quote: "Called at 8am about a burst pipe under the sink. Fixed and cleaned up by lunchtime, and the price was exactly what he quoted on the phone.", rating: 5 },
      { name: "Tom R.", quote: "Third plumber I've used out here and the first one who actually explained what was wrong instead of just handing me a bill.", rating: 5 },
      { name: "Priya S.", quote: "Replaced our water heater the same week we called. Tidy work, no mess left behind.", rating: 5 },
    ],
    hours: hours("7:00 AM – 6:00 PM", "8:00 AM – 2:00 PM"),
    yearsInBusiness: 14,
    googleRating: 4.9,
    reviewCount: 87,
  },
  {
    slug: "copper-kettle-kitchen",
    industry: "restaurant",
    businessName: "The Copper Kettle",
    tagline: "Kitchen open daily",
    phone: "(913) 555-0168",
    address: "218 N Cherry St, Olathe, KS",
    serviceAreas: ["Olathe", "Overland Park", "Lenexa"],
    heroHeadline: "Everything made this morning.",
    heroSubheadline:
      "A short menu we actually cook from scratch, a good pour, and a room that feels like somebody's kitchen. Dine in, carry out, or let us cater.",
    testimonials: [
      { name: "Danielle P.", quote: "The short rib is worth the drive on its own. We've been back four times this month.", rating: 5 },
      { name: "Marcus W.", quote: "They catered our office lunch for thirty people and everything arrived hot and on time. Rare.", rating: 5 },
      { name: "Ana L.", quote: "Lovely room, unhurried service, and they actually remember you the second time.", rating: 5 },
    ],
    hours: { ...hours("11:00 AM – 9:00 PM", "10:00 AM – 10:00 PM", "10:00 AM – 3:00 PM") },
    yearsInBusiness: 9,
    googleRating: 4.7,
    reviewCount: 214,
  },
  {
    slug: "ironwood-barbers",
    industry: "barber-salon",
    businessName: "Ironwood Barber Co.",
    tagline: "Walk-ins & appointments",
    phone: "(913) 555-0179",
    address: "77 W Park St, Olathe, KS",
    serviceAreas: ["Olathe", "Lenexa", "Overland Park"],
    heroHeadline: "A proper cut, without the wait.",
    heroSubheadline:
      "Book a chair in thirty seconds or walk in and we'll get you seen. Skin fades, beard work, and hot towel shaves.",
    testimonials: [
      { name: "Jordan T.", quote: "Best fade I've had since moving here. Booked online at 9, in the chair by 10.", rating: 5 },
      { name: "Elliot B.", quote: "They take their time and they listen. My kid actually looks forward to going now.", rating: 5 },
      { name: "Sam O.", quote: "Straight razor finish is worth the extra ten bucks. Sharp room, good music.", rating: 5 },
    ],
    hours: { ...hours("9:00 AM – 7:00 PM", "8:00 AM – 4:00 PM"), Sunday: "Closed" },
    yearsInBusiness: 6,
    googleRating: 4.8,
    reviewCount: 156,
  },
];

async function main() {
  for (const demo of DEMOS) {
    const d = INDUSTRY_DEFAULTS[demo.industry];
    if (!d) throw new Error(`No industry defaults for "${demo.industry}"`);

    // Previews belong to a Template; reuse the industry one the generator makes.
    const template = await prisma.template.upsert({
      where: { slug: demo.industry },
      update: {},
      create: {
        slug: demo.industry,
        name: `${d.label} Template`,
        industry: demo.industry,
        description: `Starting point for ${d.label.toLowerCase()} businesses.`,
        sections: {},
      },
    });

    const content = {
      templateId: template.id,
      businessName: demo.businessName,
      tagline: demo.tagline,
      layoutVariant: d.variant,
      primaryColor: d.primaryColor,
      secondaryColor: d.secondaryColor,
      headingFont: d.headingFont,
      fontFamily: d.bodyFont,

      heroHeadline: demo.heroHeadline ?? d.heroHeadline,
      heroSubheadline: demo.heroSubheadline ?? d.heroSubheadline,
      heroImageUrl: templateHero(demo.industry),
      gallery: templateGallery(demo.industry),

      aboutText: d.aboutText,
      services: d.services,
      whyChooseUs: d.whyChooseUs,
      faq: d.faq,
      trustBadges: d.trustBadges,
      ctaText: d.ctaText,
      emergencyService: Boolean(d.emergencyService),
      freeEstimates: demo.industry === "plumbing",

      phone: demo.phone,
      // No email on purpose: a fake address either bounces or belongs to
      // someone real. The number is in the reserved fictional range.
      email: null,
      showEmailContact: false,
      address: demo.address,
      serviceAreas: demo.serviceAreas,
      hours: demo.hours,
      testimonials: demo.testimonials,

      yearsInBusiness: demo.yearsInBusiness,
      googleRating: demo.googleRating,
      reviewCount: demo.reviewCount,

      status: "ACTIVE" as const,
      isDemo: true,
    };

    const preview = await prisma.preview.upsert({
      where: { slug: demo.slug },
      update: content,
      create: { slug: demo.slug, ...content },
    });
    console.log(`${preview.isDemo ? "demo" : "???"}  /p/${preview.slug}  ${preview.businessName} (${d.variant})`);
  }

  console.log("\nDone. They appear on the landing page under Examples.");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exitCode = 1;
});
