import type { Preview } from "@prisma/client";
import { Phone, Mail, MapPin, Star, Clock, Check, ChevronDown, ShieldCheck, Award, CalendarDays, MessageSquare } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ServiceIcon } from "@/components/site/service-icon";
import { QuoteForm } from "@/components/site/quote-form";
import { RevealOnScroll } from "@/components/site/reveal-on-scroll";
import { GalleryGrid } from "@/components/site/gallery-grid";
import { SiteNav, type NavLink } from "@/components/site/site-nav";
import { FaqAccordion } from "@/components/site/faq-accordion";
import { shade, rgba, readableOn, isLight, surfaces } from "@/lib/color";
import {
  DAYS_OF_WEEK,
  FORM_COPY,
  SECTION_COPY,
  type LayoutVariant,
  type ServiceItem,
  type TestimonialItem,
  type WhyItem,
  type FaqItem,
  type HoursMap,
} from "@/lib/preview";

/**
 * A client's website, rendered from its Preview row.
 *
 * Lives here rather than in a route so the same markup can be served from two
 * places: the preview URL we share while selling (/p/<slug>), and the client's
 * own domain once they've connected it. Neither route should be able to drift
 * from the other.
 */

/** Shared <head> for both routes so a custom domain gets the same title and icon. */
export function siteMetadata(preview: {
  slug: string;
  businessName: string;
  tagline: string | null;
  heroSubheadline: string | null;
}) {
  return {
    title: `${preview.businessName}${preview.tagline ? ` — ${preview.tagline}` : ""}`,
    description: preview.heroSubheadline ?? undefined,
    // Absolute path: reachable on the custom domain too, since middleware
    // only rewrites the root.
    icons: { icon: [{ url: `/p/${preview.slug}/favicon`, type: "image/svg+xml" }] },
  };
}

export async function PublicSite({ preview }: { preview: Preview }) {
  if (preview.status === "DISABLED") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">This preview is no longer available.</h1>
          <p className="mt-2 text-sm text-slate-500">Please get in touch if you think this is a mistake.</p>
        </div>
      </main>
    );
  }

  await prisma.preview.update({ where: { id: preview.id }, data: { viewCount: { increment: 1 } } });

  const variant = (preview.layoutVariant as LayoutVariant) ?? "trade";
  const primary = preview.primaryColor;
  const secondary = preview.secondaryColor;
  const onPrimary = readableOn(primary);

  // Optional overrides; null means "derive from the dark colour".
  const heading = preview.headingColor ?? secondary;
  const footerBg = preview.footerColor ?? secondary;
  const S = preview.surfaceColor
    ? { ...surfaces(secondary), page: preview.surfaceColor, alt: shade(preview.surfaceColor, -0.045) }
    : surfaces(secondary);

  // Body copy used to be hard-coded slate, so a client's text colour couldn't
  // be changed at all. One override drives all three tones, and unset falls
  // back to exactly the slates that were there before.
  const bodyText = preview.textColor || "#475569";
  const mutedText =
    preview.mutedTextColor || (preview.textColor ? shade(preview.textColor, 0.22) : "#64748b");
  const strongText = preview.textColor ? shade(preview.textColor, -0.4) : "#0f172a";

  const headingFont = preview.headingFont || "Inter";
  const bodyFont = preview.fontFamily || "Inter";
  const fontParam = (f: string) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;500;600;700;800;900`;
  const fontUrl = `https://fonts.googleapis.com/css2?${fontParam(headingFont)}&${fontParam(bodyFont)}&display=swap`;

  const services = ((preview.services as ServiceItem[] | null) ?? []).filter((s) => s?.name);
  const gallery = ((preview.gallery as string[] | null) ?? []).filter(Boolean);
  const testimonials = ((preview.testimonials as TestimonialItem[] | null) ?? []).filter((t) => t?.quote);
  const whyChooseUs = ((preview.whyChooseUs as WhyItem[] | null) ?? []).filter((w) => w?.title);
  const faq = ((preview.faq as FaqItem[] | null) ?? []).filter((f) => f?.question);
  const serviceAreas = ((preview.serviceAreas as string[] | null) ?? []).filter(Boolean);
  const hours = (preview.hours as HoursMap | null) ?? {};
  const hasHours = Object.values(hours).some(Boolean);

  const headline = preview.heroHeadline || preview.businessName;
  const sub = preview.heroSubheadline || "";
  const rating = preview.googleRating ? Number(preview.googleRating) : null;

  const H = { fontFamily: `'${headingFont}', system-ui, sans-serif` };
  const isCondensed = ["Barlow Condensed", "Oswald", "Anton"].includes(headingFont);
  const isDarkVariant = variant === "trade" || variant === "style";

  // Trust badges: industry-specific wording is stored on the preview, so a
  // dentist never ends up advertising "free estimates".
  const stored = ((preview.trustBadges as string[] | null) ?? []).filter(Boolean);
  const badges = stored.length > 0 ? stored : [preview.freeEstimates && "Free Estimates", preview.emergencyService && "Emergency Service"].filter(Boolean) as string[];
  if (preview.yearsInBusiness && !badges.some((b) => /year/i.test(b))) {
    badges.push(`${preview.yearsInBusiness}+ Years Experience`);
  }

  const sectionCopy0 = SECTION_COPY[variant] ?? SECTION_COPY.trade;
  const navLinks: NavLink[] = [
    services.length > 0 && { href: "#services", label: sectionCopy0.servicesHeading },
    preview.aboutText && { href: "#about", label: "About" },
    gallery.length > 0 && { href: "#gallery", label: "Photos" },
    testimonials.length > 0 && { href: "#reviews", label: "Reviews" },
    faq.length > 0 && { href: "#faq", label: "FAQ" },
    { href: "#quote", label: "Contact" },
  ].filter(Boolean) as NavLink[];

  const formDefaults = FORM_COPY[variant] ?? FORM_COPY.trade;
  const formCopy = {
    heading: preview.formHeading || formDefaults.heading,
    blurb: preview.formBlurb || formDefaults.blurb,
  };
  // Passed to both places the form appears, so they can't drift apart.
  const formProps = {
    serviceLabel: preview.formServiceLabel || undefined,
    messageLabel: preview.formMessageLabel || undefined,
    note: preview.formNote ?? undefined,
    showService: preview.formShowService,
    showMessage: preview.formShowMessage,
    requireEmail: preview.formRequireEmail,
  };
  const sectionCopy = SECTION_COPY[variant] ?? SECTION_COPY.trade;

  // Pick a column count that divides evenly so the last row is never a lonely
  // orphan. 4 services become one row of four rather than 3 + 1.
  const serviceCols = (() => {
    const n = services.length;
    if (n <= 2) return n || 1;
    if (n % 3 === 0) return 3;
    if (n % 4 === 0) return 4;
    if (n % 2 === 0) return 2;
    return 3;
  })();
  const SERVICE_COL_CLASS: Record<number, string> = {
    1: "lg:grid-cols-1",
    2: "lg:grid-cols-2",
    3: "lg:grid-cols-3",
    4: "lg:grid-cols-4",
  };

  /**
   * Gallery tiling that fills the last row exactly for any number of photos.
   *
   * On a 3-wide grid the remainder decides the trick:
   *   n % 3 === 0 → first photo becomes a 2x2 feature (adds 3 cells)
   *   n % 3 === 1 → last photo spans the full width (adds 2 cells)
   *   n % 3 === 2 → last photo spans two columns  (adds 1 cell)
   * Each case lands on a multiple of 3, so there is never a stranded tile.
   * Mobile is 2-wide, where simply widening the last photo on odd counts does
   * the same job.
   */
  const galleryCount = gallery.length;
  const galleryRem = galleryCount % 3;
  const galleryFeatured = galleryCount >= 3 && galleryRem === 0;

  const galleryTileClass = (i: number) => {
    const isLast = i === galleryCount - 1;
    const mobile = galleryCount % 2 === 1 && isLast ? "col-span-2" : "";

    if (galleryFeatured && i === 0) return `${mobile} sm:col-span-2 sm:row-span-2`;
    if (!galleryFeatured && isLast) {
      return galleryRem === 1
        ? `${mobile} sm:col-span-3 sm:aspect-[4/1]`
        : `${mobile} sm:col-span-2 sm:aspect-[8/3]`;
    }
    return mobile;
  };

  // -------------------------------------------------------------------------
  // Shared pieces
  // -------------------------------------------------------------------------

  const Header = (
    <header
      className={`sticky top-0 z-30 border-b backdrop-blur ${
        isDarkVariant ? "border-white/10" : ""
      }`}
      style={{
        backgroundColor: isDarkVariant ? rgba(secondary, 0.92) : rgba(S.page, 0.94),
        borderColor: isDarkVariant ? undefined : S.borderStrong,
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3.5 sm:gap-6 sm:px-8 sm:py-4">
        <a href="#top" className="flex min-w-0 items-center gap-3">
          {preview.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview.logoUrl}
              alt={preview.businessName}
              className="h-8 w-auto max-w-[104px] object-contain sm:h-11 sm:max-w-[190px]"
            />
          ) : (
            <span
              className={`truncate text-base font-extrabold leading-none tracking-tight sm:text-2xl ${
                isCondensed ? "uppercase" : ""
              }`}
              style={{
                ...H,
                color: isDarkVariant ? "#fff" : heading,
                letterSpacing: isCondensed ? "0.01em" : "-0.02em",
              }}
            >
              {preview.businessName}
            </span>
          )}
        </a>

        <SiteNav
          links={navLinks}
          dark={isDarkVariant}
          accent={primary}
          phone={preview.phone}
          ctaText={preview.ctaText}
          businessName={preview.businessName}
        />

        <div className="flex items-center gap-2 sm:gap-3">
          {preview.phone && (
            <>
              {/* Full number on tablet and up */}
              <a
                href={`tel:${preview.phone}`}
                className={`hidden text-right sm:block ${isDarkVariant ? "text-white" : "text-[color:var(--site-strong)]"}`}
              >
                <span className={`block text-[11px] font-medium uppercase tracking-wider ${isDarkVariant ? "text-white/50" : "text-[color:var(--site-muted)]"}`}>
                  Call today
                </span>
                <span className="block text-base font-bold leading-tight" style={H}>
                  {preview.phone}
                </span>
              </a>
              {/* The number itself on phones - it is the conversion, so it
                  should not be hidden behind an icon. */}
              <a
                href={`tel:${preview.phone}`}
                aria-label={`Call ${preview.businessName}`}
                className={`flex flex-none items-center gap-1.5 rounded-md px-2.5 py-2 text-[13px] font-bold sm:hidden ${
                  isDarkVariant ? "bg-white/10 text-white" : "text-[color:var(--site-strong)]"
                }`}
                style={isDarkVariant ? { ...H } : { ...H, backgroundColor: S.alt }}
              >
                <Phone className="h-4 w-4 flex-none" strokeWidth={2.2} />
                <span className="whitespace-nowrap">{preview.phone}</span>
              </a>
            </>
          )}
          <a
            href="#quote"
            className="hidden rounded-md px-4 py-2.5 text-sm font-semibold shadow-sm transition-opacity hover:opacity-90 sm:inline-block"
            style={{ backgroundColor: primary, color: onPrimary }}
          >
            {preview.ctaText}
          </a>
        </div>
      </div>
    </header>
  );

  const TrustStrip = (badges.length > 0 || serviceAreas.length > 0) && (
    <div style={{ backgroundColor: primary, color: onPrimary }}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-5 py-4 text-sm font-medium sm:px-8">
        {badges.map((b) => (
          <span key={b} className="flex items-center gap-2">
            <Check className="h-4 w-4" strokeWidth={3} />
            {b}
          </span>
        ))}
        {serviceAreas.length > 0 && (
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Serving {serviceAreas.slice(0, 3).join(", ")}
            {serviceAreas.length > 3 ? " & nearby" : ""}
          </span>
        )}
      </div>
    </div>
  );

  /**
   * "By the numbers" proof band. Renders only the facts that are actually
   * filled in, and hides entirely below two of them — one lonely statistic
   * looks weaker than none at all.
   */
  const statItems: { value: string; label: string; sub?: string }[] = [];
  if (preview.yearsInBusiness) {
    statItems.push({ value: `${preview.yearsInBusiness}`, label: "Years in business" });
  }
  if (rating) {
    statItems.push({
      value: rating.toFixed(1),
      label: "Google rating",
      sub: preview.reviewCount ? `${preview.reviewCount} reviews` : undefined,
    });
  }
  if (serviceAreas.length > 0) {
    statItems.push({ value: `${serviceAreas.length}`, label: serviceAreas.length === 1 ? "City served" : "Cities served" });
  }
  if (preview.licenseNumber) {
    statItems.push({ value: "Licensed", label: "& fully insured", sub: `#${preview.licenseNumber}` });
  }

  const StatsBand = preview.showStats && statItems.length >= 2 && (
    <section style={{ backgroundColor: S.page }}>
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
        <div
          className={`grid gap-y-9 rounded-2xl px-6 py-9 sm:px-10 ${
            statItems.length === 2
              ? "grid-cols-2"
              : statItems.length === 3
              ? "grid-cols-1 sm:grid-cols-3"
              : "grid-cols-2 lg:grid-cols-4"
          }`}
          style={{ backgroundColor: S.alt }}
        >
          {statItems.map((stat, i) => (
            <div
              key={stat.label}
              className={`reveal px-2 text-center sm:px-6 ${
                statItems.length === 3
                  ? i > 0
                    ? "sm:border-l"
                    : ""
                  : i > 0
                  ? i % 2 === 1
                    ? "border-l"
                    : "lg:border-l"
                  : ""
              }`}
              style={{ borderColor: S.borderStrong, transitionDelay: `${i * 90}ms` }}
            >
              <p
                className={`text-4xl font-extrabold leading-none sm:text-5xl ${isCondensed ? "uppercase" : ""}`}
                style={{ ...H, color: primary }}
              >
                {stat.value}
                {stat.label === "Google rating" && (
                  <Star className="ml-1 inline h-6 w-6 -translate-y-1" fill={primary} stroke="none" />
                )}
              </p>
              <p className="mt-2.5 text-sm font-semibold text-[color:var(--site-strong)]">{stat.label}</p>
              {stat.sub && <p className="mt-0.5 text-xs text-[color:var(--site-muted)]">{stat.sub}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  const quoteCard = (
    <div
      className="rounded-xl p-6 shadow-2xl ring-1 ring-black/5 sm:p-7"
      style={{ backgroundColor: S.card }}
    >
      <h3 className="text-xl font-bold text-[color:var(--site-strong)]" style={H}>
        {formCopy.heading}
      </h3>
      <p className="mt-1.5 text-sm text-[color:var(--site-muted)]">{formCopy.blurb}</p>
      <div className="mt-5">
        <QuoteForm
          previewId={preview.id}
          services={services.map((s) => s.name)}
          ctaText={preview.formButtonText || preview.ctaText}
                  {...formProps}
          theme={{ primary, onLight: true, field: S.card, border: S.borderStrong }}
        />
      </div>
    </div>
  );

  const ServicesSection = services.length > 0 && (
    <section id="services" className="scroll-mt-20" style={{ backgroundColor: variant === "care" ? S.page : S.alt }}>
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em]" style={{ color: primary }}>
            {sectionCopy.servicesEyebrow}
          </p>
          <h2
            className={`mt-3 text-3xl font-extrabold leading-[1.1] sm:text-4xl ${isCondensed ? "uppercase" : ""}`}
            style={{ ...H, color: heading }}
          >
            {sectionCopy.servicesHeading}
          </h2>
        </div>

        <div
          className={`mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 ${
            SERVICE_COL_CLASS[serviceCols] ?? "lg:grid-cols-3"
          }`}
        >
          {services.map((s, i) => (
            <div
              key={i}
              className="group reveal rounded-xl border p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              style={{
                backgroundColor: S.card,
                borderColor: S.border,
                transitionDelay: `${Math.min(i, 5) * 60}ms`,
              }}
            >
              <div
                className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110"
                style={{ backgroundColor: rgba(primary, 0.1) }}
              >
                <ServiceIcon name={s.icon} className="h-6 w-6" style={{ color: primary }} />
              </div>
              <h3 className="text-lg font-bold text-[color:var(--site-strong)]" style={H}>
                {s.name}
              </h3>
              {s.description && <p className="mt-2 text-[15px] leading-relaxed text-[color:var(--site-body)]">{s.description}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  const AboutSection = preview.aboutText && (
    <section id="about" className="scroll-mt-20" style={{ backgroundColor: S.page }}>
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <p className="text-sm font-semibold uppercase tracking-[0.16em]" style={{ color: primary }}>
            About us
          </p>
          <h2
            className={`mt-3 text-3xl font-extrabold leading-[1.1] sm:text-4xl ${isCondensed ? "uppercase" : ""}`}
            style={{ ...H, color: heading }}
          >
            {preview.businessName}
          </h2>
          {preview.yearsInBusiness && (
            <div className="mt-6 flex items-baseline gap-3">
              <span className="text-5xl font-extrabold leading-none" style={{ ...H, color: primary }}>
                {preview.yearsInBusiness}
              </span>
              <span className="text-sm font-medium leading-tight text-[color:var(--site-muted)]">
                years serving
                <br />
                the community
              </span>
            </div>
          )}
        </div>

        <div className="lg:col-span-7">
          <p className="text-lg leading-[1.75] text-[color:var(--site-body)]">{preview.aboutText}</p>

          {whyChooseUs.length > 0 && (
            <div className="mt-10 space-y-7 border-t pt-9" style={{ borderColor: S.border }}>
              {whyChooseUs.map((w, i) => (
                <div key={i} className="reveal flex gap-5" style={{ transitionDelay: `${i * 90}ms` }}>
                  <span
                    className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-sm font-bold"
                    style={{ backgroundColor: rgba(primary, 0.12), color: primary, ...H }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="font-bold text-[color:var(--site-strong)]" style={H}>
                      {w.title}
                    </h3>
                    <p className="mt-1 text-[15px] leading-relaxed text-[color:var(--site-body)]">{w.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );

  const GallerySection = gallery.length > 0 && (
    <section id="gallery" className="scroll-mt-20" style={{ backgroundColor: S.page }}>
      <div className="mx-auto max-w-6xl px-5 pb-20 sm:px-8 sm:pb-24">
        <h2
          className={`reveal text-3xl font-extrabold sm:text-4xl ${isCondensed ? "uppercase" : ""}`}
          style={{ ...H, color: heading }}
        >
          {preview.galleryHeading || sectionCopy.galleryHeading}
        </h2>
        <GalleryGrid urls={gallery} businessName={preview.businessName} accent={primary} />
      </div>
    </section>
  );

  const TestimonialsSection = testimonials.length > 0 && (
    <section id="reviews" className="scroll-mt-20" style={{ backgroundColor: shade(secondary, -0.02) }}>
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em]" style={{ color: primary }}>
              Reviews
            </p>
            <h2
              className={`mt-3 text-3xl font-extrabold text-white sm:text-4xl ${isCondensed ? "uppercase" : ""}`}
              style={H}
            >
              What our customers say
            </h2>
          </div>
          {rating && (
            <div className="flex items-center gap-3 rounded-lg bg-white/10 px-5 py-3 ring-1 ring-white/15">
              <span className="text-3xl font-extrabold text-white" style={H}>
                {rating.toFixed(1)}
              </span>
              <div>
                <span className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5" fill="#FBBF24" stroke="none" style={{ opacity: i < Math.round(rating) ? 1 : 0.25 }} />
                  ))}
                </span>
                {preview.reviewCount && (
                  <span className="mt-0.5 block text-xs text-white/60">{preview.reviewCount} reviews</span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
          {testimonials.slice(0, 6).map((t, i) => (
            <figure key={i} className="reveal flex flex-col rounded-xl bg-white/[0.07] p-6 ring-1 ring-white/10 transition-transform duration-300 hover:-translate-y-1" style={{ transitionDelay: `${i * 70}ms` }}>
              <span className="mb-4 flex gap-0.5">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className="h-4 w-4" fill="#FBBF24" stroke="none" style={{ opacity: s < t.rating ? 1 : 0.2 }} />
                ))}
              </span>
              <blockquote className="flex-1 text-[15px] leading-relaxed text-white/85">{t.quote}</blockquote>
              {t.name && (
                <figcaption className="mt-5 border-t border-white/10 pt-4 text-sm font-semibold text-white">
                  {t.name}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      </div>
    </section>
  );

  const ServiceAreaSection = serviceAreas.length > 0 && (
    <section style={{ backgroundColor: S.page }}>
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="flex flex-col items-start gap-8 rounded-2xl p-8 sm:p-10 lg:flex-row lg:items-center lg:justify-between" style={{ backgroundColor: rgba(primary, 0.07) }}>
          <div className="max-w-md">
            <h2 className={`text-2xl font-extrabold sm:text-3xl ${isCondensed ? "uppercase" : ""}`} style={{ ...H, color: heading }}>
              Proudly serving the area
            </h2>
            <p className="mt-2.5 text-[15px] text-[color:var(--site-body)]">
              Not sure if you're in range? Give us a call — if we can get to you, we will.
            </p>
          </div>
          {/* A ragged wrap (5 pills then a lonely 6th) looks accidental, so past
              four areas they go into an even grid instead of a flex wrap. */}
          <div
            className={
              serviceAreas.length > 4
                ? `grid w-full gap-2.5 lg:w-auto ${
                    serviceAreas.length % 3 === 0
                      ? "grid-cols-2 sm:grid-cols-3"
                      : serviceAreas.length % 4 === 0
                      ? "grid-cols-2 sm:grid-cols-4"
                      : "grid-cols-2 sm:grid-cols-3"
                  }`
                : "flex flex-wrap gap-2.5"
            }
          >
            {serviceAreas.map((area) => (
              <span
                key={area}
                className="reveal rounded-full px-4 py-2 text-center text-sm font-medium text-[color:var(--site-body)] shadow-sm ring-1 ring-inset transition-transform duration-200 hover:-translate-y-0.5"
                style={{ backgroundColor: S.card, ["--tw-ring-color" as string]: S.borderStrong }}
              >
                {area}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );

  const FaqSection = faq.length > 0 && (
    <section id="faq" className="scroll-mt-20" style={{ backgroundColor: S.alt }}>
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <p className="text-sm font-semibold uppercase tracking-[0.16em]" style={{ color: primary }}>
            Questions
          </p>
          <h2
            className={`mt-3 text-3xl font-extrabold leading-[1.1] sm:text-4xl ${isCondensed ? "uppercase" : ""}`}
            style={{ ...H, color: heading }}
          >
            Common questions
          </h2>
          {preview.phone && (
            <p className="mt-4 text-[15px] text-[color:var(--site-body)]">
              Don't see yours?{" "}
              <a href={`tel:${preview.phone}`} className="font-semibold underline" style={{ color: primary }}>
                Give us a call.
              </a>
            </p>
          )}
        </div>

        <div className="lg:col-span-8">
          <div className="border-y" style={{ borderColor: S.borderStrong }}>
            {faq.map((f, i) => (
              <details
                key={i}
                className="faq group py-1"
                style={i > 0 ? { borderTop: `1px solid ${S.borderStrong}` } : undefined}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left">
                  <span className="text-[17px] font-semibold text-[color:var(--site-strong)]" style={H}>
                    {f.question}
                  </span>
                  <ChevronDown className="faq-chevron h-5 w-5 flex-none text-[color:var(--site-muted)]" strokeWidth={2} />
                </summary>
                <div className="faq-body">
                  <div>
                    <p className="max-w-2xl pb-4 text-[15px] leading-relaxed text-[color:var(--site-body)]">{f.answer}</p>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );

  const ContactSection = (
    <section id="quote" className="scroll-mt-20" style={{ backgroundColor: S.page }}>
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em]" style={{ color: primary }}>
            Get in touch
          </p>
          <h2
            className={`mt-3 text-3xl font-extrabold leading-[1.1] sm:text-4xl ${isCondensed ? "uppercase" : ""}`}
            style={{ ...H, color: heading }}
          >
            {sectionCopy.contactHeading}
          </h2>

          <div className="mt-8 space-y-1">
            {preview.phone && (
              <a
                href={`tel:${preview.phone}`}
                className="group flex items-center gap-4 rounded-lg px-3 py-3.5 -mx-3 transition-colors hover:bg-black/[0.035]"
              >
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-lg" style={{ backgroundColor: rgba(primary, 0.1) }}>
                  <Phone className="h-5 w-5" style={{ color: primary }} strokeWidth={1.8} />
                </span>
                <span>
                  <span className="block text-xs font-medium uppercase tracking-wider text-[color:var(--site-muted)]">Phone</span>
                  <span className="block text-lg font-bold text-[color:var(--site-strong)]" style={H}>
                    {preview.phone}
                  </span>
                </span>
              </a>
            )}
            {preview.phone && preview.smsEnabled && (
              <a
                href={`sms:${preview.phone.replace(/[^\d+]/g, "")}`}
                className="group flex items-center gap-4 rounded-lg px-3 py-3.5 -mx-3 transition-colors hover:bg-black/[0.035]"
              >
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-lg" style={{ backgroundColor: rgba(primary, 0.1) }}>
                  <MessageSquare className="h-5 w-5" style={{ color: primary }} strokeWidth={1.8} />
                </span>
                <span>
                  <span className="block text-xs font-medium uppercase tracking-wider text-[color:var(--site-muted)]">Text</span>
                  <span className="block font-semibold text-[color:var(--site-strong)]">Send us a message</span>
                </span>
              </a>
            )}
            {preview.email && preview.showEmailContact && (
              <a
                href={`mailto:${preview.email}`}
                className="group flex items-center gap-4 rounded-lg px-3 py-3.5 -mx-3 transition-colors hover:bg-black/[0.035]"
              >
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-lg" style={{ backgroundColor: rgba(primary, 0.1) }}>
                  <Mail className="h-5 w-5" style={{ color: primary }} strokeWidth={1.8} />
                </span>
                <span>
                  <span className="block text-xs font-medium uppercase tracking-wider text-[color:var(--site-muted)]">Email</span>
                  <span className="block font-semibold text-[color:var(--site-strong)]">{preview.email}</span>
                </span>
              </a>
            )}
            {preview.address && (
              <div className="flex items-center gap-4 px-3 py-3.5 -mx-3">
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-lg" style={{ backgroundColor: rgba(primary, 0.1) }}>
                  <MapPin className="h-5 w-5" style={{ color: primary }} strokeWidth={1.8} />
                </span>
                <span>
                  <span className="block text-xs font-medium uppercase tracking-wider text-[color:var(--site-muted)]">Location</span>
                  <span className="block font-semibold text-[color:var(--site-strong)]">{preview.address}</span>
                </span>
              </div>
            )}
          </div>

          {preview.bookingUrl && (
            <a
              href={preview.bookingUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3.5 text-[15px] font-semibold shadow-sm transition-opacity hover:opacity-90 sm:w-auto"
              style={{ backgroundColor: primary, color: onPrimary }}
            >
              <CalendarDays className="h-4 w-4" />
              Book online
            </a>
          )}

          {preview.contactNote && (
            <p className="mt-4 text-[15px] text-[color:var(--site-body)]">{preview.contactNote}</p>
          )}

          {hasHours && (
            <div className="mt-8 rounded-xl border p-6" style={{ borderColor: S.borderStrong, backgroundColor: S.card }}>
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[color:var(--site-strong)]">
                <Clock className="h-4 w-4" style={{ color: primary }} />
                Hours
              </h3>
              <dl className="mt-4 space-y-2 text-[15px]">
                {DAYS_OF_WEEK.filter((d) => hours[d]).map((d) => {
                  const closed = /closed/i.test(hours[d]);
                  return (
                    <div key={d} className="flex justify-between gap-4">
                      <dt className="text-[color:var(--site-body)]">{d}</dt>
                      <dd className={closed ? "text-[color:var(--site-muted)]" : "font-medium text-[color:var(--site-strong)]"}>{hours[d]}</dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          )}

          {preview.mapEmbedUrl && (
            <div className="mt-6 overflow-hidden rounded-xl border" style={{ borderColor: S.borderStrong }}>
              <iframe src={preview.mapEmbedUrl} className="h-64 w-full border-0" loading="lazy" title="Location map" />
            </div>
          )}
        </div>

        <div
          className="rounded-2xl p-7 ring-1 ring-inset sm:p-9"
          style={{ backgroundColor: S.alt, ["--tw-ring-color" as string]: S.borderStrong }}
        >
          <h3 className="text-2xl font-bold text-[color:var(--site-strong)]" style={H}>
            {formCopy.heading}
          </h3>
          <p className="mt-2 text-[15px] text-[color:var(--site-body)]">{formCopy.blurb}</p>
          <div className="mt-6">
            <QuoteForm
              previewId={preview.id}
              services={services.map((s) => s.name)}
              ctaText={preview.formButtonText || preview.ctaText}
                  {...formProps}
              theme={{ primary, onLight: true, field: S.card, border: S.borderStrong }}
            />
          </div>
        </div>
      </div>
    </section>
  );

  // Sticky mobile action bar — the single highest-converting element on a
  // local business site, since most traffic is a phone in someone's hand.
  const MobileCallBar = preview.phone && (
    <div
      className="print-hide fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t p-3 sm:hidden"
      style={{ backgroundColor: rgba(secondary, 0.97), borderColor: rgba("#ffffff", 0.12) }}
    >
      <a
        href={`tel:${preview.phone}`}
        className="flex flex-1 items-center justify-center gap-2 rounded-md py-3.5 text-[15px] font-bold"
        style={{ backgroundColor: primary, color: onPrimary }}
      >
        <Phone className="h-4 w-4" strokeWidth={2.4} />
        Call Now
      </a>
      <a
        href="#quote"
        className="flex flex-1 items-center justify-center rounded-md border border-white/25 py-3.5 text-[15px] font-semibold text-white"
      >
        Get a Quote
      </a>
    </div>
  );

  const Footer = (
    <footer style={{ backgroundColor: footerBg }}>
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <p className={`text-2xl font-extrabold text-white ${isCondensed ? "uppercase" : ""}`} style={H}>
              {preview.businessName}
            </p>
            {preview.tagline && <p className="mt-2 text-sm text-white/60">{preview.tagline}</p>}
            {preview.address && <p className="mt-4 text-sm text-white/70">{preview.address}</p>}
            {preview.licenseNumber && (
              <p className="mt-3 flex items-center gap-2 text-sm text-white/60">
                <ShieldCheck className="h-4 w-4" />
                License #{preview.licenseNumber}
              </p>
            )}
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">Contact</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-white/70">
              {preview.phone && (
                <li>
                  <a href={`tel:${preview.phone}`} className="hover:text-white">
                    {preview.phone}
                  </a>
                </li>
              )}
              {preview.email && (
                <li>
                  <a href={`mailto:${preview.email}`} className="break-all hover:text-white">
                    {preview.email}
                  </a>
                </li>
              )}
            </ul>
          </div>

          {serviceAreas.length > 0 && (
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-white">Service Area</h4>
              <ul className="mt-4 space-y-2 text-sm text-white/70">
                {serviceAreas.slice(0, 6).map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-7 sm:flex-row">
          <p className="text-xs text-white/50">
            © {new Date().getFullYear()} {preview.businessName}. All rights reserved.
          </p>
          <p className="text-xs text-white/30">Site by Webser</p>
        </div>
      </div>
    </footer>
  );

  // -------------------------------------------------------------------------
  // Variant heroes
  // -------------------------------------------------------------------------

  // Directional scrim: dark enough on the left for headline contrast, but light
  // enough on the right that the photo actually reads as a photo.
  const heroBg = preview.heroImageUrl
    ? {
        backgroundImage:
          `linear-gradient(100deg, ${rgba(secondary, 0.95)} 0%, ${rgba(secondary, 0.88)} 38%, ${rgba(secondary, 0.6)} 68%, ${rgba(secondary, 0.42)} 100%), ` +
          `url(${preview.heroImageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {
        backgroundColor: secondary,
        backgroundImage: `radial-gradient(ellipse 80% 60% at 15% 0%, ${rgba(primary, 0.28)}, transparent 70%)`,
      };

  // Centered variants need an even scrim rather than a directional one.
  const heroBgCentered = preview.heroImageUrl
    ? {
        backgroundImage: `linear-gradient(${rgba(secondary, 0.78)}, ${rgba(secondary, 0.88)}), url(${preview.heroImageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : heroBg;

  const TradeHero = (
    <section id="top" className="relative overflow-hidden" style={heroBg}>
      {/* subtle grid texture keeps a flat color from reading as "template" */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-12 lg:gap-12 lg:py-28">
        <div className="lg:col-span-7">
          {preview.tagline && (
            <p
              className="mb-5 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em]"
              style={{ backgroundColor: rgba(primary, 0.16), color: isLight(primary) ? primary : shade(primary, 0.45) }}
            >
              {preview.emergencyService && <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ backgroundColor: primary }} /><span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ backgroundColor: primary }} /></span>}
              {preview.tagline}
            </p>
          )}

          <h1
            className={`text-[2.6rem] font-extrabold leading-[1.02] text-white sm:text-6xl lg:text-[4.2rem] ${
              isCondensed ? "uppercase" : ""
            }`}
            style={{ ...H, letterSpacing: isCondensed ? "0.005em" : "-0.03em" }}
          >
            {headline}
          </h1>

          {sub && <p className="mt-6 max-w-xl text-lg leading-[1.65] text-white/75">{sub}</p>}

          <div className="mt-9 flex flex-wrap items-center gap-4">
            {preview.phone && (
              <a
                href={`tel:${preview.phone}`}
                className="inline-flex items-center gap-2.5 rounded-md px-7 py-4 text-base font-bold shadow-lg transition-transform hover:-translate-y-0.5"
                style={{ backgroundColor: primary, color: onPrimary }}
              >
                <Phone className="h-5 w-5" strokeWidth={2.2} />
                {preview.phone}
              </a>
            )}
            <a
              href="#quote"
              className="inline-flex items-center rounded-md border border-white/25 px-7 py-4 text-base font-semibold text-white transition-colors hover:bg-white/10"
            >
              {preview.ctaText}
            </a>
          </div>

          {badges.length > 0 && (
            <ul className="mt-10 flex flex-wrap gap-x-7 gap-y-3">
              {badges.map((b) => (
                <li key={b} className="flex items-center gap-2 text-sm font-medium text-white/70">
                  <Check className="h-4 w-4 flex-none" strokeWidth={3} style={{ color: primary }} />
                  {b}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lg:col-span-5">{quoteCard}</div>
      </div>
    </section>
  );

  const HospitalityHero = (
    <section id="top" className="relative overflow-hidden" style={heroBgCentered}>
      <div className="relative mx-auto max-w-3xl px-5 py-28 text-center sm:px-8 sm:py-36">
        {preview.tagline && (
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.3em] text-white/70">{preview.tagline}</p>
        )}
        <h1 className="text-5xl font-black leading-[0.95] text-white sm:text-7xl" style={{ ...H, letterSpacing: "-0.02em" }}>
          {headline}
        </h1>
        {sub && <p className="mx-auto mt-7 max-w-xl text-lg leading-[1.7] text-white/80">{sub}</p>}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a
            href="#quote"
            className="rounded-full px-8 py-4 text-base font-semibold shadow-xl transition-transform hover:-translate-y-0.5"
            style={{ backgroundColor: primary, color: onPrimary }}
          >
            {preview.ctaText}
          </a>
          {preview.phone && (
            <a
              href={`tel:${preview.phone}`}
              className="rounded-full border border-white/30 px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-white/10"
            >
              {preview.phone}
            </a>
          )}
        </div>
      </div>
    </section>
  );

  const CareHero = (
    <section id="top" className="relative overflow-hidden" style={{ backgroundColor: S.page }}>
      {/* Photo stays, but a light scrim keeps the mood calm rather than dramatic */}
      {preview.heroImageUrl && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `url(${preview.heroImageUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center right",
          }}
        />
      )}
      {preview.heroImageUrl && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `linear-gradient(100deg, ${S.page} 0%, ${S.page} 42%, ${rgba(S.page, 0.82)} 58%, ${rgba(S.page, 0.35)} 100%)`,
          }}
        />
      )}
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 h-[520px] w-[520px] rounded-full blur-3xl"
        style={{ backgroundColor: rgba(primary, 0.13), transform: "translate(28%, -34%)" }}
      />
      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-12">
        <div className="lg:col-span-7">
          {preview.tagline && (
            <p
              className="mb-5 inline-block rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em]"
              style={{ backgroundColor: rgba(primary, 0.12), color: primary }}
            >
              {preview.tagline}
            </p>
          )}
          <h1
            className="text-[2.5rem] font-extrabold leading-[1.08] sm:text-5xl lg:text-[3.6rem]"
            style={{ ...H, color: secondary, letterSpacing: "-0.025em" }}
          >
            {headline}
          </h1>
          {sub && <p className="mt-6 max-w-xl text-lg leading-[1.7] text-[color:var(--site-body)]">{sub}</p>}

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <a
              href="#quote"
              className="inline-flex items-center gap-2 rounded-full px-7 py-4 text-base font-semibold shadow-lg transition-transform hover:-translate-y-0.5"
              style={{ backgroundColor: primary, color: onPrimary }}
            >
              <CalendarDays className="h-5 w-5" strokeWidth={2} />
              {preview.ctaText}
            </a>
            {preview.phone && (
              <a
                href={`tel:${preview.phone}`}
                className="inline-flex items-center gap-2 text-base font-semibold"
                style={{ color: secondary }}
              >
                <Phone className="h-5 w-5" style={{ color: primary }} strokeWidth={2} />
                {preview.phone}
              </a>
            )}
          </div>

          {badges.length > 0 && (
            <ul className="mt-10 flex flex-wrap gap-x-7 gap-y-3">
              {badges.map((b) => (
                <li key={b} className="flex items-center gap-2 text-sm font-medium text-[color:var(--site-body)]">
                  <Check className="h-4 w-4 flex-none" strokeWidth={3} style={{ color: primary }} />
                  {b}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="lg:col-span-5">{quoteCard}</div>
      </div>
    </section>
  );

  const StyleHero = (
    <section id="top" className="relative overflow-hidden" style={heroBg}>
      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-end gap-12 px-5 py-24 sm:px-8 sm:py-32 lg:grid-cols-12">
        <div className="lg:col-span-8">
          {preview.tagline && (
            <p className="mb-6 text-xs font-semibold uppercase tracking-[0.32em]" style={{ color: primary }}>
              {preview.tagline}
            </p>
          )}
          <h1
            className="text-[2.8rem] font-bold uppercase leading-[0.98] text-white sm:text-6xl lg:text-[4.4rem]"
            style={{ ...H, letterSpacing: "-0.01em" }}
          >
            {headline}
          </h1>
          {sub && <p className="mt-7 max-w-lg text-lg leading-[1.65] text-white/70">{sub}</p>}
        </div>
        <div className="lg:col-span-4">
          <div className="flex flex-col gap-3">
            <a
              href="#quote"
              className="rounded-md px-7 py-4 text-center text-base font-bold uppercase tracking-wide shadow-lg transition-transform hover:-translate-y-0.5"
              style={{ backgroundColor: primary, color: onPrimary }}
            >
              {preview.ctaText}
            </a>
            {preview.phone && (
              <a
                href={`tel:${preview.phone}`}
                className="rounded-md border border-white/25 px-7 py-4 text-center text-base font-semibold text-white transition-colors hover:bg-white/10"
              >
                {preview.phone}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );

  const hero =
    variant === "hospitality"
      ? HospitalityHero
      : variant === "care"
      ? CareHero
      : variant === "style"
      ? StyleHero
      : TradeHero;

  return (
    <div
      className="site-light scroll-smooth text-[color:var(--site-strong)] antialiased"
      style={{
        backgroundColor: S.page,
        fontFamily: `'${bodyFont}', system-ui, -apple-system, sans-serif`,
        ["--site-body" as string]: bodyText,
        ["--site-muted" as string]: mutedText,
        ["--site-strong" as string]: strongText,
      } as React.CSSProperties}
    >
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={fontUrl} />

      <RevealOnScroll />
      <FaqAccordion />
      {Header}
      {hero}
      {TrustStrip}
      {StatsBand}
      {ServicesSection}
      {AboutSection}
      {GallerySection}
      {TestimonialsSection}
      {ServiceAreaSection}
      {FaqSection}
      {ContactSection}
      {Footer}
      {MobileCallBar}
      {/* keeps the sticky bar from covering the end of the footer */}
      {preview.phone && <div aria-hidden className="h-[76px] sm:hidden print-hide" style={{ backgroundColor: secondary }} />}
    </div>
  );
}

