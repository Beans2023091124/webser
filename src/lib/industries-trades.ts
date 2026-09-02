import type { IndustryDefaults } from "./preview";

/**
 * Specialist trade templates.
 *
 * These used to all fall back to the general-contractor template, which meant
 * an electrician and a junk hauler got the same headline and the same six
 * services. Each one now has its own copy, palette, and service list.
 */
export const TRADE_INDUSTRIES: Record<string, IndustryDefaults> = {
  electrician: {
    label: "Electrician",
    variant: "trade",
    primaryColor: "#D97706",
    secondaryColor: "#181410",
    headingFont: "Oswald",
    bodyFont: "Inter",
    tagline: "Licensed electricians · {city}",
    heroHeadline: "Wiring done right, and done to code.",
    heroSubheadline:
      "Panel upgrades, dead outlets, and new circuits across {city}. We pull the permit, do the work properly, and get it inspected.",
    aboutHeading: "The electrician who explains it",
    aboutText:
      "{business} handles everything from a single dead outlet to a full panel replacement. We'll show you what's actually wrong, tell you what it costs before we start, and leave you with a labelled panel you can actually read.",
    services: [
      { name: "Panel Upgrades", description: "100A to 200A service upgrades, permitted and inspected.", icon: "zap" },
      { name: "Troubleshooting", description: "Dead outlets, tripping breakers, and flickering lights traced to the real cause.", icon: "search" },
      { name: "New Circuits & Outlets", description: "Dedicated circuits for appliances, shops, and home offices.", icon: "plug" },
      { name: "Lighting Installation", description: "Recessed, under-cabinet, ceiling fans, and outdoor lighting.", icon: "lightbulb" },
      { name: "EV Charger Install", description: "Level 2 home chargers wired to code on a dedicated circuit.", icon: "batteryCharging" },
      { name: "Generator Hookup", description: "Transfer switches and standby generator wiring.", icon: "shieldCheck" },
    ],
    whyChooseUs: [
      { title: "We pull the permit", description: "Electrical work that was never inspected can cost you at resale. We handle the permit and the inspection." },
      { title: "We find the actual fault", description: "Anyone can replace a breaker. We trace why it tripped so it doesn't happen again next month." },
      { title: "You get a labelled panel", description: "Every circuit mapped and labelled before we leave. You'll never guess at a breaker again." },
    ],
    faq: [
      { question: "Do you pull permits?", answer: "Yes, on any work that needs one. It protects you at resale and it's how we make sure the job is right." },
      { question: "Why do my breakers keep tripping?", answer: "Usually an overloaded circuit, a failing breaker, or a short. We trace the cause rather than just swapping the breaker." },
      { question: "Can you install an EV charger?", answer: "Yes. We'll check whether your panel has the capacity and run a dedicated circuit out to the garage." },
      { question: "Are you licensed and insured?", answer: "Fully licensed and insured, and glad to show you the paperwork before we start." },
    ],
    trustBadges: ["Licensed & Insured", "Permits Pulled", "Upfront Pricing", "Free Estimates"],
    ctaText: "Get a Free Estimate",
    emergencyService: true,
  },

  hvac: {
    label: "HVAC",
    variant: "trade",
    primaryColor: "#0E7490",
    secondaryColor: "#0E1A1F",
    headingFont: "Barlow Condensed",
    bodyFont: "Inter",
    tagline: "Heating & cooling · {city}",
    heroHeadline: "Comfortable house. Honest quote.",
    heroSubheadline:
      "Furnace and AC repair, replacement, and maintenance across {city}. We'll tell you when a repair makes more sense than a new system.",
    aboutHeading: "We'd rather fix it than sell you one",
    aboutText:
      "{business} services every major brand, and we're straight with you about what your system actually needs. Plenty of units have years left in them — if yours does, we'll say so instead of quoting a replacement.",
    services: [
      { name: "AC Repair", description: "Not cooling, short cycling, or frozen coils diagnosed and fixed.", icon: "snowflake" },
      { name: "Furnace Repair", description: "No heat, short cycling, and ignition faults on any major brand.", icon: "flame" },
      { name: "System Replacement", description: "Right-sized furnaces and AC units, installed and commissioned.", icon: "thermometer" },
      { name: "Maintenance Plans", description: "Spring and fall tune-ups that catch problems before the season starts.", icon: "timer" },
      { name: "Ductwork", description: "Sealing, repair, and new runs for rooms that are never comfortable.", icon: "wind" },
      { name: "Indoor Air Quality", description: "Filtration, humidifiers, and fresh-air ventilation.", icon: "fan" },
    ],
    whyChooseUs: [
      { title: "Repair before replace", description: "We quote the repair first and only recommend replacement when the numbers actually favour it." },
      { title: "We size it properly", description: "An oversized unit short-cycles and never dehumidifies. We run the load calculation instead of guessing." },
      { title: "One flat diagnostic fee", description: "A single diagnostic charge, credited toward the repair if you go ahead." },
    ],
    faq: [
      { question: "How long should a furnace last?", answer: "Fifteen to twenty years with maintenance. Past that, repair costs usually start outrunning the value." },
      { question: "Do you service all brands?", answer: "Yes — we repair every major brand, regardless of who installed it." },
      { question: "How often should I change the filter?", answer: "Every one to three months depending on the filter and whether you have pets. It's the cheapest thing you can do for the system." },
      { question: "Do you offer maintenance plans?", answer: "Yes. Two visits a year, priority scheduling, and a discount on repairs." },
    ],
    trustBadges: ["Licensed & Insured", "All Major Brands", "Free Estimates", "24/7 Emergency"],
    ctaText: "Schedule Service",
    emergencyService: true,
  },

  locksmith: {
    label: "Locksmith",
    variant: "trade",
    primaryColor: "#B45309",
    secondaryColor: "#16161A",
    headingFont: "Oswald",
    bodyFont: "Inter",
    tagline: "24/7 mobile locksmith · {city}",
    heroHeadline: "Locked out? We're already moving.",
    heroSubheadline:
      "Fast, licensed locksmith service for homes, cars, and businesses across {city}. Days, nights, and weekends.",
    aboutHeading: "Licensed, bonded, and actually local",
    aboutText:
      "{business} is a local mobile locksmith, not a call centre that dispatches whoever happens to be nearest. You get a real price on the phone, a licensed tech at your door, and no renegotiating once the lock is open.",
    services: [
      { name: "Emergency Lockouts", description: "Homes, cars, and offices opened without damage.", icon: "keyRound" },
      { name: "Rekey & Re-pin", description: "New tenants or a lost key? Rekey instead of replacing the hardware.", icon: "lock" },
      { name: "Lock Installation", description: "Deadbolts, handlesets, and commercial-grade hardware.", icon: "shieldCheck" },
      { name: "Car Key Replacement", description: "Transponder keys and fobs cut and programmed on site.", icon: "circleParking" },
      { name: "Safe Service", description: "Safe opening, combination changes, and relocation.", icon: "package" },
      { name: "Smart Locks", description: "Keypad and app-controlled locks supplied and fitted.", icon: "plug" },
    ],
    whyChooseUs: [
      { title: "A real price on the phone", description: "You'll know the call-out and the likely total before we're dispatched. No surprises at your door." },
      { title: "We open, we don't drill", description: "Damage-free entry wherever possible. Drilling is a last resort, never the opening move." },
      { title: "Licensed and bonded", description: "A registered local business, and every tech carries ID." },
    ],
    faq: [
      { question: "How fast can you get here?", answer: "Most calls in {city} are reached within about thirty minutes. Lockouts go to the front of the queue." },
      { question: "Will you damage my lock?", answer: "Almost never. We pick or bypass wherever possible, and only drill when a lock genuinely can't be opened another way." },
      { question: "Can you make a car key without the original?", answer: "Yes, for most makes and models. We cut and program on site." },
      { question: "What ID do you need?", answer: "Proof you belong at the property — a licence, lease, or registration. It protects everyone." },
    ],
    trustBadges: ["24/7 Service", "Licensed & Bonded", "30-Min Response", "Upfront Pricing"],
    ctaText: "Call for Service",
    emergencyService: true,
  },

  "pest-control": {
    label: "Pest Control",
    variant: "trade",
    primaryColor: "#15803D",
    secondaryColor: "#12210F",
    headingFont: "Barlow Condensed",
    bodyFont: "Inter",
    tagline: "Family & pet safe · {city}",
    heroHeadline: "Pests gone. And kept gone.",
    heroSubheadline:
      "Treatment and prevention for ants, roaches, spiders, and rodents across {city}. Family- and pet-safe products, applied by licensed techs.",
    aboutHeading: "Treat the cause, not just what you saw",
    aboutText:
      "{business} finds where pests are getting in and why they're staying, then treats accordingly. Spraying a baseboard kills what's visible today. Sealing the entry point is what keeps them out next season.",
    services: [
      { name: "General Pest Control", description: "Ants, roaches, spiders, and the usual seasonal invaders.", icon: "bug" },
      { name: "Termite Treatment", description: "Inspection, treatment, and prevention for the damage you can't see.", icon: "search" },
      { name: "Rodent Control", description: "Mice and rats removed, and the entry points sealed behind them.", icon: "rat" },
      { name: "Mosquito & Tick", description: "Yard treatments that make the outside usable again.", icon: "sprayCan" },
      { name: "Bed Bugs", description: "Heat and targeted treatment, with follow-up inspection.", icon: "shield" },
      { name: "Quarterly Plans", description: "Scheduled prevention so problems never get established.", icon: "timer" },
    ],
    whyChooseUs: [
      { title: "We seal the entry points", description: "Treatment without exclusion just resets the clock. We find how they're getting in and close it." },
      { title: "Safe around family and pets", description: "Products chosen and applied so your kids and animals can use the house the same day." },
      { title: "Free re-treatment", description: "If they come back between scheduled visits, so do we — at no charge." },
    ],
    faq: [
      { question: "Is the treatment safe for pets?", answer: "Yes. We use products rated for use around children and animals, and we'll tell you exactly how long to stay off a treated area." },
      { question: "How soon will I see results?", answer: "Most general pest problems drop off within a few days, with full control after a couple of weeks." },
      { question: "Do I need a quarterly plan?", answer: "Not necessarily. One-off treatments work for a specific problem; plans make sense if you've had repeat seasonal issues." },
      { question: "Do you offer free inspections?", answer: "Yes, including termite inspections, and you'll get photos of anything we find." },
    ],
    trustBadges: ["Licensed & Insured", "Pet & Family Safe", "Free Inspections", "Free Re-Treatment"],
    ctaText: "Get a Free Inspection",
    emergencyService: false,
  },

  handyman: {
    label: "Handyman",
    variant: "trade",
    primaryColor: "#C2410C",
    secondaryColor: "#1A1512",
    headingFont: "Barlow Condensed",
    bodyFont: "Inter",
    tagline: "Repairs & odd jobs · {city}",
    heroHeadline: "The list on your fridge, handled.",
    heroSubheadline:
      "Repairs, mounting, assembly, and all the small jobs nobody else will drive out for. One call, one visit, across {city}.",
    aboutHeading: "Small jobs are the whole job here",
    aboutText:
      "Most contractors won't come out for a sticking door and a loose railing. {business} will — and we'll usually knock out the rest of the list while we're there. Save them up; one visit costs less than three call-outs.",
    services: [
      { name: "Drywall Repair", description: "Holes, cracks, and water damage patched and painted to match.", icon: "layers" },
      { name: "TV & Shelf Mounting", description: "Mounted into studs, levelled, with the cables hidden.", icon: "tv" },
      { name: "Furniture Assembly", description: "Flat-pack built properly and anchored to the wall.", icon: "package" },
      { name: "Doors & Locks", description: "Sticking doors planed, hinges reset, deadbolts fitted.", icon: "doorOpen" },
      { name: "Fixture Swaps", description: "Faucets, lights, fans, and toilets replaced.", icon: "wrenchAlt" },
      { name: "Punch Lists", description: "Bring us the whole list — one trip covers it.", icon: "hammer" },
    ],
    whyChooseUs: [
      { title: "No job too small", description: "A single loose handle is a fine reason to call. We'd rather do the small job than turn you away." },
      { title: "One trip, whole list", description: "Batch your jobs and you pay one call-out instead of several." },
      { title: "We clean up", description: "Dust sheets down, debris out, and the room left the way we found it." },
    ],
    faq: [
      { question: "Is there a minimum charge?", answer: "There's a one-hour minimum, which is why it's worth saving up a few jobs for a single visit." },
      { question: "Do you supply materials?", answer: "We can, or you can buy them yourself. We'll tell you exactly what to get if you'd rather source it." },
      { question: "What don't you do?", answer: "Anything needing a specialist licence — major electrical, gas, and structural work. We'll say so straight away and point you to someone who does." },
      { question: "Are you insured?", answer: "Fully insured, and glad to send the certificate before we start." },
    ],
    trustBadges: ["No Job Too Small", "Fully Insured", "Free Estimates", "One-Trip Service"],
    ctaText: "Get a Free Estimate",
    emergencyService: false,
  },

  "garage-door": {
    label: "Garage Door Repair",
    variant: "trade",
    primaryColor: "#1D4ED8",
    secondaryColor: "#111726",
    headingFont: "Barlow Condensed",
    bodyFont: "Inter",
    tagline: "Same-day repair · {city}",
    heroHeadline: "Door stuck? We'll have it moving today.",
    heroSubheadline:
      "Broken springs, dead openers, and off-track doors across {city}. Most repairs are done on the first visit.",
    aboutHeading: "One visit, one working door",
    aboutText:
      "{business} stocks the common springs, rollers, and opener parts on the truck, so most calls are finished the same day. A broken spring is also the most dangerous part of the door — it's genuinely worth leaving to someone with the right tools.",
    services: [
      { name: "Broken Springs", description: "Torsion and extension springs replaced in matched pairs.", icon: "construction" },
      { name: "Opener Repair", description: "Dead motors, faulty sensors, and remotes that stopped pairing.", icon: "plug" },
      { name: "New Doors", description: "Steel, insulated, and carriage-style doors supplied and fitted.", icon: "warehouse" },
      { name: "Cables & Rollers", description: "Frayed cables and worn rollers swapped before they snap.", icon: "cog" },
      { name: "Off-Track Doors", description: "Doors realigned and tracks straightened or replaced.", icon: "ruler" },
      { name: "Tune-Ups", description: "Balance, lubricate, and adjust — doubles the life of the opener.", icon: "timer" },
    ],
    whyChooseUs: [
      { title: "Parts on the truck", description: "We stock the springs and rollers that fail most, so you're not waiting days on an order." },
      { title: "Springs replaced in pairs", description: "Replacing one of a matched pair just means a second call-out in a few months. We do both." },
      { title: "Safety check every visit", description: "We test the auto-reverse and photo eyes before we leave, whatever we came out for." },
    ],
    faq: [
      { question: "Can I replace a spring myself?", answer: "We'd strongly advise against it. Torsion springs hold enormous tension and cause serious injuries every year." },
      { question: "How long does a repair take?", answer: "Most spring and roller jobs take under two hours, and we carry the common parts with us." },
      { question: "My remote stopped working — is the opener dead?", answer: "Usually not. It's often the battery, the sensors, or a lost pairing. We'll check the cheap causes first." },
      { question: "How long should a door last?", answer: "A door lasts decades; springs are rated in cycles and typically last seven to twelve years." },
    ],
    trustBadges: ["Same-Day Service", "Licensed & Insured", "Parts On Truck", "Free Estimates"],
    ctaText: "Get a Free Estimate",
    emergencyService: true,
  },

  fence: {
    label: "Fence Contractor",
    variant: "trade",
    primaryColor: "#A16207",
    secondaryColor: "#1C1710",
    headingFont: "Barlow Condensed",
    bodyFont: "Inter",
    tagline: "Wood, vinyl & chain link · {city}",
    heroHeadline: "Fences that stay straight.",
    heroSubheadline:
      "Wood, vinyl, and chain link across {city}. Posts set in concrete below the frost line, lines run square, and the job warrantied.",
    aboutHeading: "The part you can't see is the part that matters",
    aboutText:
      "A fence leans because the posts weren't set deep enough. {business} digs below the frost line, sets every post in concrete, and lets it cure before the panels go on. It's slower, and it's why our fences are still straight in ten years.",
    services: [
      { name: "Wood Fence", description: "Cedar and treated pine privacy fence, built on site.", icon: "fence" },
      { name: "Vinyl Fence", description: "Low-maintenance vinyl in privacy and picket styles.", icon: "blocks" },
      { name: "Chain Link", description: "Galvanised and coated chain link for yards and pets.", icon: "layers" },
      { name: "Gates & Automation", description: "Walk gates, double drive gates, and automatic openers.", icon: "doorOpen" },
      { name: "Fence Repair", description: "Leaning posts reset, panels and pickets replaced.", icon: "hammer" },
      { name: "Staining & Sealing", description: "Sealing that keeps new wood from greying out.", icon: "brush" },
    ],
    whyChooseUs: [
      { title: "Posts set below the frost line", description: "Shallow posts heave and lean after one winter. We dig deep and set every one in concrete." },
      { title: "We handle the locate", description: "Utility locates called in and property lines confirmed before a single hole is dug." },
      { title: "Written warranty", description: "Workmanship warranty in writing, on top of the manufacturer's material coverage." },
    ],
    faq: [
      { question: "Do I need a permit?", answer: "Often yes, and many neighbourhoods have height and style rules. We check both before quoting." },
      { question: "How long does installation take?", answer: "A typical residential yard is two to three days, plus curing time for the posts." },
      { question: "Who confirms the property line?", answer: "We'll work to your survey. If you don't have one, we'd recommend getting it before we build — it's far cheaper than moving a fence." },
      { question: "Wood or vinyl?", answer: "Wood costs less up front and can be stained any colour. Vinyl costs more but never needs sealing. We'll price both." },
    ],
    trustBadges: ["Free Estimates", "Licensed & Insured", "Written Warranty", "Utility Locates Handled"],
    ctaText: "Get a Free Estimate",
    emergencyService: false,
  },

  concrete: {
    label: "Concrete Contractor",
    variant: "trade",
    primaryColor: "#EA580C",
    secondaryColor: "#17171A",
    headingFont: "Oswald",
    bodyFont: "Inter",
    tagline: "Driveways, patios & slabs · {city}",
    heroHeadline: "Flatwork that doesn't crack.",
    heroSubheadline:
      "Driveways, patios, and slabs across {city} — poured on a proper base, reinforced, and cured the way concrete actually needs.",
    aboutHeading: "Anyone can pour it. Fewer can prep it.",
    aboutText:
      "Cracked concrete almost always traces back to a bad base or a rushed cure. {business} compacts the sub-base properly, uses the right reinforcement for the load, and cuts control joints where the slab wants to move.",
    services: [
      { name: "Driveways", description: "New pours and full replacements, reinforced for vehicle loads.", icon: "truck" },
      { name: "Patios & Walkways", description: "Flatwork shaped to drain away from the house.", icon: "ruler" },
      { name: "Slabs & Foundations", description: "Garage, shed, and addition slabs poured to spec.", icon: "blocks" },
      { name: "Stamped & Coloured", description: "Stamped patterns and integral colour for a finished look.", icon: "palette" },
      { name: "Concrete Repair", description: "Lifting, levelling, and resurfacing where the slab is sound.", icon: "hammer" },
      { name: "Demolition & Haul-Away", description: "Old concrete broken out and removed before the new pour.", icon: "construction" },
    ],
    whyChooseUs: [
      { title: "The base gets done right", description: "Compacted sub-base and proper thickness. It's the invisible half of the job and the reason slabs last." },
      { title: "Control joints where they belong", description: "Concrete will crack somewhere — joints decide where. We cut them at the right spacing and depth." },
      { title: "We pour for the weather", description: "Mix and cure adjusted for heat and cold. Pouring a slab wrong in July is how it fails by spring." },
    ],
    faq: [
      { question: "How long before I can drive on it?", answer: "Foot traffic after a day or two, vehicles after seven days. Concrete keeps gaining strength for a month." },
      { question: "Will it crack?", answer: "All concrete moves. Control joints decide where it cracks so the surface stays sound and the cracks stay hidden." },
      { question: "Can you match my existing concrete?", answer: "We can get close, but new concrete always cures lighter. It evens out over the first year or so." },
      { question: "Do you handle the tear-out?", answer: "Yes — demolition, haul-away, and disposal are included in the quote." },
    ],
    trustBadges: ["Free Estimates", "Licensed & Insured", "Reinforced Pours", "Tear-Out Included"],
    ctaText: "Get a Free Estimate",
    emergencyService: false,
  },

  "tree-service": {
    label: "Tree Service",
    variant: "trade",
    primaryColor: "#166534",
    secondaryColor: "#101A12",
    headingFont: "Barlow Condensed",
    bodyFont: "Inter",
    tagline: "Removal, trimming & stump grinding · {city}",
    heroHeadline: "Big trees, brought down safely.",
    heroSubheadline:
      "Removal, trimming, and stump grinding across {city}. Fully insured crews, and every branch cleaned up before we leave.",
    aboutHeading: "Insurance is the whole conversation",
    aboutText:
      "A tree coming down near a house is the one job where being underinsured can cost you everything. {business} carries full liability and workers' comp, and we'll hand you the certificate before we start. Ask anyone who quotes you for theirs.",
    services: [
      { name: "Tree Removal", description: "Rigged down in sections when there's no room to drop it.", icon: "axe" },
      { name: "Trimming & Pruning", description: "Crown thinning and deadwood removal that keeps trees healthy.", icon: "scissors" },
      { name: "Stump Grinding", description: "Ground below grade and backfilled ready for grass.", icon: "cog" },
      { name: "Storm Damage", description: "Emergency response for limbs down on roofs, cars, and lines.", icon: "cloudLightning" },
      { name: "Lot Clearing", description: "Brush and small timber cleared for building or fencing.", icon: "treePine" },
      { name: "Health Assessment", description: "Honest advice on whether a tree can be saved.", icon: "search" },
    ],
    whyChooseUs: [
      { title: "Fully insured, and we prove it", description: "Liability and workers' comp certificates handed over before the first cut. Never hire a tree crew without seeing them." },
      { title: "We rig, we don't just drop", description: "Sectional rigging near structures. Slower, safer, and your fence stays intact." },
      { title: "The yard is clean when we go", description: "Every branch chipped, the drive blown off, and ruts raked out." },
    ],
    faq: [
      { question: "Are you insured?", answer: "Fully — liability and workers' comp — and we hand you the certificates before we start. Please ask every company that quotes you." },
      { question: "Do you grind the stump too?", answer: "It's a separate service, and we'll quote it alongside removal so you can decide." },
      { question: "Can this tree be saved?", answer: "Often, yes. We'll tell you honestly if pruning will do it rather than selling you a removal." },
      { question: "What about storm emergencies?", answer: "We respond around the clock for trees on houses, cars, or blocking access." },
    ],
    trustBadges: ["Fully Insured", "Free Estimates", "24/7 Storm Response", "Complete Cleanup"],
    ctaText: "Get a Free Estimate",
    emergencyService: true,
  },

  painting: {
    label: "Painter",
    variant: "trade",
    primaryColor: "#1E5F94",
    secondaryColor: "#121A21",
    headingFont: "Barlow Condensed",
    bodyFont: "Inter",
    tagline: "Interior & exterior · {city}",
    heroHeadline: "Clean lines. No mess left behind.",
    heroSubheadline:
      "Interior and exterior painting across {city}. Proper prep, quality paint, and drop cloths over everything that isn't getting painted.",
    aboutHeading: "The prep is what you're paying for",
    aboutText:
      "Paint is the easy part. {business} spends most of the job on what happens first — filling, sanding, caulking, and masking — because that's the difference between a finish that looks sharp for a decade and one that peels in two summers.",
    services: [
      { name: "Interior Painting", description: "Walls, ceilings, and trim with everything else masked off.", icon: "paintRoller" },
      { name: "Exterior Painting", description: "Siding, trim, and soffits prepped, primed, and coated.", icon: "home" },
      { name: "Cabinet Refinishing", description: "Sprayed finishes that look factory-done, without new cabinets.", icon: "sprayCan" },
      { name: "Drywall Repair", description: "Holes and cracks filled and textured to match before painting.", icon: "layers" },
      { name: "Deck & Fence Staining", description: "Cleaned, sanded, and sealed against the weather.", icon: "brush" },
      { name: "Colour Consultation", description: "Help picking colours that work in your actual light.", icon: "palette" },
    ],
    whyChooseUs: [
      { title: "Prep is most of the job", description: "Filling, sanding, and caulking take longer than rolling. It's also the only reason a finish lasts." },
      { title: "Your house stays liveable", description: "Floors covered, furniture moved and wrapped, and the space tidied at the end of every day." },
      { title: "Two coats, always", description: "Two full coats quoted as standard. One coat looks fine on day one and patchy by year two." },
    ],
    faq: [
      { question: "Do you move furniture?", answer: "Yes — we move and wrap what's in the room, and put it back when the paint has cured." },
      { question: "How long will it take?", answer: "A typical interior room is a day; a whole-house exterior runs three to five days depending on prep and weather." },
      { question: "Whose paint do you use?", answer: "Quality trade lines as standard. If you have a brand or colour in mind, we'll use it." },
      { question: "Can you paint in winter?", answer: "Interiors year round. Exteriors need temperatures above about 50°F to cure properly, so we schedule those in season." },
    ],
    trustBadges: ["Free Estimates", "Licensed & Insured", "Two Coats Standard", "Daily Cleanup"],
    ctaText: "Get a Free Estimate",
    emergencyService: false,
  },

  "junk-removal": {
    label: "Junk Removal",
    variant: "trade",
    primaryColor: "#059669",
    secondaryColor: "#111C18",
    headingFont: "Oswald",
    bodyFont: "Inter",
    tagline: "We do the lifting · {city}",
    heroHeadline: "Point at it. It's gone.",
    heroSubheadline:
      "Furniture, appliances, and full cleanouts across {city}. We carry it out, sweep up, and donate whatever still has life in it.",
    aboutHeading: "You point, we carry",
    aboutText:
      "{business} does the lifting, the stairs, and the loading. Nothing needs to be moved to the kerb first. Anything usable goes to a local donation centre and the rest gets sorted for recycling before it ever sees a landfill.",
    services: [
      { name: "Furniture Removal", description: "Couches, mattresses, and desks carried out from anywhere.", icon: "sofa" },
      { name: "Appliance Haul-Away", description: "Fridges, washers, and water heaters disconnected and removed.", icon: "package" },
      { name: "Garage & Attic Cleanouts", description: "Years of accumulation cleared in a single visit.", icon: "warehouse" },
      { name: "Construction Debris", description: "Demolition waste, old cabinets, and site clearing.", icon: "construction" },
      { name: "Estate Cleanouts", description: "Whole-property clearing handled with care and discretion.", icon: "home" },
      { name: "Donation & Recycling", description: "Usable items delivered to local charities, not the dump.", icon: "recycle" },
    ],
    whyChooseUs: [
      { title: "You don't lift anything", description: "Basement, attic, or third floor — we carry it out. Nothing needs to be at the kerb." },
      { title: "Priced by volume, quoted on site", description: "You see the price before we load a single item, based on the space it takes in the truck." },
      { title: "Donated before dumped", description: "Furniture and appliances that still work go to local charities. Landfill is the last resort." },
    ],
    faq: [
      { question: "How is pricing worked out?", answer: "By how much space it takes in the truck. We quote on site before loading, and there's no obligation." },
      { question: "Do I need to move things outside?", answer: "No. We'll carry it from wherever it is, including basements and upper floors." },
      { question: "What can't you take?", answer: "Hazardous material — paint, chemicals, asbestos, and fuel. We'll point you to the right disposal site." },
      { question: "Can you come today?", answer: "Often yes. Same-day and next-day slots are usually available." },
    ],
    trustBadges: ["Free On-Site Quotes", "Same-Day Available", "We Do The Lifting", "Donation First"],
    ctaText: "Get a Free Quote",
    emergencyService: false,
  },
};
