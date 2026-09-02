"use client";

import { useState, useTransition } from "react";
import { Package } from "@prisma/client";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";

export function PackageCard({
  pkg,
  updateAction,
  deleteAction,
}: {
  pkg: Package;
  updateAction: (formData: FormData) => Promise<unknown>;
  deleteAction: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isPending, startTransition] = useTransition();
  const features = (pkg.features as string[] | null) ?? [];

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await updateAction(formData);
      setEditing(false);
    });
  }

  if (editing) {
    return (
      <Card className={!pkg.isActive ? "opacity-60" : ""}>
        <CardContent className="p-5">
          <form action={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor={`name-${pkg.id}`}>Package Name</Label>
                <Input id={`name-${pkg.id}`} name="name" defaultValue={pkg.name} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor={`price-${pkg.id}`}>Build ($)</Label>
                  <Input
                    id={`price-${pkg.id}`}
                    name="price"
                    type="number"
                    min={0}
                    step={1}
                    defaultValue={Number(pkg.price)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor={`monthly-${pkg.id}`}>Monthly ($)</Label>
                  <Input
                    id={`monthly-${pkg.id}`}
                    name="monthlyPrice"
                    type="number"
                    min={0}
                    step={1}
                    defaultValue={pkg.monthlyPrice ? Number(pkg.monthlyPrice) : ""}
                    placeholder="25"
                  />
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor={`description-${pkg.id}`}>Description</Label>
              <Input id={`description-${pkg.id}`} name="description" defaultValue={pkg.description ?? ""} />
            </div>
            <div>
              <Label htmlFor={`features-${pkg.id}`}>Features (one per line)</Label>
              <Textarea
                id={`features-${pkg.id}`}
                name="featuresText"
                rows={6}
                defaultValue={features.join("\n")}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-28">
                  <Label htmlFor={`sort-${pkg.id}`}>Sort Order</Label>
                  <Input id={`sort-${pkg.id}`} name="sortOrder" type="number" defaultValue={pkg.sortOrder} />
                </div>
                <label className="mt-5 flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" name="isActive" defaultChecked={pkg.isActive} className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-brand-600" />
                  Active (visible for use)
                </label>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
                  <X className="h-3.5 w-3.5" /> Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isPending}>
                  <Check className="h-3.5 w-3.5" /> {isPending ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={!pkg.isActive ? "opacity-60" : ""}>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-slate-100">{pkg.name}</h3>
              {!pkg.isActive && (
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400 ring-1 ring-inset ring-slate-700">
                  Inactive
                </span>
              )}
            </div>
            {pkg.description && <p className="mt-1 text-sm text-slate-400">{pkg.description}</p>}
          </div>
          <div className="flex-none text-right">
            <p className="text-3xl font-bold leading-none text-brand-400">
              {formatCurrency(Number(pkg.price))}
            </p>
            <p className="mt-1 text-xs text-slate-500">one-time</p>
            {pkg.monthlyPrice && (
              <p className="mt-2 border-t border-slate-800 pt-2 text-sm font-semibold text-slate-300">
                + {formatCurrency(Number(pkg.monthlyPrice))}
                <span className="font-normal text-slate-500">/mo</span>
              </p>
            )}
          </div>
        </div>

        {features.length > 0 && (
          <ul className="space-y-1.5 text-sm text-slate-300">
            {features.map((f, i) => (
              <li key={i} className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-brand-500" />
                {f}
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
          {confirmingDelete ? (
            <>
              <span className="mr-auto text-xs text-slate-500">Delete this package?</span>
              <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={isPending}
                onClick={() => startTransition(() => deleteAction())}
              >
                {isPending ? "Deleting…" : "Confirm"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setConfirmingDelete(true)}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
