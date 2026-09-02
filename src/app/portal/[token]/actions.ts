"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { ProjectStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { storeUpload, StorageUnavailableError } from "@/lib/storage";

/**
 * Portal actions.
 *
 * There is no login here — the portal token in the URL *is* the credential, so
 * every action looks the project up by token and never trusts an id from the
 * form. A client can only ever affect their own project.
 */

const MAX_BYTES = 12 * 1024 * 1024; // 12MB
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "application/pdf": "pdf",
};

export type PortalResult = { ok: boolean; error?: string; message?: string };

async function projectByToken(token: string) {
  return prisma.project.findUnique({ where: { portalToken: token } });
}

export async function requestRevision(token: string, formData: FormData): Promise<PortalResult> {
  const project = await projectByToken(token);
  if (!project) return { ok: false, error: "We couldn't find that project." };

  const description = String(formData.get("description") ?? "").trim();
  if (!description) return { ok: false, error: "Tell us what you'd like changed." };
  if (description.length > 3000) return { ok: false, error: "That's a bit long — please trim it down." };

  await prisma.revision.create({
    data: { projectId: project.id, description, requestedBy: "CLIENT" },
  });

  // Only pull the project back into revisions from a review state; if we're
  // still building, the note just gets added to the pile.
  if (project.status === ProjectStatus.FINAL_REVIEW) {
    await prisma.project.update({
      where: { id: project.id },
      data: { status: ProjectStatus.REVISION_REQUESTED },
    });
  }

  revalidatePath(`/portal/${token}`);
  revalidatePath(`/admin/projects/${project.id}`);
  return { ok: true, message: "Thanks — we've got your changes and we'll get on them." };
}

export async function approveProject(token: string): Promise<PortalResult> {
  const project = await projectByToken(token);
  if (!project) return { ok: false, error: "We couldn't find that project." };

  const reviewable: ProjectStatus[] = [
    ProjectStatus.FINAL_REVIEW,
    ProjectStatus.REVISION_REQUESTED,
  ];
  if (!reviewable.includes(project.status)) {
    return { ok: false, error: "This project isn't ready for approval yet." };
  }

  await prisma.project.update({
    where: { id: project.id },
    data: { status: ProjectStatus.APPROVED, approvedAt: new Date() },
  });

  // Deliberately not revalidating the portal route: doing so re-renders this
  // page the instant the action returns, which unmounts the button along with
  // the confirmation it just put on screen. The client refreshes on dismiss.
  revalidatePath(`/admin/projects/${project.id}`);
  revalidatePath("/admin/projects");
  return { ok: true, message: "Approved. Next, choose the web address for your site." };
}

/**
 * The client signalling they've sent everything they're going to send.
 *
 * Without this the build can't start until someone asks "is that everything?",
 * so the project sits in Needs Info while both sides wait on each other.
 * They can still send more afterwards — the change box stays open — so this
 * is a green light, not a lock.
 */
export async function markReadyToBuild(token: string): Promise<PortalResult> {
  const project = await projectByToken(token);
  if (!project) return { ok: false, error: "We couldn't find that project." };

  if (project.status !== ProjectStatus.INFORMATION_NEEDED) {
    return { ok: false, error: "This project has already moved on to the next stage." };
  }

  await prisma.project.update({
    where: { id: project.id },
    data: { status: ProjectStatus.IN_DEVELOPMENT },
  });

  // See approveProject: revalidating this route here would wipe the
  // confirmation off the screen before the client could read it.
  revalidatePath(`/admin/projects/${project.id}`);
  revalidatePath("/admin/projects");
  return {
    ok: true,
    message: "Thanks — we'll get started. You can still send us things any time.",
  };
}

export async function uploadClientFiles(token: string, formData: FormData): Promise<PortalResult> {
  const project = await projectByToken(token);
  if (!project) return { ok: false, error: "We couldn't find that project." };

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { ok: false, error: "No files selected." };
  if (files.length > 20) return { ok: false, error: "Please upload 20 files or fewer at a time." };

  let saved = 0;
  for (const file of files) {
    const ext = ALLOWED[file.type];
    if (!ext) {
      return { ok: false, error: `"${file.name}" isn't a supported file (images or PDF).` };
    }
    if (file.size > MAX_BYTES) {
      return { ok: false, error: `"${file.name}" is larger than 12MB.` };
    }

    // Random stored name; the client's filename is kept only as a label.
    const stored = `${Date.now().toString(36)}-${randomBytes(5).toString("hex")}.${ext}`;
    let url: string;
    try {
      url = await storeUpload(`projects/${project.id}/${stored}`, file);
    } catch (e) {
      // The client shouldn't see our infrastructure problem as a broken page.
      if (e instanceof StorageUnavailableError) {
        return { ok: false, error: "We can't accept files just now — we've been told about it." };
      }
      return { ok: false, error: "That upload didn't go through. Please try again." };
    }

    await prisma.fileUpload.create({
      data: {
        projectId: project.id,
        type: file.type === "application/pdf" ? "DOCUMENT" : "IMAGE",
        url,
        filename: file.name.slice(0, 150),
        uploadedBy: "CLIENT",
      },
    });
    saved += 1;
  }

  revalidatePath(`/portal/${token}`);
  revalidatePath(`/admin/projects/${project.id}`);
  return { ok: true, message: `Thanks — ${saved} file${saved === 1 ? "" : "s"} received.` };
}
