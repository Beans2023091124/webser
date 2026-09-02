"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { editPreviewWithAi } from "@/app/admin/previews/ai-actions";

export type ApplyRevisionResult = {
  ok: boolean;
  message: string;
  changed?: string[];
  needsSetup?: boolean;
  setupHint?: string;
};

/**
 * Applies a client's change request to their site using the AI editor.
 *
 * Deliberately admin-triggered rather than automatic: the instruction text
 * comes from a customer, and letting arbitrary customer input rewrite a live
 * site unattended is not something you want running while you sleep. The
 * admin reads the request, clicks apply, and reviews the result.
 */
export async function applyRevisionWithAi(
  revisionId: string,
  note?: string
): Promise<ApplyRevisionResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { ok: false, message: "You need to be signed in." };

  const revision = await prisma.revision.findUnique({
    where: { id: revisionId },
    include: { project: { include: { preview: true } } },
  });

  if (!revision) return { ok: false, message: "That change request no longer exists." };

  const preview = revision.project.preview;
  if (!preview) {
    return {
      ok: false,
      message:
        "This project has no website preview linked, so there's nothing for the AI to edit. Link a preview on the project first.",
    };
  }

  // Frame it as what it is — a customer's words, to be interpreted, not obeyed
  // as instructions to the system.
  const extra = note?.trim().slice(0, 2000);
  const instruction = [
    "A customer sent this change request for their website:",
    "",
    `"${revision.description}"`,
    "",
    "Apply it as faithfully as you can using the available fields. If part of it",
    "isn't something you can change (a photo swap, for example), do the parts you",
    "can and say clearly in your summary what still needs doing by hand.",
    // The designer's note is our own instruction, so unlike the quoted customer
    // text above it is meant to be followed, and it wins on any disagreement.
    ...(extra
      ? [
          "",
          "Additional direction from the designer handling this job — follow it, and",
          "prefer it over the customer's wording wherever the two conflict:",
          "",
          extra,
        ]
      : []),
  ].join("\n");

  const result = await editPreviewWithAi(preview.id, instruction, []);

  if (!result.ok) {
    return {
      ok: false,
      message: result.message,
      needsSetup: result.needsSetup,
      setupHint: result.setupHint,
    };
  }

  const changed = result.changed ?? [];

  // Something actually changed → the work is underway, not finished; the admin
  // still has to look at it before it counts as done.
  if (changed.length > 0 && revision.status === "OPEN") {
    await prisma.revision.update({
      where: { id: revisionId },
      data: { status: "IN_PROGRESS" },
    });
  }

  revalidatePath(`/admin/projects/${revision.projectId}`);
  revalidatePath(`/admin/previews/${preview.id}`);
  revalidatePath(`/p/${preview.slug}`);
  revalidatePath(`/portal/${revision.project.portalToken}`);

  return { ok: true, message: result.message, changed };
}
