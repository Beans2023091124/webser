"use client";

import { useState, useTransition } from "react";
import { Prospect } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { BUSINESS_CATEGORIES, PROSPECT_STATUSES, PROSPECT_STATUS_LABELS } from "@/lib/prospect";

type Socials = { facebook?: string; instagram?: string };

export function ProspectForm({
  prospect,
  action,
}: {
  prospect?: Prospect;
  action: (formData: FormData) => Promise<unknown>;
}) {
  const [isPending, startTransition] = useTransition();
  const socials = (prospect?.socialLinks as Socials | null) ?? {};

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await action(formData);
    });
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="businessName">Business Name *</Label>
          <Input
            id="businessName"
            name="businessName"
            required
            defaultValue={prospect?.businessName}
            placeholder="Mike's Auto Repair"
          />
        </div>

        <div>
          <Label htmlFor="category">Business Type / Category</Label>
          <Select id="category" name="category" defaultValue={prospect?.category ?? ""}>
            <option value="">Select category…</option>
            {BUSINESS_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="status">Status</Label>
          <Select id="status" name="status" defaultValue={prospect?.status ?? "NEW"}>
            {PROSPECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PROSPECT_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="contactName">Owner / Contact Name</Label>
          <Input id="contactName" name="contactName" defaultValue={prospect?.contactName ?? ""} />
        </div>

        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" defaultValue={prospect?.phone ?? ""} placeholder="(913) 555-0100" />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={prospect?.email ?? ""} />
        </div>

        <div>
          <Label htmlFor="estimatedPrice">Estimated Website Price ($)</Label>
          <Input
            id="estimatedPrice"
            name="estimatedPrice"
            type="number"
            min={0}
            step={1}
            defaultValue={prospect?.estimatedPrice ? Number(prospect.estimatedPrice) : 100}
          />
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-slate-100">Location</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <Label htmlFor="address">Street Address</Label>
            <Input id="address" name="address" defaultValue={prospect?.address ?? ""} />
          </div>
          <div>
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" defaultValue={prospect?.city ?? ""} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="state">State</Label>
              <Input id="state" name="state" defaultValue={prospect?.state ?? ""} maxLength={2} />
            </div>
            <div>
              <Label htmlFor="zip">ZIP</Label>
              <Input id="zip" name="zip" defaultValue={prospect?.zip ?? ""} />
            </div>
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-slate-100">Online Presence</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="currentWebsite">Current Website (if any)</Label>
            <Input id="currentWebsite" name="currentWebsite" defaultValue={prospect?.currentWebsite ?? ""} placeholder="none" />
          </div>
          <div>
            <Label htmlFor="gmbUrl">Google Business Listing URL</Label>
            <Input id="gmbUrl" name="gmbUrl" defaultValue={prospect?.gmbUrl ?? ""} />
          </div>
          <div>
            <Label htmlFor="facebook">Facebook</Label>
            <Input id="facebook" name="facebook" defaultValue={socials.facebook ?? ""} />
          </div>
          <div>
            <Label htmlFor="instagram">Instagram</Label>
            <Input id="instagram" name="instagram" defaultValue={socials.instagram ?? ""} />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="source">Source</Label>
          <Input id="source" name="source" defaultValue={prospect?.source ?? ""} placeholder="Google Maps research" />
        </div>
        <div>
          <Label htmlFor="followUpDate">Follow-up Date</Label>
          <Input
            id="followUpDate"
            name="followUpDate"
            type="date"
            defaultValue={
              prospect?.followUpDate ? new Date(prospect.followUpDate).toISOString().slice(0, 10) : ""
            }
          />
        </div>
      </section>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={4} defaultValue={prospect?.notes ?? ""} />
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-5">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : prospect ? "Save Changes" : "Add Prospect"}
        </Button>
      </div>
    </form>
  );
}
