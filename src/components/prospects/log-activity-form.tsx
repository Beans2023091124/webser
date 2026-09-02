"use client";

import { useRef, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";

export function LogActivityForm({
  prospectId,
  action,
}: {
  prospectId: string;
  action: (formData: FormData) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await action(formData);
      formRef.current?.reset();
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-3">
      <input type="hidden" name="prospectId" value={prospectId} />
      <div className="grid grid-cols-2 gap-3">
        <Select name="type" defaultValue="CALL" required>
          <option value="CALL">Call</option>
          <option value="EMAIL">Email</option>
          <option value="MEETING">Meeting</option>
          <option value="NOTE">Note</option>
        </Select>
        <Input name="outcome" placeholder="Outcome (e.g. No answer)" />
      </div>
      <Textarea
        name="description"
        placeholder="What happened? e.g. Called and left a voicemail about a website preview."
        rows={2}
        required
      />
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "Logging…" : "Log Activity"}
      </Button>
    </form>
  );
}
