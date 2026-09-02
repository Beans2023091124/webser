"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";

export function NewPackageForm({ action }: { action: (formData: FormData) => Promise<unknown> }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex min-h-[220px] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-700 text-slate-500 transition-colors hover:border-brand-500 hover:text-brand-400"
      >
        <Plus className="h-6 w-6" />
        <span className="text-sm font-medium">Add a Package</span>
      </button>
    );
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await action(formData);
      setOpen(false);
      (document.getElementById("new-package-form") as HTMLFormElement | null)?.reset();
    });
  }

  return (
    <Card>
      <CardContent className="p-5">
        <form id="new-package-form" action={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="new-name">Package Name</Label>
              <Input id="new-name" name="name" placeholder="Website" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="new-price">Build ($)</Label>
                <Input id="new-price" name="price" type="number" min={0} step={1} defaultValue={100} required />
              </div>
              <div>
                <Label htmlFor="new-monthly">Monthly ($)</Label>
                <Input id="new-monthly" name="monthlyPrice" type="number" min={0} step={1} defaultValue={25} />
              </div>
            </div>
          </div>
          <div>
            <Label htmlFor="new-description">Description</Label>
            <Input id="new-description" name="description" placeholder="A clean one-page site to get online fast." />
          </div>
          <div>
            <Label htmlFor="new-features">Features (one per line)</Label>
            <Textarea id="new-features" name="featuresText" rows={5} placeholder={"Mobile responsive design\nContact form\nBasic SEO"} />
          </div>
          <input type="hidden" name="isActive" value="on" />
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "Adding…" : "Add Package"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
