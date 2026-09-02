"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EDIT_TOOL, SYSTEM_PROMPT, buildContext, sanitizeEdit, labelFields } from "@/lib/ai-editor";

export type AiTurn = { role: "user" | "assistant"; content: string };

export type AiEditResult = {
  ok: boolean;
  message: string;
  changed?: string[];
  /** True when the key is missing, so the UI can explain setup rather than look broken. */
  needsSetup?: boolean;
  /** The exact .env line to add, shown alongside the setup message. */
  setupHint?: string;
};

export async function editPreviewWithAi(
  previewId: string,
  instruction: string,
  history: AiTurn[] = []
): Promise<AiEditResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { ok: false, message: "You need to be signed in." };

  const text = instruction.trim();
  if (!text) return { ok: false, message: "Tell me what you'd like to change." };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      needsSetup: true,
      setupHint: "ANTHROPIC_API_KEY=sk-ant-...",
      message:
        "No Anthropic API key configured. Add ANTHROPIC_API_KEY to your .env file and restart the dev server to enable AI editing.",
    };
  }

  const preview = await prisma.preview.findUnique({ where: { id: previewId } });
  if (!preview) return { ok: false, message: "That preview no longer exists." };

  // Identity-linked keys must say which workspace the request acts in.
  // Org-scoped keys ignore the header, so it's safe to always send when set.
  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID?.trim();
  const client = new Anthropic({
    apiKey,
    ...(workspaceId ? { defaultHeaders: { "anthropic-workspace-id": workspaceId } } : {}),
  });

  // Keep the last few turns so follow-ups like "make it shorter" have context.
  const priorTurns = history.slice(-6).map((t) => ({
    role: t.role,
    content: t.content,
  })) as Anthropic.MessageParam[];

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      tools: [EDIT_TOOL],
      tool_choice: { type: "tool", name: "edit_website" },
      messages: [
        ...priorTurns,
        {
          role: "user",
          content: [
            "Here is the current website content as JSON:",
            "```json",
            JSON.stringify(buildContext(preview as unknown as Record<string, unknown>), null, 2),
            "```",
            "",
            `Requested change: ${text}`,
          ].join("\n"),
        },
      ],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";

    // This one is common enough to be worth its own instruction: the key is
    // valid, it just needs to be told which workspace to bill the call to.
    if (/anthropic-workspace-id/i.test(msg)) {
      return {
        ok: false,
        needsSetup: true,
        setupHint: "ANTHROPIC_WORKSPACE_ID=wrkspc_...",
        message:
          "This is an identity-linked API key, so it needs a workspace ID. Add ANTHROPIC_WORKSPACE_ID to your .env file and restart. You'll find the ID in the Anthropic Console under Settings → Workspaces (it starts with wrkspc_).",
      };
    }

    const isAuth = /\b401\b|authentication_error|invalid x-api-key/i.test(msg);
    if (isAuth) {
      return {
        ok: false,
        needsSetup: true,
        setupHint: "ANTHROPIC_API_KEY=sk-ant-...",
        message: "The Anthropic API rejected the key. Check ANTHROPIC_API_KEY in your .env file.",
      };
    }

    if (/\b429\b|rate_limit/i.test(msg)) {
      return { ok: false, message: "Rate limited by the Anthropic API. Wait a moment and try again." };
    }
    if (/credit balance|billing/i.test(msg)) {
      return { ok: false, message: "The Anthropic account is out of credit. Top up billing and try again." };
    }

    // Anything else: show what the API actually said rather than guessing.
    return { ok: false, message: `The AI request failed: ${msg}` };
  }

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "edit_website"
  );
  if (!toolUse) {
    return { ok: false, message: "The assistant didn't return any changes. Try rephrasing." };
  }

  const input = toolUse.input as Record<string, unknown>;
  const summary =
    typeof input.summary === "string" && input.summary.trim()
      ? input.summary.trim()
      : "Updated the preview.";

  const { data, changed } = sanitizeEdit(input);

  if (changed.length === 0) {
    return { ok: true, message: summary, changed: [] };
  }

  await prisma.preview.update({ where: { id: previewId }, data });

  revalidatePath(`/admin/previews/${previewId}`);
  revalidatePath(`/p/${preview.slug}`);

  return { ok: true, message: summary, changed: labelFields(changed) };
}
