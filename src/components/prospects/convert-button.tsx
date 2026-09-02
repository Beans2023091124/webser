"use client";

import { useTransition } from "react";
import { Briefcase, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ConvertToProjectButton({
  action,
  existingProjectId,
}: {
  action: () => Promise<void>;
  existingProjectId?: string | null;
}) {
  const [isPending, startTransition] = useTransition();

  if (existingProjectId) {
    return (
      <a href={`/admin/projects/${existingProjectId}`} className="block">
        <Button variant="outline" size="sm" className="w-full">
          <Briefcase className="h-3.5 w-3.5" />
          Open client project
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </a>
    );
  }

  return (
    <Button
      size="sm"
      className="w-full"
      disabled={isPending}
      onClick={() => startTransition(() => action())}
    >
      <Briefcase className="h-3.5 w-3.5" />
      {isPending ? "Creating…" : "Convert to client project"}
    </Button>
  );
}
