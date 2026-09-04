"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { ProjectStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { publishedSiteUrl } from "@/lib/host";
import { notifyProjectStatus } from "@/lib/email";
import { storeUpload, deleteUpload, StorageUnavailableError } from "@/lib/storage";

/**
 * Portal actions.
 *
 * There is no login here — the portal token in the URL *is* the credential, so
 * every action looks the project up by token and never trusts an id from the
 * form. A client can only ever affect their own project.
 */

// Server Actions on Vercel cap the request body at 4.5MB; promising more
// than that just moves the failure from a clear message to a dead end.
const MAX_BYTES = 4 * 1024 * 1024; // 4MB
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

  // Publish immediately, on the address every site gets for free.
  //
  // Approval used to move the project to APPROVED and then wait for the client
  // to sort out a domain before anything went live, which put a registrar --
  // the one part of this neither of us controls -- directly in front of the
  // finish line. A client whose registrar fought them was left with a signed
  // off site and nothing to show for it.
  //
  // The site goes live now. Connecting their own address is a separate,
  // optional step afterwards that cannot take the site down.
  const preview = await prisma.preview.findFirst({
    where: { id: project.previewId ?? "" },
    select: { slug: true },
  });

  await prisma.project.update({
    where: { id: project.id },
    data: {
      status: ProjectStatus.LIVE,
      approvedAt: new Date(),
      liveUrl: preview ? publishedSiteUrl(preview.slug) : null,
    },
  });

  await notifyProjectStatus(project.id, ProjectStatus.LIVE);

  // Deliberately not revalidating the portal route: doing so re-renders this
  // page the instant the action returns, which unmounts the button along with
  // the confirmation it just put on screen. The client refreshes on dismiss.
  revalidatePath(`/admin/projects/${project.id}`);
  revalidatePath("/admin/projects");
  return { ok: true, message: "Approved — your site is live." };
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
      return { ok: false, error: `"${file.name}" is larger than 4MB. Photos straight off a phone are often over that — send it through a photo app at a smaller size, or email it to us.` };
    }

    // Random stored name; the client's filename is kept only as a label.
    const stored = `${Date.now().toString(36)}-${randomBytes(5).toString("hex")}.${ext}`;
    let url: string;
    try {
      url = await storeUpload(`projects/${project.id}/${stored}`, file);
    } catch (e) {
      // The client shouldn't see our infrastructure problem as a broken page,
      // but the cause has to reach the logs or it's undiagnosable.
      console.error("[upload] portal upload failed", e);
      if (e instanceof StorageUnavailableError) {
        return { ok: false, error: "We can't accept files just now — we've been told about it. Please send them over by text instead." };
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

/**
 * Lets a client take back a file they sent us.
 *
 * The file is looked up by id *and* project so a token can only ever reach its
 * own uploads. Removing the stored object is best-effort: the row going away
 * is what the client sees, and an orphaned blob is cheaper than an error.
 */
export async function deleteClientFile(token: string, fileId: string): Promise<PortalResult> {
  const project = await projectByToken(token);
  if (!project) return { ok: false, error: "We couldn't find that project." };

  const file = await prisma.fileUpload.findFirst({
    where: { id: fileId, projectId: project.id },
    select: { id: true, url: true, uploadedBy: true },
  });
  if (!file) return { ok: false, error: "That file has already been removed." };
  if (file.uploadedBy !== "CLIENT") {
    return { ok: false, error: "That file was added by us — send us a message if it should go." };
  }

  await prisma.fileUpload.delete({ where: { id: file.id } });
  await deleteUpload(file.url);

  revalidatePath(`/portal/${token}`);
  revalidatePath(`/admin/projects/${project.id}`);
  return { ok: true, message: "Removed." };
}
