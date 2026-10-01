"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { getRateLimiter } from "@/lib/rate-limit";
import { accessTo, areFriends, getMessages, getOrCreateDirect, markRead, postMessage, type ChatMessage } from "./service";
import { MESSAGE_MAX } from "./constants";

const id = z.string().min(1).max(40);

export type SendResult = { ok: true; message: ChatMessage } | { ok: false; error: "empty" | "tooLong" | "forbidden" | "tooMany" };

export async function sendMessage(conversationId: string, text: string): Promise<SendResult> {
  const { user } = await requireSession();
  const body = text.trim();
  if (!body) return { ok: false, error: "empty" };
  if (body.length > MESSAGE_MAX) return { ok: false, error: "tooLong" };

  const access = await accessTo(id.parse(conversationId), user.id);
  if (!access?.canSend) return { ok: false, error: "forbidden" };
  const limit = await getRateLimiter().hit(`chat:${user.id}`, 20, 60);
  if (!limit.ok) return { ok: false, error: "tooMany" };

  return { ok: true, message: await postMessage(access.conv.id, user.id, body) };
}

/** Polling: messages newer than `after`. Marks them read (and refreshes the unread badge) when there are new ones. */
export async function fetchNewMessages(conversationId: string, after: string): Promise<ChatMessage[]> {
  const { user } = await requireSession();
  const access = await accessTo(id.parse(conversationId), user.id);
  if (!access) return [];
  const messages = await getMessages(access.conv.id, { after: z.iso.datetime().parse(after) });
  if (messages.some((m) => m.senderId !== user.id)) {
    await markRead(access.conv.id, user.id);
    revalidatePath("/", "layout");
  }
  return messages;
}

/** Older messages (scrolling up). */
export async function fetchOlderMessages(conversationId: string, before: { createdAt: string; id: string }): Promise<ChatMessage[]> {
  const { user } = await requireSession();
  const access = await accessTo(id.parse(conversationId), user.id);
  if (!access) return [];
  const cursor = z.object({ createdAt: z.iso.datetime(), id }).parse(before);
  return getMessages(access.conv.id, { before: cursor });
}

/** Opening a conversation: mark it read and refresh the unread badge. */
export async function markChatRead(conversationId: string) {
  const { user } = await requireSession();
  const access = await accessTo(id.parse(conversationId), user.id);
  if (!access) return;
  await markRead(access.conv.id, user.id);
  revalidatePath("/", "layout");
}

/** "Xabar yozish" on a friend's profile → their conversation (client navigates). */
export async function startDirectChat(userId: string): Promise<{ redirectTo?: string; error?: "notFriends" }> {
  const { user } = await requireSession();
  const other = id.parse(userId);
  if (other === user.id || !(await areFriends(user.id, other))) return { error: "notFriends" };
  const conv = await getOrCreateDirect(user.id, other);
  return { redirectTo: `/chat/${conv.id}` };
}
