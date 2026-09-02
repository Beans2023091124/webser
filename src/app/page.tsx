import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  Check,
  ArrowUpRight,
  Smartphone,
  Gauge,
  MessageSquare,
  MapPin,
  Globe,
  Wrench,
} from "lucide-react";

/**
 * The public face of the business at webser.org.
 *
 * Deliberately free of invented proof — no testimonials, no client counts, no
 * "trusted by 200 businesses". Everything here is a claim about how the
 * service works, which is checkable, rather than a claim about a past that
 * hasn't happened yet.
 */

// `||`, not `??`: an env var that's present but blank should still fall back.
const CONTACT_PHONE = process.env.NEXT_PUBLIC_CONTACT_PHONE?.trim() || "(913) 300-0258";
/** sms: links need bare digits; the display version keeps its formatting. */
const CONTACT_SMS = `sms:+1${CONTACT_PHONE.replace(/\D/g, "").replace(/^1/, "")}`;

export const metadata: Metadata = {
  title: "Webser — Websites for local businesses",
  description:
    "A proper website for your business, built for you and live in about a week. $100 to build, $25 a month to keep it running.",
};

const BUILD_PRICE = "$100";
const MONTHLY_PRICE = "$25";

const included = [
  {
    icon: Smartphone,
    title: "Built for phones first",
    body: "Most people will find you on a phone. Yours will look right there before it looks right anywhere else.",
  },
  {
    icon: Gauge,
    title: "Fast enough to keep",
    body: "No page builders, no plugin sprawl. Just a fast site that loads before someone gives up and taps back.",
  },
  {
    icon: MessageSquare,
    title: "A quote form that reaches you",
    body: "Customers fill it in, you get the details. No app to check, no dashboard to learn.",
  },
  {
    icon: MapPin,
    title: "Ready for local search",
    body: "Your services, your areas, and your hours written out properly, so Google knows what you do and where.",
  },
  {
    icon: Globe,
    title: "Your own web address",
    body: "We'll point your domain at it and set it up. Don't have one? We'll walk you through buying it.",
  },
  {
    icon: Wrench,
    title: "Changes without the runaround",
    body: "New number, new hours, a service you've dropped — send a message and it's done. No tickets.",
  },
];

const steps = [
  {
    n: "1",
    title: "We build it first",
    body: "Before you pay anything, we build a real version of your site using your business, your services, your area. You look at the actual thing, not a mockup.",
  },
  {
    n: "2",
    title: "You tell us what's wrong with it",
    body: "Wrong photo, wrong phone number, a service you don't offer any more. Say it in plain English and we'll fix it.",
  },
  {
    n: "3",
    title: "You approve it",
    body: "Nothing goes live until you say so. When you're happy, you pay the build fee and we publish it.",
  },
  {
    n: "4",
    title: "It stays looked after",
    body: "Hosting, updates and edits are covered monthly. Send changes whenever you need them.",
  },
];

const faqs = [
  {
    q: "Do I need to know anything technical?",
    a: "No. If you can send a text message, you can use this. We handle the domain, the hosting, the setup and every change after it.",
  },
  {
    q: "What if I already have a website?",
    a: "We can build the new one alongside it and switch over when you're happy. Your existing address keeps working — it just starts pointing at the better site.",
  },
  {
    q: "Do I own it?",
    a: "The domain is yours, bought in your name, and it stays yours. If you ever leave, you take the address with you.",
  },
  {
    q: "What does the monthly fee actually cover?",
    a: `${MONTHLY_PRICE} a month covers hosting, security updates, and any edits you ask for. It isn't a support ticket queue — you message us and we make the change.`,
  },
  {
    q: "Can I cancel?",
    a: "Any time, no notice period and no cancellation fee.",
  },
  {
    q: "How long does it take?",
    a: "Usually about a week from the first conversation to going live, and most of that is waiting on photos and approvals rather than on us.",
  },
];

// Rebuilt hourly rather than per request: the examples change rarely and a
// marketing page shouldn't wait on a database round trip.
export const revalidate = 3600;

export default async function LandingPage() {
  const demos = await prisma.preview.findMany({
    where: { isDemo: true, status: "ACTIVE" },
    select: { slug: true, businessName: true, tagline: true, heroImageUrl: true, primaryColor: true },
    orderBy: { createdAt: "asc" },
    take: 3,
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-slate-900 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <span className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/webser-mark.png" alt="" width={28} height={28} aria-hidden />
            <span className="text-lg font-bold tracking-tight text-slate-50">Webser</span>
          </span>
          <nav className="flex items-center gap-6 text-sm">
            <a href="#examples" className="hidden text-slate-400 transition-colors hover:text-slate-100 sm:block">
              Examples
            </a>
            <a href="#pricing" className="hidden text-slate-400 transition-colors hover:text-slate-100 sm:block">
              Pricing
            </a>
            <a href="#how" className="hidden text-slate-400 transition-colors hover:text-slate-100 sm:block">
              How it works
            </a>
            <a
              href={CONTACT_SMS}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white transition-opacity hover:opacity-90"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              {CONTACT_PHONE}
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-900">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            background:
              "radial-gradient(60rem 30rem at 50% -10%, rgba(20,99,255,0.28), transparent 70%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.12) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(40rem 24rem at 50% 0%, #000, transparent 75%)",
            WebkitMaskImage: "radial-gradient(40rem 24rem at 50% 0%, #000, transparent 75%)",
          }}
        />
        <div className="relative mx-auto max-w-4xl px-5 py-20 text-center sm:px-8 sm:py-28">
          <p className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/70 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            For local businesses
          </p>
          <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-50 sm:text-6xl">
            A website your customers
            <br className="hidden sm:block" /> can actually find.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400">
            Most small businesses either have no website or one that hasn&apos;t been touched in
            eight years. We build you a proper one, put it on your own address, and keep it up to
            date — for less than a phone bill.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={CONTACT_SMS}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-7 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-brand-600/20 transition-opacity hover:opacity-90 sm:w-auto"
            >
              <MessageSquare className="h-4 w-4" />
              Text {CONTACT_PHONE}
            </a>
            <a
              href="#pricing"
              className="inline-flex w-full items-center justify-center rounded-lg border border-slate-800 px-7 py-3.5 text-[15px] font-semibold text-slate-200 transition-colors hover:bg-slate-900 sm:w-auto"
            >
              See the pricing
            </a>
          </div>
          <p className="mt-5 text-sm text-slate-500">
            We build it before you pay. If you don&apos;t like it, you don&apos;t buy it.
          </p>
        </div>
      </section>

      {/* What's included */}
      <section className="border-b border-slate-900 px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl">
            What you get
          </h2>
          <p className="mt-3 max-w-2xl text-[17px] text-slate-400">
            Not a template with your logo dropped in. A site written around what you actually do.
          </p>

          <div className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {included.map(({ icon: Icon, title, body }) => (
              <div key={title}>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600/10 ring-1 ring-inset ring-brand-600/25">
                  <Icon className="h-5 w-5 text-brand-400" />
                </div>
                <h3 className="mt-4 font-semibold text-slate-100">{title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-slate-400">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Examples */}
      {demos.length > 0 && (
        <section id="examples" className="scroll-mt-20 border-b border-slate-900 px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl">
              Have a look at three
            </h2>
            <p className="mt-3 max-w-2xl text-[17px] text-slate-400">
              Real, working sites you can click around &mdash; different trades, different
              personalities. These are demonstrations rather than customers, so nobody&apos;s
              phone rings when you try the form.
            </p>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {demos.map((d) => (
                <a
                  key={d.slug}
                  href={`/p/${d.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="group overflow-hidden rounded-xl border border-slate-800 bg-slate-900 transition-colors hover:border-slate-700"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-slate-950">
                    {d.heroImageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={d.heroImageUrl}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover opacity-80 transition-transform duration-500 group-hover:scale-105 group-hover:opacity-100"
                      />
                    )}
                    <span
                      className="absolute inset-x-0 bottom-0 h-1"
                      style={{ backgroundColor: d.primaryColor }}
                    />
                  </div>
                  <div className="p-5">
                    <p className="font-semibold text-slate-100">{d.businessName}</p>
                    {d.tagline && <p className="mt-1 text-sm text-slate-500">{d.tagline}</p>}
                    <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-400">
                      View the site <ArrowUpRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section id="how" className="scroll-mt-20 border-b border-slate-900 px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl">
            How it works
          </h2>
          <p className="mt-3 max-w-2xl text-[17px] text-slate-400">
            The order matters: you see the real site before any money changes hands.
          </p>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <div key={s.n} className="relative rounded-xl border border-slate-900 bg-slate-900/40 p-6">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                  {s.n}
                </span>
                <h3 className="mt-4 font-semibold text-slate-100">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-400">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-20 border-b border-slate-900 px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl">
            One price. No packages.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-[17px] text-slate-400">
            There&apos;s no bronze, silver and gold. There&apos;s the site, and there&apos;s keeping
            it running.
          </p>

          <div className="mt-12 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            <div className="grid sm:grid-cols-2">
              <div className="border-b border-slate-800 p-8 sm:border-b-0 sm:border-r">
                <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                  To build it
                </p>
                <p className="mt-3 text-5xl font-extrabold tracking-tight text-brand-400">
                  {BUILD_PRICE}
                </p>
                <p className="mt-2 text-sm text-slate-400">Once. Paid only after you approve it.</p>
              </div>
              <div className="p-8">
                <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                  To keep it
                </p>
                <p className="mt-3 text-5xl font-extrabold tracking-tight text-slate-100">
                  {MONTHLY_PRICE}
                  <span className="text-2xl font-bold text-slate-500">/mo</span>
                </p>
                <p className="mt-2 text-sm text-slate-400">Hosting, updates and edits. Cancel any time.</p>
              </div>
            </div>

            <ul className="grid gap-3 border-t border-slate-800 p-8 sm:grid-cols-2">
              {[
                "Your own domain, in your name",
                "Unlimited edits while you're subscribed",
                "Secure hosting and an SSL certificate",
                "Quote form wired to your inbox",
                "Photos sourced if you don't have any",
                "No contract, no notice period",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[15px] text-slate-300">
                  <Check className="mt-0.5 h-4 w-4 flex-none text-brand-400" strokeWidth={2.5} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            The domain itself is bought from a registrar in your name — usually around $12 a year,
            paid to them, not to us.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b border-slate-900 px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl">
            Questions people actually ask
          </h2>
          <dl className="mt-10 divide-y divide-slate-900">
            {faqs.map((f) => (
              <div key={f.q} className="py-6">
                <dt className="font-semibold text-slate-100">{f.q}</dt>
                <dd className="mt-2 text-[15px] leading-relaxed text-slate-400">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-10 text-center sm:p-14">
          <h2 className="text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl">
            Want to see yours?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-slate-400">
            Text us the name of your business and what you do. We&apos;ll build a real version of
            your site and send back the link to look at — no charge, and no obligation to take it.
          </p>
          <a
            href={CONTACT_SMS}
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-brand-600/20 transition-opacity hover:opacity-90"
          >
            <MessageSquare className="h-5 w-5" />
            {CONTACT_PHONE}
          </a>
          <p className="mt-5 text-sm text-slate-500">
            Text is best — we&apos;ll usually reply the same day.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-slate-500 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} Webser</p>
          <div className="flex items-center gap-6">
            <a href={CONTACT_SMS} className="transition-colors hover:text-slate-300">
              {CONTACT_PHONE}
            </a>
            <Link href="/login" className="transition-colors hover:text-slate-300">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
