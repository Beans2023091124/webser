"use client";

import { useTransition } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GeneratePreviewButton({
  action,
  label = "Generate Website Preview",
}: {
  action: () => Promise<void>;
  label?: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      className="w-full"
      disabled={isPending}
      onClick={() => startTransition(() => action())}
    >
      <Sparkles className="h-3.5 w-3.5" />
      {isPending ? "Generating…" : label}
    </Button>
  );
}
