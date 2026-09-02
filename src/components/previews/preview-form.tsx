"use client";

import { useState, useTransition } from "react";
import { Preview } from "@prisma/client";
import { Plus, Trash2, ExternalLink, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  HEADING_FONT_OPTIONS,
  BODY_FONT_OPTIONS,
  LAYOUT_VARIANT_LABELS,
  DAYS_OF_WEEK,
  type LayoutVariant,
  type ServiceItem,
  type TestimonialItem,
  type WhyItem,
  type FaqItem,
  type HoursMap,
} from "@/lib/preview";

export function PreviewForm({
  preview,
  action,
  imageManager,
}: {
  preview: Preview;
  action: (formData: FormData) => Promise<unknown>;
  /** Rendered directly under the hero image field, where photo edits belong. */
  imageManager?: React.ReactNode;
}) {
  const [isPending, startTransition] = useTransition();

  const [services, setServices] = useState<ServiceItem[]>(
    ((preview.services as ServiceItem[] | null) ?? []).length > 0
      ? (preview.services as ServiceItem[])
      : [{ name: "", description: "" }]
  );
  const [why, setWhy] = useState<WhyItem[]>((preview.whyChooseUs as WhyItem[] | null) ?? []);
  const [faq, setFaq] = useState<FaqItem[]>((preview.faq as FaqItem[] | null) ?? []);
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>(
    (preview.testimonials as TestimonialItem[] | null) ?? []
  );
  const [hours, setHours] = useState<HoursMap>(
    Object.keys((preview.hours as HoursMap | null) ?? {}).length > 0
      ? (preview.hours as HoursMap)
      : Object.fromEntries(DAYS_OF_WEEK.map((d) => [d, ""]))
  );
  const [copied, setCopied] = useState(false);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await action(formData);
    });
  }

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/p/${preview.slug}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const sectionTitle = "mb-3 text-sm font-semibold text-slate-100";
  const rowBox = "flex items-start gap-2 rounded-md border border-slate-800 bg-slate-950/50 p-3";

  return (
    <form action={handleSubmit} className="space-y-8">
      {/*
        The repeatable sections live in React state, but they are mirrored into
        hidden inputs rather than being attached inside the submit handler.
        That way a submit that happens before hydration still carries the real
        values instead of serialising as empty and wiping the content.
      */}
      <input type="hidden" name="servicesJson" value={JSON.stringify(services.filter((s) => s.name.trim()))} readOnly />
      <input type="hidden" name="whyChooseUsJson" value={JSON.stringify(why.filter((w) => w.title.trim()))} readOnly />
      <input type="hidden" name="faqJson" value={JSON.stringify(faq.filter((f) => f.question.trim()))} readOnly />
      <input type="hidden" name="testimonialsJson" value={JSON.stringify(testimonials.filter((t) => t.quote.trim()))} readOnly />
      <input type="hidden" name="hoursJson" value={JSON.stringify(hours)} readOnly />

      {/* Live link */}
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-slate-800 bg-slate-950 px-4 py-3">
        <span className="text-sm text-slate-400">Public link:</span>
        <code className="text-sm text-brand-400">/p/{preview.slug}</code>
        <div className="ml-auto flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={copyLink}>
            <Copy className="h-3.5 w-3.5" /> {copied ? "Copied!" : "Copy Link"}
          </Button>
          <a href={`/p/${preview.slug}`} target="_blank" rel="noreferrer">
            <Button type="button" variant="outline" size="sm">
              <ExternalLink className="h-3.5 w-3.5" /> View Live
            </Button>
          </a>
        </div>
      </div>

      {/* Basic */}
      <section>
        <h3 className={sectionTitle}>Basic Info</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="businessName">Business Name *</Label>
            <Input id="businessName" name="businessName" required defaultValue={preview.businessName} />
          </div>
          <div>
            <Label htmlFor="tagline">Tagline / Eyebrow</Label>
            <Input id="tagline" name="tagline" defaultValue={preview.tagline ?? ""} placeholder="Licensed & insured · Olathe" />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select id="status" name="status" defaultValue={preview.status}>
              <option value="DRAFT">Draft (not sent yet)</option>
              <option value="ACTIVE">Active (shareable link)</option>
              <option value="DISABLED">Disabled</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="ctaText">Call-to-Action Text *</Label>
            <Input id="ctaText" name="ctaText" required defaultValue={preview.ctaText} />
          </div>
        </div>
      </section>

      {/* Design */}
      <section>
        <h3 className={sectionTitle}>Design</h3>
        <div className="mb-4">
          <Label htmlFor="layoutVariant">Layout Style</Label>
          <Select
            id="layoutVariant"
            name="layoutVariant"
            defaultValue={(preview.layoutVariant as LayoutVariant) ?? "trade"}
          >
            {(Object.keys(LAYOUT_VARIANT_LABELS) as LayoutVariant[]).map((v) => (
              <option key={v} value={v}>
                {LAYOUT_VARIANT_LABELS[v]}
              </option>
            ))}
          </Select>
          <p className="mt-1.5 text-xs text-slate-500">
            Changes the hero, typography, and section rhythm — not just the colors.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="primaryColorText">Primary Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                defaultValue={preview.primaryColor}
                onChange={(e) => {
                  const t = document.getElementById("primaryColorText") as HTMLInputElement | null;
                  if (t) t.value = e.target.value;
                }}
                className="h-9 w-10 flex-none cursor-pointer rounded border border-slate-700 bg-slate-900"
              />
              <Input id="primaryColorText" name="primaryColor" defaultValue={preview.primaryColor} required />
            </div>
          </div>
          <div>
            <Label htmlFor="secondaryColorText">Dark / Secondary</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                defaultValue={preview.secondaryColor}
                onChange={(e) => {
                  const t = document.getElementById("secondaryColorText") as HTMLInputElement | null;
                  if (t) t.value = e.target.value;
                }}
                className="h-9 w-10 flex-none cursor-pointer rounded border border-slate-700 bg-slate-900"
              />
              <Input id="secondaryColorText" name="secondaryColor" defaultValue={preview.secondaryColor} required />
            </div>
          </div>
          <div>
            <Label htmlFor="surfaceColorText">Page Background</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                defaultValue={preview.surfaceColor ?? "#f4f5f5"}
                onChange={(e) => {
                  const t = document.getElementById("surfaceColorText") as HTMLInputElement | null;
                  if (t) t.value = e.target.value;
                }}
                className="h-9 w-10 flex-none cursor-pointer rounded border border-slate-700 bg-slate-900"
              />
              <Input id="surfaceColorText" name="surfaceColor" defaultValue={preview.surfaceColor ?? ""} placeholder="auto" />
            </div>
          </div>
          <div>
            <Label htmlFor="headingColorText">Heading Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                defaultValue={preview.headingColor ?? preview.secondaryColor}
                onChange={(e) => {
                  const t = document.getElementById("headingColorText") as HTMLInputElement | null;
                  if (t) t.value = e.target.value;
                }}
                className="h-9 w-10 flex-none cursor-pointer rounded border border-slate-700 bg-slate-900"
              />
              <Input id="headingColorText" name="headingColor" defaultValue={preview.headingColor ?? ""} placeholder="auto" />
            </div>
          </div>
          <div>
            <Label htmlFor="footerColorText">Footer Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                defaultValue={preview.footerColor ?? preview.secondaryColor}
                onChange={(e) => {
                  const t = document.getElementById("footerColorText") as HTMLInputElement | null;
                  if (t) t.value = e.target.value;
                }}
                className="h-9 w-10 flex-none cursor-pointer rounded border border-slate-700 bg-slate-900"
              />
              <Input id="footerColorText" name="footerColor" defaultValue={preview.footerColor ?? ""} placeholder="auto" />
            </div>
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <p className="text-xs text-slate-500">
              Leave a colour blank to derive it automatically from the dark colour — that&apos;s what keeps a freshly
              generated site coherent.
            </p>
          </div>
          <div>
            <Label htmlFor="headingFont">Heading Font</Label>
            <Select id="headingFont" name="headingFont" defaultValue={preview.headingFont}>
              {HEADING_FONT_OPTIONS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="fontFamily">Body Font</Label>
            <Select id="fontFamily" name="fontFamily" defaultValue={preview.fontFamily}>
              {BODY_FONT_OPTIONS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </section>

      {/* Hero */}
      <section>
        <h3 className={sectionTitle}>Hero Section</h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label htmlFor="heroHeadline">Headline</Label>
            <Input id="heroHeadline" name="heroHeadline" defaultValue={preview.heroHeadline ?? ""} />
          </div>
          <div>
            <Label htmlFor="heroSubheadline">Subheadline</Label>
            <Textarea id="heroSubheadline" name="heroSubheadline" rows={2} defaultValue={preview.heroSubheadline ?? ""} />
          </div>
        </div>
      </section>

      {imageManager && (
        <section>
          <h3 className={sectionTitle}>Images</h3>
          {imageManager}
        </section>
      )}

      {/* Trust signals */}
      <section>
        <h3 className={sectionTitle}>Trust Signals</h3>
        <p className="mb-3 -mt-2 text-xs text-slate-500">
          These are what separate a real local business site from a template. Fill in what you can verify.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="yearsInBusiness">Years in Business</Label>
            <Input id="yearsInBusiness" name="yearsInBusiness" type="number" min={0} defaultValue={preview.yearsInBusiness ?? ""} placeholder="18" />
          </div>
          <div>
            <Label htmlFor="licenseNumber">License #</Label>
            <Input id="licenseNumber" name="licenseNumber" defaultValue={preview.licenseNumber ?? ""} placeholder="KS-12345" />
          </div>
          <div>
            <Label htmlFor="googleRating">Google Rating</Label>
            <Input id="googleRating" name="googleRating" type="number" step="0.1" min={1} max={5} defaultValue={preview.googleRating ? Number(preview.googleRating) : ""} placeholder="4.8" />
          </div>
          <div>
            <Label htmlFor="reviewCount">Review Count</Label>
            <Input id="reviewCount" name="reviewCount" type="number" min={0} defaultValue={preview.reviewCount ?? ""} placeholder="48" />
          </div>
        </div>

        <div className="mb-4 flex items-start gap-3 rounded-md border border-slate-800 bg-slate-950/50 p-3">
          <input
            id="showStats"
            type="checkbox"
            name="showStats"
            defaultChecked={preview.showStats}
            className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-brand-600"
          />
          <label htmlFor="showStats" className="text-sm text-slate-300">
            <span className="font-medium text-slate-100">Show the stats band</span>
            <span className="mt-0.5 block text-xs text-slate-500">
              The &ldquo;by the numbers&rdquo; strip under the hero. Hides automatically if fewer than two of the
              figures below are filled in.
            </span>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" name="freeEstimates" defaultChecked={preview.freeEstimates} className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-brand-600" />
            Free estimates
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" name="emergencyService" defaultChecked={preview.emergencyService} className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-brand-600" />
            24/7 emergency service
          </label>
        </div>

        <div className="mt-4">
          <Label htmlFor="trustBadgesText">Trust Badges (one per line)</Label>
          <Textarea
            id="trustBadgesText"
            name="trustBadgesText"
            rows={4}
            defaultValue={((preview.trustBadges as string[] | null) ?? []).join("\n")}
            placeholder={"Licensed & Insured\nSame-Day Service\nUpfront Pricing"}
          />
          <p className="mt-1.5 text-xs text-slate-500">
            Shown in the hero and the color strip. Keep them short and specific to this trade.
          </p>
        </div>

        <div className="mt-4">
          <Label htmlFor="serviceAreasText">Service Areas (one per line)</Label>
          <Textarea
            id="serviceAreasText"
            name="serviceAreasText"
            rows={4}
            defaultValue={((preview.serviceAreas as string[] | null) ?? []).join("\n")}
            placeholder={"Olathe\nOverland Park\nLenexa"}
          />
        </div>
      </section>

      {/* About */}
      <section>
        <h3 className={sectionTitle}>About</h3>
        <Textarea id="aboutText" name="aboutText" rows={5} defaultValue={preview.aboutText ?? ""} />
      </section>

      {/* Services */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-100">Services</h3>
          <Button type="button" variant="outline" size="sm" onClick={() => setServices([...services, { name: "", description: "" }])}>
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
        <div className="space-y-3">
          {services.map((s, i) => (
            <div key={i} className={rowBox}>
              <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                <Input
                  placeholder="Service name"
                  value={s.name}
                  onChange={(e) => {
                    const next = [...services];
                    next[i] = { ...next[i], name: e.target.value };
                    setServices(next);
                  }}
                />
                <Input
                  placeholder="Short description"
                  value={s.description ?? ""}
                  onChange={(e) => {
                    const next = [...services];
                    next[i] = { ...next[i], description: e.target.value };
                    setServices(next);
                  }}
                />
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setServices(services.filter((_, x) => x !== i))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* Why choose us */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-100">Why Choose Us</h3>
          <Button type="button" variant="outline" size="sm" onClick={() => setWhy([...why, { title: "", description: "" }])}>
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
        <div className="space-y-3">
          {why.length === 0 && <p className="text-sm text-slate-500">No differentiators yet.</p>}
          {why.map((w, i) => (
            <div key={i} className={rowBox}>
              <div className="grid flex-1 grid-cols-1 gap-2">
                <Input
                  placeholder="e.g. You get the price first"
                  value={w.title}
                  onChange={(e) => {
                    const next = [...why];
                    next[i] = { ...next[i], title: e.target.value };
                    setWhy(next);
                  }}
                />
                <Textarea
                  rows={2}
                  placeholder="One or two sentences explaining it."
                  value={w.description}
                  onChange={(e) => {
                    const next = [...why];
                    next[i] = { ...next[i], description: e.target.value };
                    setWhy(next);
                  }}
                />
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setWhy(why.filter((_, x) => x !== i))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-100">FAQ</h3>
          <Button type="button" variant="outline" size="sm" onClick={() => setFaq([...faq, { question: "", answer: "" }])}>
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
        <div className="space-y-3">
          {faq.length === 0 && <p className="text-sm text-slate-500">No questions yet.</p>}
          {faq.map((f, i) => (
            <div key={i} className={rowBox}>
              <div className="grid flex-1 grid-cols-1 gap-2">
                <Input
                  placeholder="Question"
                  value={f.question}
                  onChange={(e) => {
                    const next = [...faq];
                    next[i] = { ...next[i], question: e.target.value };
                    setFaq(next);
                  }}
                />
                <Textarea
                  rows={2}
                  placeholder="Answer"
                  value={f.answer}
                  onChange={(e) => {
                    const next = [...faq];
                    next[i] = { ...next[i], answer: e.target.value };
                    setFaq(next);
                  }}
                />
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setFaq(faq.filter((_, x) => x !== i))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* Gallery */}
      <section>
        <h3 className={sectionTitle}>Photo Gallery</h3>
        <div className="mb-4">
          <Label htmlFor="galleryHeading">Section Heading</Label>
          <Input
            id="galleryHeading"
            name="galleryHeading"
            defaultValue={preview.galleryHeading ?? ""}
            placeholder="Recent work"
          />
          <p className="mt-1.5 text-xs text-slate-500">
            Leave blank to use the template default (&ldquo;Recent work&rdquo;, &ldquo;Our office&rdquo;, and so on).
          </p>
        </div>
        <p className="rounded-md border border-slate-800 bg-slate-950/40 px-3 py-2.5 text-xs leading-relaxed text-slate-500">
          The photos themselves live under <span className="text-slate-300">Images</span> above.
          Add or remove them there &mdash; they save the moment you drop them in, without waiting
          for this form.
        </p>
      </section>

      {/* Testimonials */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-100">Testimonials</h3>
          <Button type="button" variant="outline" size="sm" onClick={() => setTestimonials([...testimonials, { name: "", quote: "", rating: 5 }])}>
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
        <div className="space-y-3">
          {testimonials.length === 0 && (
            <p className="text-sm text-slate-500">
              None yet — pull a few real ones from their Google listing for maximum effect.
            </p>
          )}
          {testimonials.map((t, i) => (
            <div key={i} className={rowBox}>
              <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-4">
                <Input
                  placeholder="Customer name"
                  value={t.name}
                  onChange={(e) => {
                    const next = [...testimonials];
                    next[i] = { ...next[i], name: e.target.value };
                    setTestimonials(next);
                  }}
                />
                <Textarea
                  className="sm:col-span-2"
                  placeholder="Quote"
                  rows={1}
                  value={t.quote}
                  onChange={(e) => {
                    const next = [...testimonials];
                    next[i] = { ...next[i], quote: e.target.value };
                    setTestimonials(next);
                  }}
                />
                <Select
                  value={t.rating}
                  onChange={(e) => {
                    const next = [...testimonials];
                    next[i] = { ...next[i], rating: Number(e.target.value) };
                    setTestimonials(next);
                  }}
                >
                  {[5, 4, 3, 2, 1].map((r) => (
                    <option key={r} value={r}>
                      {r} star{r === 1 ? "" : "s"}
                    </option>
                  ))}
                </Select>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setTestimonials(testimonials.filter((_, x) => x !== i))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section>
        <h3 className={sectionTitle}>Contact Info</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="phone">Phone</Label>
            <PhoneInput id="phone" name="phone" defaultValue={preview.phone ?? ""} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={preview.email ?? ""} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" name="address" defaultValue={preview.address ?? ""} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="mapEmbedUrl">Google Maps Embed URL</Label>
            <Input id="mapEmbedUrl" name="mapEmbedUrl" defaultValue={preview.mapEmbedUrl ?? ""} placeholder="https://www.google.com/maps/embed?…" />
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-end justify-between">
            <Label className="mb-0">Hours</Label>
            <div className="flex items-center gap-3 text-xs">
              <button
                type="button"
                className="text-slate-400 transition-colors hover:text-brand-400"
                onClick={() => {
                  // Most businesses keep one weekday schedule; copying Monday
                  // down is far quicker than retyping it five times.
                  const monday = hours.Monday ?? "";
                  setHours({ ...hours, Tuesday: monday, Wednesday: monday, Thursday: monday, Friday: monday });
                }}
              >
                Copy Monday to weekdays
              </button>
              <span className="text-slate-700">·</span>
              <button
                type="button"
                className="text-slate-400 transition-colors hover:text-brand-400"
                onClick={() => setHours(Object.fromEntries(DAYS_OF_WEEK.map((d) => [d, ""])))}
              >
                Clear
              </button>
            </div>
          </div>

          {/* A single column keeps the seven days from leaving an orphan in a
              two-up grid, and aligned labels read as a schedule. */}
          <div className="overflow-hidden rounded-md border border-slate-800">
            {DAYS_OF_WEEK.map((day, i) => {
              const value = hours[day] ?? "";
              const closed = /closed/i.test(value);
              return (
                <div
                  key={day}
                  className={`flex items-center gap-3 px-3 py-2 ${
                    i > 0 ? "border-t border-slate-800" : ""
                  } ${i % 2 === 1 ? "bg-slate-950/40" : ""}`}
                >
                  <span className="w-24 flex-none text-sm font-medium text-slate-300">{day}</span>
                  <input
                    value={value}
                    placeholder="9:00 AM – 5:00 PM"
                    onChange={(e) => setHours({ ...hours, [day]: e.target.value })}
                    className={`h-8 flex-1 rounded border border-transparent bg-transparent px-2 text-sm transition-colors placeholder:text-slate-600 hover:border-slate-700 focus:border-brand-500 focus:bg-slate-900 focus:outline-none ${
                      closed ? "text-slate-500" : "text-slate-100"
                    }`}
                  />
                  <button
                    type="button"
                    title={closed ? "Set hours" : "Mark closed"}
                    onClick={() => setHours({ ...hours, [day]: closed ? "" : "Closed" })}
                    className={`flex-none rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                      closed
                        ? "bg-slate-800 text-slate-300"
                        : "text-slate-600 hover:bg-slate-800 hover:text-slate-300"
                    }`}
                  >
                    Closed
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="sticky bottom-0 -mx-5 flex items-center justify-end gap-3 border-t border-slate-800 bg-slate-900/95 px-5 py-4 backdrop-blur">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isPending ? "Saving…" : "Save Preview"}
        </Button>
      </div>
    </form>
  );
}
