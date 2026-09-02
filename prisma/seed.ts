import { PrismaClient, ProspectStatus, ActivityType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // --- Admin user ---
  const email = process.env.SEED_ADMIN_EMAIL || "you@webser.io";
  const password = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";
  const name = process.env.SEED_ADMIN_NAME || "Admin";

  const passwordHash = await bcrypt.hash(password, 10);

  // `update` deliberately carries the hash: with an empty update, editing
  // SEED_ADMIN_PASSWORD in .env changed nothing and re-running the seed
  // silently kept the old password, which is the opposite of what anyone
  // expects from a variable named that. Seeding is the way credentials are
  // set, so it has to actually set them.
  const admin = await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash },
    create: { email, name, passwordHash, role: "ADMIN" },
  });
  console.log(`Admin user ready: ${admin.email} (password set from SEED_ADMIN_PASSWORD)`);

  // --- Pricing ---
  // Single flat offer: $100 to build the site, $25/mo for edits & maintenance.
  const packages = [
    {
      name: "Website",
      description: "A complete, mobile-friendly website for your business — built and launched for you.",
      price: 100,
      monthlyPrice: 25,
      sortOrder: 1,
      features: [
        "Custom website built for your business",
        "Mobile responsive design",
        "Photo gallery & services section",
        "Quote request form that emails you",
        "Google Maps & business hours",
        "Basic on-page SEO",
        "You own your domain and your site",
      ],
    },
  ];

  // Replace any legacy tiered packages so pricing reflects the current offer.
  await prisma.package.deleteMany({ where: { name: { in: ["Starter", "Business", "Premium"] } } });

  for (const pkg of packages) {
    const existing = await prisma.package.findFirst({ where: { name: pkg.name } });
    if (existing) {
      await prisma.package.update({ where: { id: existing.id }, data: pkg });
    } else {
      await prisma.package.create({ data: pkg });
    }
  }
  console.log("Pricing ready: $100 build + $25/mo maintenance.");

  // --- Templates (industry starting points, used in Phase 2) ---
  // One template per business category, so nothing falls back to a generic
  // "general contractor" starting point.
  const templates = [
    { name: "Plumber Template", industry: "plumbing", slug: "plumbing" },
    { name: "Electrician Template", industry: "electrician", slug: "electrician" },
    { name: "HVAC Template", industry: "hvac", slug: "hvac" },
    { name: "Landscaping Template", industry: "landscaping", slug: "landscaping" },
    { name: "Roofing Template", industry: "roofing", slug: "roofing" },
    { name: "Auto Repair Template", industry: "auto-repair", slug: "auto-repair" },
    { name: "Locksmith Template", industry: "locksmith", slug: "locksmith" },
    { name: "Pest Control Template", industry: "pest-control", slug: "pest-control" },
    { name: "Handyman Template", industry: "handyman", slug: "handyman" },
    { name: "Garage Door Template", industry: "garage-door", slug: "garage-door" },
    { name: "Fence Template", industry: "fence", slug: "fence" },
    { name: "Concrete Template", industry: "concrete", slug: "concrete" },
    { name: "Tree Service Template", industry: "tree-service", slug: "tree-service" },
    { name: "Painting Template", industry: "painting", slug: "painting" },
    { name: "Junk Removal Template", industry: "junk-removal", slug: "junk-removal" },
    { name: "Restaurant Template", industry: "restaurant", slug: "restaurant" },
    { name: "Barber / Salon Template", industry: "barber-salon", slug: "barber-salon" },
    { name: "Dental Template", industry: "dental", slug: "dental" },
    { name: "General Contractor Template", industry: "general-contractor", slug: "general-contractor" },
  ];

  for (const t of templates) {
    await prisma.template.upsert({
      where: { slug: t.slug },
      update: {},
      create: {
        ...t,
        description: `Starting point for ${t.industry.replace("-", " ")} businesses.`,
        sections: {
          hero: { headline: "", subheadline: "" },
          about: { text: "" },
          services: [],
          gallery: [],
          testimonials: [],
        },
      },
    });
  }
  console.log("Templates ready.");

  // --- Sample prospects (realistic local blue-collar businesses, for demo) ---
  const prospects: {
    businessName: string;
    category: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    status: ProspectStatus;
    source: string;
    notes?: string;
  }[] = [
    {
      businessName: "Larsen & Sons Plumbing",
      category: "Plumber",
      phone: "(913) 669-9397",
      address: "1200 S Payne St Ste B",
      city: "Olathe",
      state: "KS",
      status: ProspectStatus.NEW,
      source: "Google Maps research",
      notes: "No website found anywhere online. 4.8 rating, 48 reviews — strong candidate.",
    },
    {
      businessName: "Rob's Auto Service",
      category: "Auto Repair",
      phone: "(913) 782-3808",
      address: "325 S Kansas Ave",
      city: "Olathe",
      state: "KS",
      status: ProspectStatus.CONTACTED,
      source: "Google Maps research",
      notes: "30+ years in business, no website. Left voicemail 8/28.",
    },
    {
      businessName: "D & B Tree Service LLC",
      category: "Tree Service",
      phone: "(913) 206-1533",
      address: "12819 S Navaho Dr",
      city: "Olathe",
      state: "KS",
      status: ProspectStatus.INTERESTED,
      source: "Google Maps research",
      notes: "Owner Dutch is interested, asked to see a mockup.",
    },
    {
      businessName: "Champion Painting Company LLC",
      category: "Painter",
      phone: "(913) 915-1089",
      address: "132 N Fir St Ste B",
      city: "Olathe",
      state: "KS",
      status: ProspectStatus.PREVIEW_SENT,
      source: "Google Maps research",
      notes: "Domain championpaintingcompany.com is a dead parked page — good talking point.",
    },
    {
      businessName: "Crawford Construction",
      category: "Concrete Contractor",
      phone: "(913) 238-4580",
      address: "19427 W 167th St",
      city: "Olathe",
      state: "KS",
      status: ProspectStatus.FOLLOW_UP_LATER,
      source: "Google Maps research",
      notes: "Spoke with owner, call back after Labor Day.",
    },
    {
      businessName: "Johnny's Handyman Service",
      category: "Handyman",
      phone: "(913) 206-9013",
      address: "14759 S Alden St",
      city: "Olathe",
      state: "KS",
      status: ProspectStatus.WON,
      source: "Google Maps research",
      notes: "Signed for the Business package.",
    },
    // These three cover the non-trade layout variants (care / hospitality / style)
    // so every template personality is represented in a fresh install.
    {
      businessName: "Olathe Family Dental",
      category: "Dental",
      phone: "(913) 764-2020",
      address: "1408 E Santa Fe St",
      city: "Olathe",
      state: "KS",
      status: ProspectStatus.INTERESTED,
      source: "Google Maps research",
      notes: "Site is a single page from ~2011. Wants online booking.",
    },
    {
      businessName: "The Corner Table",
      category: "Restaurant",
      phone: "(913) 782-4411",
      address: "126 N Cherry St",
      city: "Olathe",
      state: "KS",
      status: ProspectStatus.RESEARCHING,
      source: "Drive-by",
      notes: "Menu only exists as a Facebook photo album.",
    },
    {
      businessName: "Santa Fe Barber Co.",
      category: "Barber / Salon",
      phone: "(913) 829-3311",
      address: "215 E Santa Fe St",
      city: "Olathe",
      state: "KS",
      status: ProspectStatus.NEW,
      source: "Google Maps research",
      notes: "No website. Strong Instagram following — good candidate.",
    },
  ];

  for (const p of prospects) {
    const created = await prisma.prospect.upsert({
      where: { id: `seed-${p.businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` },
      update: {},
      create: {
        id: `seed-${p.businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        businessName: p.businessName,
        category: p.category,
        phone: p.phone,
        address: p.address,
        city: p.city,
        state: p.state,
        status: p.status,
        source: p.source,
        notes: p.notes,
        estimatedPrice: 100,
      },
    });

    const hasActivity = await prisma.activity.findFirst({ where: { prospectId: created.id } });
    if (!hasActivity) {
      await prisma.activity.create({
        data: {
          prospectId: created.id,
          type: ActivityType.SYSTEM,
          description: "Prospect added to pipeline.",
          createdById: admin.id,
        },
      });
    }
  }
  console.log("Sample prospects ready.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
