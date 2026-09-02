"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * A submit button that shows the form is actually doing something.
 *
 * Server Actions can take a second against a remote database, and a button
 * that looks identical before and after the click invites a second click —
 * which submits the form twice. useFormStatus reads the pending state of the
 * enclosing form, so this has to live inside that form, not beside it.
 */
export function SubmitButton({
  children = "Save",
  pendingLabel = "Saving…",
  size = "sm",
  variant,
  className,
}: {
  children?: React.ReactNode;
  pendingLabel?: string;
  size?: "sm" | "md" | "lg" | "icon";
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size={size} variant={variant} className={className} disabled={pending}>
      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {pending ? pendingLabel : children}
    </Button>
  );
}
