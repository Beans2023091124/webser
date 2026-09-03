import { PreviewStatus } from "@prisma/client";
import { TRADE_INDUSTRIES } from "./industries-trades";

// ---------------------------------------------------------------------------
// Layout variants
//
// The fastest way to make generated sites look templated is to give every
// industry the same layout with different colors. These four "personalities"
// have genuinely different heroes, type treatments, and section rhythms.
// ---------------------------------------------------------------------------

export type LayoutVariant = "trade" | "hospitality" | "care" | "style";

export const LAYOUT_VARIANT_LABELS: Record<LayoutVariant, string> = {
  trade: "Trade / Contractor — bold, phone-forward, high contrast",
  hospitality: "Hospitality — warm, photo-led, editorial serif",
  care: "Care / Medical — calm, soft, appointment-focused",
  style: "Style / Salon — dark, fashion-forward, booking-focused",
};

export type ServiceItem = { name: string; description?: string; icon?: string };
export type TestimonialItem = { name: string; quote: string; rating: number };
export type WhyItem = { title: string; description: string };
export type FaqItem = { question: string; answer: string };
export type HoursMap = Record<string, string>;

/**
 * Stock photography for each template, served from /public/templates.
 * Vendored rather than hot-linked so previews keep working offline and don't
 * depend on a third party staying up. These are placeholders — the whole point
 * of the sales call is to swap in the client's own job photos.
 */
export function templateHero(industry: string): string {
  return `/templates/${industry}/hero.jpg`;
}

export function templateGallery(industry: string): string[] {
  return [1, 2, 3, 4, 5, 6].map((n) => `/templates/${industry}/${n}.jpg`);
}

export type IndustryDefaults = {
  label: string;
  variant: LayoutVariant;
  primaryColor: string;
  secondaryColor: string;
  headingFont: string;
  bodyFont: string;
  tagline: string;
  heroHeadline: string;
  heroSubheadline: string;
  aboutHeading: string;
  aboutText: string;
  services: ServiceItem[];
  whyChooseUs: WhyItem[];
  faq: FaqItem[];
  trustBadges: string[];
  ctaText: string;
  emergencyService: boolean;
};

// {business} and {city} are substituted at generation time.
export const INDUSTRY_DEFAULTS: Record<string, IndustryDefaults> = {
  plumbing: {
    label: "Plumbing",
    variant: "trade",
    primaryColor: "#0B6BCB",
    secondaryColor: "#0C1B2A",
    headingFont: "Barlow Condensed",
    bodyFont: "Inter",
    tagline: "Licensed & insured · {city}",
    heroHeadline: "Plumbing problems don't wait. Neither do we.",
    heroSubheadline:
      "Same-day service for leaks, clogs, and water heaters across {city}. You'll get a real price before we pick up a wrench.",
    aboutHeading: "The plumber your neighbors already call",
    aboutText:
      "{business} handles the everyday stuff and the 2 a.m. emergencies. We're licensed, insured, and we've been doing this long enough to diagnose most problems before we're through the door. You'll get a straight answer, a written price, and a clean job site when we leave.",
    services: [
      { name: "Emergency Repairs", description: "Burst pipes, major leaks, and no-water calls — day or night.", icon: "siren" },
      { name: "Drain & Sewer Cleaning", description: "Camera inspection and clearing for the clogs a plunger won't touch.", icon: "waves" },
      { name: "Water Heaters", description: "Repair, replacement, and tankless upgrades. Gas or electric.", icon: "flame" },
      { name: "Repiping", description: "Full and partial repipes for old galvanized and failing polybutylene.", icon: "gitBranch" },
      { name: "Fixtures & Faucets", description: "Sinks, toilets, tubs, and disposals installed or repaired.", icon: "droplets" },
      { name: "Gas Lines", description: "New runs, leak detection, and appliance hookups done to code.", icon: "zap" },
    ],
    whyChooseUs: [
      { title: "You get the price first", description: "We quote the job before we start. What we say is what you pay — no surprise line items." },
      { title: "No upselling", description: "If a $40 part fixes it, we'll tell you. We'd rather have your next ten calls than one big invoice." },
      { title: "We clean up", description: "Drop cloths, shoe covers, and we haul off the old equipment. You shouldn't be able to tell we were there." },
    ],
    faq: [
      { question: "Do you charge for estimates?", answer: "No. Estimates are free, and we'll give you the number before any work begins." },
      { question: "How fast can you get here?", answer: "Most calls in {city} are same-day. True emergencies — burst pipes, no water, sewage backups — go to the front of the line." },
      { question: "Do you work weekends?", answer: "Yes. Weekend and after-hours service is available for emergencies." },
      { question: "Are you licensed and insured?", answer: "Fully licensed and insured. We're glad to show you the paperwork before we start." },
    ],
    trustBadges: ["Licensed & Insured", "Same-Day Service", "Upfront Pricing", "Free Estimates"],
    ctaText: "Get a Free Estimate",
    emergencyService: true,
  },

  "auto-repair": {
    label: "Auto Repair",
    variant: "trade",
    primaryColor: "#C81E1E",
    secondaryColor: "#16181D",
    headingFont: "Oswald",
    bodyFont: "Inter",
    tagline: "Independent shop · {city}",
    heroHeadline: "The shop that tells you what's actually wrong.",
    heroSubheadline:
      "Honest diagnostics and repairs that hold up, from techs who've been under the hood a long time. No upsells, no mystery charges.",
    aboutHeading: "A repair shop that acts like it wants you back",
    aboutText:
      "{business} has kept {city} drivers on the road for years. We diagnose the actual problem instead of throwing parts at it, we show you what we replaced, and we put the estimate in writing before we touch anything. If you don't need the repair, we'll say so.",
    services: [
      { name: "Check Engine Diagnostics", description: "We pull the codes and then actually find the cause.", icon: "gauge" },
      { name: "Brakes", description: "Pads, rotors, calipers, and lines — inspected free with any service.", icon: "disc" },
      { name: "Oil & Maintenance", description: "Factory-schedule maintenance that keeps your warranty intact.", icon: "droplet" },
      { name: "Transmission", description: "Fluid service, diagnostics, and repair for automatics and manuals.", icon: "cog" },
      { name: "A/C & Heating", description: "Recharge, leak detection, compressor and blower repair.", icon: "wind" },
      { name: "Tires & Alignment", description: "Mounting, balancing, rotation, and four-wheel alignment.", icon: "circleDot" },
    ],
    whyChooseUs: [
      { title: "We show you the old part", description: "Every replaced component is set aside for you to look at. Nothing gets replaced that didn't need it." },
      { title: "Written estimate first", description: "You approve the number before we start. If we find something else, we call — we don't just add it." },
      { title: "Most repairs same day", description: "We stock the common parts so your car isn't sitting here waiting on a delivery truck." },
    ],
    faq: [
      { question: "Do I need an appointment?", answer: "Walk-ins are welcome for diagnostics and quick service, but calling ahead gets you in and out faster." },
      { question: "Do you warranty your work?", answer: "Yes — parts and labor are covered. We'll go over the specific terms for your repair when you approve the estimate." },
      { question: "Can I wait while you work?", answer: "Absolutely. Most maintenance and brake jobs are done while you wait." },
      { question: "Will this void my factory warranty?", answer: "No. Independent shops can perform scheduled maintenance without affecting your manufacturer warranty." },
    ],
    trustBadges: ["ASE-Certified Techs", "Warranty on Repairs", "Free Estimates", "Most Repairs Same Day"],
    ctaText: "Schedule a Repair",
    emergencyService: false,
  },

  roofing: {
    label: "Roofing",
    variant: "trade",
    primaryColor: "#C2410C",
    secondaryColor: "#1A1613",
    headingFont: "Barlow Condensed",
    bodyFont: "Inter",
    tagline: "Storm damage & full replacements · {city}",
    heroHeadline: "A roof that holds up. And a crew that shows up.",
    heroSubheadline:
      "Storm damage, leaks, and full replacements across {city}. Free inspections, and we'll walk you through the insurance claim start to finish.",
    aboutHeading: "Local roofers, not storm chasers",
    aboutText:
      "{business} is based here and stays here. When a hailstorm rolls through, out-of-state crews show up, cut corners, and disappear before the first leak. We're the ones you can find next spring — and the year after that.",
    services: [
      { name: "Roof Replacement", description: "Full tear-off and install with a workmanship warranty behind it.", icon: "home" },
      { name: "Storm & Hail Damage", description: "Free inspection and documentation your adjuster will accept.", icon: "cloudLightning" },
      { name: "Leak Repair", description: "We find the actual entry point, not just the stain on your ceiling.", icon: "droplets" },
      { name: "Gutters & Downspouts", description: "Seamless gutters and guards that move water away from the foundation.", icon: "waves" },
      { name: "Siding & Trim", description: "Matching repairs and full replacement after wind and hail.", icon: "layers" },
      { name: "Free Inspections", description: "A real look at your roof with photos — not a sales pitch.", icon: "search" },
    ],
    whyChooseUs: [
      { title: "We handle the insurance", description: "We meet your adjuster on site, document everything, and make sure the scope covers the real damage." },
      { title: "Local crews, not subs", description: "The same people who quote your roof are the ones who install it." },
      { title: "Written warranty", description: "Manufacturer material coverage plus our own workmanship warranty, in writing." },
    ],
    faq: [
      { question: "Does an inspection cost anything?", answer: "No. Inspections are free and come with photos of anything we find, whether you hire us or not." },
      { question: "Will my insurance cover a new roof?", answer: "Often, if the damage is storm-related. We'll document it and work directly with your adjuster." },
      { question: "How long does a replacement take?", answer: "Most residential roofs are a one to two day job, weather permitting." },
      { question: "What happens to my landscaping?", answer: "We tarp the beds, protect the AC unit, and run a magnet over the whole yard for nails before we leave." },
    ],
    trustBadges: ["Free Inspections", "Insurance Claims Help", "Licensed & Insured", "Workmanship Warranty"],
    ctaText: "Get a Free Inspection",
    emergencyService: true,
  },

  landscaping: {
    label: "Landscaping",
    variant: "trade",
    primaryColor: "#15803D",
    secondaryColor: "#14261A",
    headingFont: "Barlow Condensed",
    bodyFont: "Inter",
    tagline: "Lawn care & landscape design · {city}",
    heroHeadline: "Your yard, handled.",
    heroSubheadline:
      "Weekly mowing, seasonal cleanups, and full landscape design across {city} — done on schedule by a crew that cares how it looks.",
    aboutHeading: "The same crew, every week",
    aboutText:
      "{business} shows up on the day we said, does the work properly, and leaves your property looking sharp. No rotating subcontractors, no skipped weeks, no blown grass clippings left in the driveway.",
    services: [
      { name: "Weekly Mowing", description: "Mow, edge, trim, and blow — on a set day, every week.", icon: "scissors" },
      { name: "Landscape Design", description: "Beds, borders, and plantings designed for how you actually use the yard.", icon: "penTool" },
      { name: "Spring & Fall Cleanup", description: "Leaf removal, bed cleanout, and cutbacks between seasons.", icon: "leaf" },
      { name: "Mulch & Rock", description: "Fresh mulch, decorative rock, and clean-edged beds.", icon: "mountain" },
      { name: "Tree & Shrub Care", description: "Pruning, shaping, planting, and removal.", icon: "treePine" },
      { name: "Irrigation", description: "Sprinkler install, repair, and seasonal blowouts.", icon: "droplets" },
    ],
    whyChooseUs: [
      { title: "We show up on schedule", description: "Same crew, same day each week. If weather pushes us, you hear about it from us first." },
      { title: "Flat seasonal pricing", description: "You know the monthly number up front. No per-visit surprises after a fast-growing spring." },
      { title: "We finish the details", description: "Edging, trimming around the mailbox, and blowing the walks clean is part of the job, not an add-on." },
    ],
    faq: [
      { question: "Do you require a contract?", answer: "We offer seasonal agreements for weekly service, but you're free to cancel with notice. One-time cleanups don't require anything ongoing." },
      { question: "What if it rains on my day?", answer: "We shift to the next dry day and let you know. You're never charged for a visit we didn't make." },
      { question: "Do you do one-time cleanups?", answer: "Yes — spring and fall cleanups are available whether or not you're on weekly service." },
      { question: "Are you insured?", answer: "Fully insured, and we're glad to provide a certificate before we start." },
    ],
    trustBadges: ["Free Estimates", "Fully Insured", "Weekly & Bi-Weekly", "Flat Seasonal Pricing"],
    ctaText: "Get a Free Estimate",
    emergencyService: false,
  },

  "general-contractor": {
    label: "General Contractor",
    variant: "trade",
    primaryColor: "#B45309",
    secondaryColor: "#1C1917",
    headingFont: "Barlow Condensed",
    bodyFont: "Inter",
    tagline: "Remodels & repairs · {city}",
    heroHeadline: "Built right, the first time.",
    heroSubheadline:
      "Kitchens, baths, additions, and the repair list you've been putting off. One crew, one point of contact, and a schedule we actually stick to.",
    aboutHeading: "One contractor who answers the phone",
    aboutText:
      "{business} handles the whole job — planning, permits, trades, and cleanup — so you're not the one chasing down a plumber on a Tuesday morning. You get one number to call and a straight answer about where things stand.",
    services: [
      { name: "Kitchen Remodels", description: "Cabinets, counters, plumbing, and electrical handled end to end.", icon: "chefHat" },
      { name: "Bathroom Remodels", description: "Full gut renovations and tub-to-shower conversions.", icon: "bath" },
      { name: "Additions", description: "Extra bedrooms, sunrooms, and bump-outs, permitted and inspected.", icon: "home" },
      { name: "Basement Finishing", description: "Framing through final trim, built to code for living space.", icon: "layers" },
      { name: "Decks & Exteriors", description: "Decks, porches, siding, and exterior repairs.", icon: "hammer" },
      { name: "Repairs & Punch Lists", description: "Drywall, trim, doors, and the small stuff nobody else will come out for.", icon: "wrench" },
    ],
    whyChooseUs: [
      { title: "One point of contact", description: "You talk to the person running your job, not a call center or a rotating project manager." },
      { title: "A real schedule", description: "You get start and finish dates up front, and an honest heads-up the moment anything moves." },
      { title: "Licensed and permitted", description: "We pull the permits and handle inspections. Your work is documented and done to code." },
    ],
    faq: [
      { question: "Do you handle permits?", answer: "Yes. We pull the permits and coordinate inspections as part of the job." },
      { question: "How do payments work?", answer: "A deposit to schedule, progress payments at agreed milestones, and the balance when you're satisfied at final walkthrough." },
      { question: "Will you take on small jobs?", answer: "Yes. Repairs and punch lists are welcome — a lot of our remodel clients start with one small job." },
      { question: "How long will my project take?", answer: "A bathroom typically runs two to three weeks, a kitchen four to six. You'll get a firm schedule with your estimate." },
    ],
    trustBadges: ["Licensed & Insured", "Free Estimates", "Permits Handled", "Written Schedule"],
    ctaText: "Get a Free Estimate",
    emergencyService: false,
  },

  restaurant: {
    label: "Restaurant",
    variant: "hospitality",
    primaryColor: "#9A2A2A",
    secondaryColor: "#231A14",
    headingFont: "Fraunces",
    bodyFont: "Karla",
    tagline: "Kitchen open daily",
    heroHeadline: "Come hungry.",
    heroSubheadline:
      "Scratch-made classics, cold drinks, and a room that feels like somebody's kitchen. Dine in, carry out, or let us cater your next thing.",
    aboutHeading: "Made here, every day",
    aboutText:
      "{business} cooks the way it should be done — real ingredients, prepped in-house each morning, served by people who are glad you came in. Nothing arrives frozen and nothing sits under a heat lamp.",
    services: [
      { name: "Dine In", description: "A comfortable room, full bar, and a table that's yours as long as you want it.", icon: "utensils" },
      { name: "Carry Out", description: "Call ahead or order online and we'll have it hot and ready.", icon: "shoppingBag" },
      { name: "Catering", description: "Trays, boxed lunches, and full-service spreads for any size crowd.", icon: "chefHat" },
      { name: "Private Events", description: "Book the back room for birthdays, rehearsals, and company dinners.", icon: "partyPopper" },
    ],
    whyChooseUs: [
      { title: "Scratch kitchen", description: "Sauces, dressings, and desserts are all made in-house. Nothing comes out of a bag." },
      { title: "Local and family run", description: "Same family, same recipes, same room. We know a lot of our guests by name." },
      { title: "Big enough for a crowd", description: "Walk-ins welcome, and we'll happily push tables together for the whole group." },
    ],
    faq: [
      { question: "Do you take reservations?", answer: "We seat walk-ins first, but we're glad to take reservations for parties of six or more." },
      { question: "Do you have vegetarian options?", answer: "Yes, and we can adjust most dishes. Let your server know about any allergies." },
      { question: "Can you cater an event?", answer: "Absolutely — from boxed lunches to full-service. Give us a few days' notice for large orders." },
      { question: "Is there parking?", answer: "Yes, free parking on site and additional street parking nearby." },
    ],
    trustBadges: ["Made From Scratch", "Family Owned", "Catering Available", "Free Parking"],
    ctaText: "See the Menu",
    emergencyService: false,
  },

  "barber-salon": {
    label: "Barber / Salon",
    variant: "style",
    primaryColor: "#C99A3F",
    secondaryColor: "#111111",
    headingFont: "Josefin Sans",
    bodyFont: "Jost",
    tagline: "Walk-ins & appointments",
    heroHeadline: "Walk out looking like you meant it.",
    heroSubheadline:
      "Cuts, fades, beard work, and hot-towel shaves. Book a chair or walk in — either way you're in good hands.",
    aboutHeading: "A proper chair, and time to do it right",
    aboutText:
      "{business} isn't a fifteen-minute assembly line. Our barbers take the time to actually look at your hair, ask what you want, and get the details right — the neckline, the blend, the part. You'll notice the difference in about a week, when it's still growing out clean.",
    services: [
      { name: "Haircuts", description: "Classic cuts, modern styles, and everything in between.", icon: "scissors" },
      { name: "Skin Fades", description: "Low, mid, and high fades blended properly.", icon: "sparkles" },
      { name: "Beard Trims", description: "Shape-ups, line work, and a hot towel finish.", icon: "userRound" },
      { name: "Straight Razor Shaves", description: "Hot lather, straight razor, and a cold towel. The full treatment.", icon: "wind" },
      { name: "Kids Cuts", description: "Patient barbers and no rush. First cuts welcome.", icon: "baby" },
      { name: "Color & Grey Blending", description: "Subtle blending that doesn't look like you dyed it.", icon: "palette" },
    ],
    whyChooseUs: [
      { title: "Time in the chair", description: "We book real appointment lengths so nobody's rushing to get to the next head." },
      { title: "Consultation first", description: "We talk about what you want before the clippers come out. No surprises in the mirror." },
      { title: "Walk-ins welcome", description: "Appointments get priority, but there's almost always a chair open." },
    ],
    faq: [
      { question: "Do I need an appointment?", answer: "Walk-ins are always welcome, but booking ahead guarantees your barber and your time slot." },
      { question: "How long does a cut take?", answer: "About 30 minutes for a cut, 45 with a beard trim, and an hour for the full shave service." },
      { question: "Do you cut kids' hair?", answer: "Yes — kids of any age, including first haircuts." },
      { question: "What payment do you take?", answer: "Cash, all major cards, and the usual tap-to-pay apps." },
    ],
    trustBadges: ["Walk-Ins Welcome", "Online Booking", "Licensed Barbers", "Open 6 Days"],
    ctaText: "Book an Appointment",
    emergencyService: false,
  },

  dental: {
    label: "Dental",
    variant: "care",
    primaryColor: "#0E7C8A",
    secondaryColor: "#123A42",
    headingFont: "Plus Jakarta Sans",
    bodyFont: "Plus Jakarta Sans",
    tagline: "Accepting new patients",
    heroHeadline: "Dentistry that doesn't make you dread the chair.",
    heroSubheadline:
      "Gentle cleanings, honest treatment plans, and a team that explains what's actually going on in your mouth. New patients welcome.",
    aboutHeading: "Care at your pace",
    aboutText:
      "{business} takes the time to explain what we see and why it matters, then lets you decide. No pressure, no scare tactics, and no treatment plan you didn't understand before you agreed to it. If you've been putting off a visit, we get it — and we'll go easy.",
    services: [
      { name: "Cleanings & Exams", description: "Routine preventive visits with digital x-rays.", icon: "sparkles" },
      { name: "Fillings & Crowns", description: "Tooth-colored restorations that match what's around them.", icon: "shield" },
      { name: "Teeth Whitening", description: "In-office and take-home options that actually work.", icon: "sun" },
      { name: "Implants & Bridges", description: "Permanent replacements for missing teeth.", icon: "anchor" },
      { name: "Root Canals", description: "Done comfortably, usually in a single visit.", icon: "heartPulse" },
      { name: "Emergency Visits", description: "Same-day appointments for pain, breaks, and swelling.", icon: "siren" },
    ],
    whyChooseUs: [
      { title: "We explain everything", description: "You'll see your own x-rays and photos, and understand every recommendation before you commit." },
      { title: "Comfort-first approach", description: "Numbing that actually works, sedation options, and a team that checks in constantly." },
      { title: "Straightforward with insurance", description: "We verify your benefits before your visit so you know your out-of-pocket cost in advance." },
    ],
    faq: [
      { question: "Are you accepting new patients?", answer: "Yes, and new patient appointments are usually available within a week or two." },
      { question: "What insurance do you take?", answer: "We accept most major PPO plans and file the claim for you. Call with your plan details and we'll verify coverage." },
      { question: "What if I don't have insurance?", answer: "We offer transparent self-pay pricing and payment plans. Ask us for a written estimate before treatment." },
      { question: "I'm nervous about the dentist. Can you help?", answer: "Very common, and we're used to it. Tell us when you book and we'll take extra time and discuss comfort options." },
    ],
    trustBadges: ["New Patients Welcome", "Most PPO Insurance", "Same-Day Emergencies", "Payment Plans"],
    ctaText: "Request an Appointment",
    emergencyService: true,
  },
};

// Specialist trades live in their own module purely for file size.
Object.assign(INDUSTRY_DEFAULTS, TRADE_INDUSTRIES);

export const INDUSTRY_OPTIONS = Object.keys(INDUSTRY_DEFAULTS);

const CATEGORY_TO_INDUSTRY: Record<string, string> = {
  Plumber: "plumbing",
  Electrician: "electrician",
  HVAC: "hvac",
  Landscaper: "landscaping",
  "Roofing Contractor": "roofing",
  "Auto Repair": "auto-repair",
  Locksmith: "locksmith",
  "Pest Control": "pest-control",
  Handyman: "handyman",
  "Garage Door Repair": "garage-door",
  "Fence Contractor": "fence",
  "Concrete Contractor": "concrete",
  "Tree Service": "tree-service",
  Painter: "painting",
  "Junk Removal": "junk-removal",
  Restaurant: "restaurant",
  "Barber / Salon": "barber-salon",
  Dental: "dental",
  "General Contractor": "general-contractor",
  Other: "general-contractor",
};

export function mapCategoryToIndustry(category?: string | null): string {
  if (category && CATEGORY_TO_INDUSTRY[category]) return CATEGORY_TO_INDUSTRY[category];
  return "general-contractor";
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Replace {business} / {city} tokens in seeded copy. */
export function fillTokens(text: string, business: string, city?: string | null): string {
  return text
    .replaceAll("{business}", business)
    .replaceAll("{city}", city?.trim() || "the area");
}

// How the photos are laid out. All four share the same lightbox; only the
// arrangement of the thumbnails differs.
export const GALLERY_STYLES = [
  {
    key: "mosaic",
    label: "Tiled mosaic",
    hint: "Mixed tile sizes that always fill the last row. Good for lots of photos.",
  },
  {
    key: "filmstrip",
    label: "Horizontal scroll",
    hint: "A swipeable strip that runs off the edge of the screen. Good for a handful.",
  },
  {
    key: "masonry",
    label: "Staggered columns",
    hint: "Uneven heights, like a pinboard. Good for a mix of tall and wide shots.",
  },
  {
    key: "showcase",
    label: "Feature + thumbnails",
    hint: "One large photo with a row underneath to switch between them.",
  },
] as const;

export type GalleryStyle = (typeof GALLERY_STYLES)[number]["key"];

export const DEFAULT_GALLERY_STYLE: GalleryStyle = "mosaic";

const GALLERY_STYLE_KEYS = new Set<string>(GALLERY_STYLES.map((g) => g.key));

/** Anything unrecognised falls back rather than rendering nothing. */
export function galleryStyleOf(value: string | null | undefined): GalleryStyle {
  return value && GALLERY_STYLE_KEYS.has(value)
    ? (value as GalleryStyle)
    : DEFAULT_GALLERY_STYLE;
}

// The body sections a site owner can reorder. The hero, trust strip, quote
// form and footer are deliberately not in here: the hero has to open the page,
// and the form is the conversion point, so it stays put at the bottom.
export const PAGE_SECTIONS = [
  { key: "stats", label: "The numbers", hint: "Years, rating, areas served" },
  { key: "services", label: "Services", hint: "What they do" },
  { key: "about", label: "About", hint: "The story, plus why choose us" },
  { key: "gallery", label: "Photos", hint: "The work, or the room" },
  { key: "reviews", label: "Reviews", hint: "What customers said" },
  { key: "areas", label: "Service areas", hint: "Towns covered" },
  { key: "faq", label: "Questions", hint: "The FAQ list" },
] as const;

export type PageSectionKey = (typeof PAGE_SECTIONS)[number]["key"];

export const DEFAULT_SECTION_ORDER = PAGE_SECTIONS.map((s) => s.key) as PageSectionKey[];

const SECTION_KEY_SET = new Set<string>(DEFAULT_SECTION_ORDER);

/**
 * Turn a stored order into one that is always safe to render: known keys only,
 * no duplicates, and anything missing appended in the default order. That last
 * part means a site saved today still shows a section added next month, so new
 * sections never need a data backfill.
 */
export function orderSections(stored: string[] | null | undefined): PageSectionKey[] {
  const seen = new Set<PageSectionKey>();
  const out: PageSectionKey[] = [];
  for (const key of stored ?? []) {
    if (SECTION_KEY_SET.has(key) && !seen.has(key as PageSectionKey)) {
      seen.add(key as PageSectionKey);
      out.push(key as PageSectionKey);
    }
  }
  for (const key of DEFAULT_SECTION_ORDER) if (!seen.has(key)) out.push(key);
  return out;
}

/** Parse the hidden field the reorder control posts. */
export function parseSectionOrder(raw: string | undefined): PageSectionKey[] {
  if (!raw?.trim()) return [];
  const keys = raw.split(",").map((k) => k.trim());
  // Only persist a real customisation; the default is stored as empty so a
  // later change to the default order still reaches sites nobody reordered.
  const ordered = orderSections(keys);
  const isDefault = ordered.every((k, i) => k === DEFAULT_SECTION_ORDER[i]);
  return isDefault ? [] : ordered;
}

// Nearby-city suggestions so generated sites carry a real service-area section.
export const METRO_NEIGHBORS: Record<string, string[]> = {
  Olathe: ["Olathe", "Overland Park", "Lenexa", "Shawnee", "Gardner", "Spring Hill"],
  "Overland Park": ["Overland Park", "Olathe", "Leawood", "Lenexa", "Prairie Village"],
  Lenexa: ["Lenexa", "Olathe", "Shawnee", "Overland Park", "De Soto"],
  Shawnee: ["Shawnee", "Lenexa", "Merriam", "Olathe", "Bonner Springs"],
};

export function suggestServiceAreas(city?: string | null): string[] {
  if (!city) return [];
  const match = METRO_NEIGHBORS[city.trim()];
  if (match) return match;
  return [city.trim()];
}

export const PREVIEW_STATUS_LABELS: Record<PreviewStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  DISABLED: "Disabled",
};

export const PREVIEW_STATUS_COLORS: Record<PreviewStatus, string> = {
  DRAFT: "bg-slate-800 text-slate-300 ring-slate-700",
  ACTIVE: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/30",
  DISABLED: "bg-red-500/10 text-red-400 ring-red-500/30",
};

// Fonts offered in the editor. All are Google Fonts loaded by the public page.
export const HEADING_FONT_OPTIONS = [
  "Barlow Condensed",
  "Oswald",
  "Anton",
  "Fraunces",
  "Playfair Display",
  "Josefin Sans",
  "Plus Jakarta Sans",
  "Outfit",
  "Inter",
];

export const BODY_FONT_OPTIONS = [
  "Inter",
  "Karla",
  "Jost",
  "Plus Jakarta Sans",
  "Source Sans 3",
  "Outfit",
];

// A dentist shouldn't say "request a free estimate", and a barber shouldn't
// either. Form copy follows the layout personality.
export const FORM_COPY: Record<LayoutVariant, { heading: string; blurb: string }> = {
  trade: {
    heading: "Request a free estimate",
    blurb: "Tell us what you need and we'll get right back to you.",
  },
  care: {
    heading: "Request an appointment",
    blurb: "Send us a note and our front desk will reach out to schedule you.",
  },
  hospitality: {
    heading: "Get in touch",
    blurb: "Reservations, catering, or private events — let us know what you need.",
  },
  style: {
    heading: "Book a chair",
    blurb: "Tell us what you're after and we'll get you scheduled.",
  },
};

// Section headings follow the personality too — a restaurant doesn't have
// "Services" and a barber shop doesn't have a "project".
export const SECTION_COPY: Record<
  LayoutVariant,
  { servicesEyebrow: string; servicesHeading: string; galleryHeading: string; contactHeading: string }
> = {
  trade: {
    servicesEyebrow: "What we do",
    servicesHeading: "Services",
    galleryHeading: "Recent work",
    contactHeading: "Let's talk about your project",
  },
  care: {
    servicesEyebrow: "Our care",
    servicesHeading: "What we offer",
    galleryHeading: "Our office",
    contactHeading: "Schedule your visit",
  },
  hospitality: {
    servicesEyebrow: "The experience",
    servicesHeading: "Ways to enjoy us",
    galleryHeading: "From the kitchen",
    contactHeading: "Come see us",
  },
  style: {
    servicesEyebrow: "The menu",
    servicesHeading: "Services",
    galleryHeading: "Our work",
    contactHeading: "Book with us",
  },
};

export const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function defaultHours(variant: LayoutVariant = "trade"): HoursMap {
  if (variant === "hospitality") {
    return {
      Monday: "11:00 AM – 9:00 PM",
      Tuesday: "11:00 AM – 9:00 PM",
      Wednesday: "11:00 AM – 9:00 PM",
      Thursday: "11:00 AM – 9:00 PM",
      Friday: "11:00 AM – 10:00 PM",
      Saturday: "11:00 AM – 10:00 PM",
      Sunday: "11:00 AM – 8:00 PM",
    };
  }
  if (variant === "style") {
    return {
      Monday: "Closed",
      Tuesday: "9:00 AM – 7:00 PM",
      Wednesday: "9:00 AM – 7:00 PM",
      Thursday: "9:00 AM – 7:00 PM",
      Friday: "9:00 AM – 7:00 PM",
      Saturday: "8:00 AM – 4:00 PM",
      Sunday: "Closed",
    };
  }
  return {
    Monday: "7:00 AM – 5:00 PM",
    Tuesday: "7:00 AM – 5:00 PM",
    Wednesday: "7:00 AM – 5:00 PM",
    Thursday: "7:00 AM – 5:00 PM",
    Friday: "7:00 AM – 5:00 PM",
    Saturday: "By appointment",
    Sunday: "Closed",
  };
}
