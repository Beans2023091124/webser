"use client";

import { useState, useTransition } from "react";
import { Template } from "@prisma/client";
import { Pencil, Check, X, Layers } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { INDUSTRY_DEFAULTS } from "@/lib/preview";

export function TemplateCard({
  template,
  previewCount,
  updateAction,
}: {
  template: Template;
  previewCount: number;
  updateAction: (formData: FormData) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const defaults = INDUSTRY_DEFAULTS[template.industry];

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await updateAction(formData);
      setEditing(false);
    });
  }

  return (
    <Card className={!template.isActive ? "opacity-60" : ""}>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 flex-none items-center justify-center rounded-md"
              style={{ background: `${defaults?.primaryColor ?? "#334155"}22` }}
            >
              <Layers className="h-5 w-5" style={{ color: defaults?.primaryColor ?? "#94a3b8" }} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100">{template.name}</h3>
              <p className="text-xs uppercase tracking-wide text-slate-500">{template.industry}</p>
            </div>
          </div>
          {!template.isActive && (
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400 ring-1 ring-inset ring-slate-700">
              Inactive
            </span>
          )}
        </div>

        {editing ? (
          <form action={handleSubmit} className="space-y-3">
            <Input name="description" defaultValue={template.description ?? ""} placeholder="Description" />
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={template.isActive}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-brand-600"
              />
              Active (selectable when generating previews)
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
                <X className="h-3.5 w-3.5" /> Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isPending}>
                <Check className="h-3.5 w-3.5" /> {isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        ) : (
          <>
            <p className="text-sm text-slate-400">{template.description}</p>
            <div className="flex items-center justify-between border-t border-slate-800 pt-3">
              <span className="text-xs text-slate-500">
                {previewCount} preview{previewCount === 1 ? "" : "s"} generated
              </span>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
