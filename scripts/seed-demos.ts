/**
 * Creates the three example sites linked from the marketing page.
 *
 *   npx tsx scripts/seed-demos.ts
 *
 * Idempotent — upserts by slug, so running it again refreshes the content
 * rather than making duplicates.
 *
 * The businesses are invented, and nothing on these pages resolves to anyone
 * real:
 *
 *   - Names are made up, and each site carries an "example" banner.
 *   - Phone numbers are in the 555-0100..555-0199 range reserved for fiction.
 *   - Addresses are city-only. A street address attached to an invented shop
 *     still points at a real building with real people behind the door.
 *   - No email addresses -- a plausible one either bounces or belongs to
 *     somebody. Booking links go to example.com, which is reserved.
 *
 * Real local businesses do not get their names or photos used as marketing
 * props without asking, and a visitor should never think one of these is a
 * company they can actually hire.
 */
import { prisma } from "../src/lib/prisma";
import {
  INDUSTRY_DEFAULTS,
  templateHero,
  templateGallery,
  fillTokens,
  orderSections,
} from "../src/lib/preview";

type Demo = {
  slug: string;
  industry: string;
  businessName: string;
  tagline: string;
  phone: string;
  address: string;
  city: string;
  serviceAreas: string[];
  heroHeadline?: string;
  heroSubheadline?: string;
  testimonials: { name: string; quote: string; rating: number }[];
  hours: Record<string, string>;
  yearsInBusiness: number;
  googleRating: number;
  reviewCount: number;

  // The levers that actually change the shape of a page, rather than its
  // paint: which sections exist at all, how many items each holds (the grid
  // and gallery tiling both key off the count), and the type.
  primaryColor: string;
  secondaryColor: string;
  surfaceColor: string;
  headingColor?: string;
  textColor?: string;
  headingFont: string;
  bodyFont: string;
  galleryCount: number;
  galleryHeading: string;
  galleryStyle: string;
  serviceCount: number;
  whyCount: number;
  faqCount: number;
  showStats: boolean;
  /** Empty keeps the default order. Empty sections stay hidden either way. */
  sectionOrder?: string[];
  trustBadges: string[];
  form: {
    heading?: string;
    blurb?: string;
    buttonText?: string;
    serviceLabel?: string;
    messageLabel?: string;
    note?: string;
    showService: boolean;
    showMessage: boolean;
  };
  bookingUrl?: string;
  contactNote?: string;
  smsEnabled?: boolean;
};

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const hours = (weekday: string, sat?: string, sun = "Closed") => ({
  ...Object.fromEntries(WEEKDAYS.map((d) => [d, weekday])),
  Saturday: sat ?? "Closed",
  Sunday: sun,
});

/**
 * Industry copy carries {business} and {city} placeholders that the generator
 * substitutes per prospect. A demo has no prospect behind it, so fill them
 * here -- a raw "{business}" on a public example page is worse than no example.
 */
function fillDeep<T>(value: T, business: string, city: string): T {
  if (typeof value === "string") return fillTokens(value, business, city) as T;
  if (Array.isArray(value)) return value.map((v) => fillDeep(v, business, city)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, fillDeep(v, business, city)])
    ) as T;
  }
  return value;
}

const DEMOS: Demo[] = [
  // Industrial and dense. Everything switched on: stats band, six services in
  // a 3-wide grid, six photos as a staggered pinboard, a full FAQ. The page a
  // tradesman's customer scrolls looking for proof.
  {
    slug: "ridgeline-plumbing",
    industry: "plumbing",
    businessName: "Ridgeline Plumbing & Drain",
    tagline: "Licensed & insured · Olathe",
    phone: "(913) 555-0142",
    address: "Olathe, KS",
    city: "Olathe",
    serviceAreas: ["Olathe", "Overland Park", "Lenexa", "Shawnee", "Gardner", "De Soto"],
    heroHeadline: "Water where it shouldn't be? We'll be there today.",
    heroSubheadline:
      "Same-day repairs for leaks, blocked drains and failed water heaters. You get a fixed price before we start, not after.",
    primaryColor: "#0C5AA6",
    secondaryColor: "#111A24",
    surfaceColor: "#EEF1F4",
    headingColor: "#111A24",
    headingFont: "Oswald",
    bodyFont: "Source Sans 3",
    galleryCount: 6,
    galleryHeading: "Recent jobs",
    galleryStyle: "masonry",
    serviceCount: 6,
    whyCount: 4,
    faqCount: 5,
    showStats: true,
    sectionOrder: ["services", "stats", "reviews", "gallery", "areas", "about", "faq"],
    trustBadges: ["Licensed & Insured", "Same-Day Service", "Upfront Pricing", "Free Estimates"],
    form: {
      showService: true,
      showMessage: true,
      messageLabel: "What's going on?",
      note: "We'll call you back within the hour, usually sooner.",
    },
    smsEnabled: true,
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

  // Warm and editorial. Serif headings on cream, no stats band, no service
  // areas and no FAQ, so the page is markedly shorter and calmer. Four photos
  // run as a swipeable strip, and the form asks for a reservation rather than
  // a job description.
  {
    slug: "copper-kettle-kitchen",
    industry: "restaurant",
    businessName: "The Copper Kettle",
    tagline: "Kitchen open daily",
    phone: "(913) 555-0168",
    address: "Olathe, KS",
    city: "Olathe",
    serviceAreas: [],
    heroHeadline: "Everything made this morning.",
    heroSubheadline:
      "A short menu we cook from scratch, a good pour, and a room that feels like somebody's kitchen.",
    primaryColor: "#A61E22",
    secondaryColor: "#2B1A18",
    surfaceColor: "#FBF6EE",
    headingColor: "#2B1A18",
    textColor: "#5B4A3F",
    headingFont: "Fraunces",
    bodyFont: "Karla",
    galleryCount: 4,
    galleryHeading: "The room",
    galleryStyle: "filmstrip",
    serviceCount: 4,
    whyCount: 3,
    faqCount: 0,
    showStats: false,
    sectionOrder: ["gallery", "about", "services", "reviews"],
    trustBadges: ["Made From Scratch", "Family Owned", "Catering Available"],
    form: {
      heading: "Reserve a table",
      blurb: "Tell us when and how many, and we'll hold it for you.",
      buttonText: "Request a table",
      messageLabel: "How many, and when?",
      note: "We'll confirm by text, usually within the hour.",
      showService: false,
      showMessage: true,
    },
    bookingUrl: "https://example.com/reserve",
    contactNote: "Walk-ins always welcome — reservations just save you the wait.",
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

  // Deco and stripped back. Geometric type in brass on off-white, three
  // services, five photos shown as one feature shot plus thumbnails, two
  // testimonials, a three-line FAQ, and a form reduced to name and number.
  {
    slug: "ironwood-barbers",
    industry: "barber-salon",
    businessName: "Ironwood Barber Co.",
    tagline: "Walk-ins & appointments",
    phone: "(913) 555-0179",
    address: "Olathe, KS",
    city: "Olathe",
    serviceAreas: ["Olathe", "Lenexa", "Overland Park"],
    heroHeadline: "A proper cut, without the wait.",
    heroSubheadline: "Skin fades, beard work, and hot towel shaves. Book a chair in thirty seconds.",
    primaryColor: "#C3922F",
    secondaryColor: "#0B0B0C",
    surfaceColor: "#F6F4F1",
    headingColor: "#0B0B0C",
    headingFont: "Josefin Sans",
    bodyFont: "Jost",
    galleryCount: 5,
    galleryHeading: "In the shop",
    galleryStyle: "showcase",
    serviceCount: 3,
    whyCount: 3,
    faqCount: 3,
    showStats: true,
    sectionOrder: ["services", "gallery", "reviews", "stats", "faq", "areas", "about"],
    trustBadges: ["Walk-Ins Welcome", "Open Saturdays"],
    form: {
      heading: "Book a chair",
      blurb: "Leave your number and we'll text you a slot.",
      buttonText: "Book my slot",
      serviceLabel: "Which chair?",
      note: "No deposit, no app to download.",
      showService: true,
      showMessage: false,
    },
    smsEnabled: true,
    testimonials: [
      { name: "Jordan T.", quote: "Best fade I've had since moving here. Booked online at 9, in the chair by 10.", rating: 5 },
      { name: "Elliot B.", quote: "They take their time and they listen. My kid actually looks forward to going now.", rating: 5 },
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

    const fill = <T>(v: T) => fillDeep(v, demo.businessName, demo.city);

    const content = {
      templateId: template.id,
      businessName: demo.businessName,
      tagline: demo.tagline,
      layoutVariant: d.variant,

      primaryColor: demo.primaryColor,
      secondaryColor: demo.secondaryColor,
      surfaceColor: demo.surfaceColor,
      headingColor: demo.headingColor ?? null,
      textColor: demo.textColor ?? null,
      headingFont: demo.headingFont,
      fontFamily: demo.bodyFont,

      heroHeadline: fill(demo.heroHeadline ?? d.heroHeadline),
      heroSubheadline: fill(demo.heroSubheadline ?? d.heroSubheadline),
      heroImageUrl: templateHero(demo.industry),
      // Photo count drives the gallery tiling, so this is a layout choice as
      // much as a content one: 6 makes a 2x2 feature, 4 runs the last tile
      // full width, 5 spans it two columns.
      gallery: templateGallery(demo.industry).slice(0, demo.galleryCount),
      galleryHeading: demo.galleryHeading,
      galleryStyle: demo.galleryStyle,

      aboutText: fill(d.aboutText),
      // Service count picks the column layout (3 -> 3-wide, 4 -> 4-wide).
      services: fill(d.services.slice(0, demo.serviceCount)),
      whyChooseUs: fill(d.whyChooseUs.slice(0, demo.whyCount)),
      faq: demo.faqCount > 0 ? fill(d.faq.slice(0, demo.faqCount)) : [],
      trustBadges: demo.trustBadges,
      showStats: demo.showStats,
      sectionOrder: demo.sectionOrder ?? [],
      ctaText: fill(d.ctaText),
      emergencyService: Boolean(d.emergencyService),
      freeEstimates: demo.industry === "plumbing",

      formHeading: demo.form.heading ?? null,
      formBlurb: demo.form.blurb ?? null,
      formButtonText: demo.form.buttonText ?? null,
      formServiceLabel: demo.form.serviceLabel ?? null,
      formMessageLabel: demo.form.messageLabel ?? null,
      formNote: demo.form.note ?? null,
      formShowService: demo.form.showService,
      formShowMessage: demo.form.showMessage,
      formRequireEmail: false,

      phone: demo.phone,
      // No email on purpose: a fake address either bounces or belongs to
      // someone real. The number is in the reserved fictional range.
      email: null,
      showEmailContact: false,
      smsEnabled: Boolean(demo.smsEnabled),
      bookingUrl: demo.bookingUrl ?? null,
      contactNote: demo.contactNote ?? null,
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
    console.log(
      `/p/${preview.slug.padEnd(24)} ${d.variant.padEnd(12)} ${demo.headingFont.padEnd(16)} ` +
        `${demo.serviceCount} services · ${demo.galleryCount} photos (${demo.galleryStyle}) · ${demo.faqCount} FAQ · stats ${demo.showStats ? "on" : "off"}
` +
        `${" ".repeat(3)}order: ${orderSections(preview.sectionOrder).join(" > ")}`
    );
  }

  console.log("\nDone. They appear on the landing page under Examples.");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exitCode = 1;
});
