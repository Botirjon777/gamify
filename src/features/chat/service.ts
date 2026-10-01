import "server-only";
import { db } from "@/lib/db";
import { avatarDataUri } from "@/lib/avatar";

import { MESSAGES_PAGE } from "./constants";

/** Plain, serializable message for the client. */
export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
}

const pairKey = (a: string, b: string) => (a < b ? `${a}:${b}` : `${b}:${a}`);

export const areFriends = async (a: string, b: string) =>
  !!(await db.friendship.findFirst({
    where: { status: "ACCEPTED", OR: [{ requesterId: a, addresseeId: b }, { requesterId: b, addresseeId: a }] },
  }));

/** The conversation if this user may read it, plus whether they may write in it now. */
export async function accessTo(conversationId: string, userId: string) {
  const conv = await db.conversation.findUnique({ where: { id: conversationId }, include: { members: { select: { userId: true } } } });
  if (!conv) return null;

  if (conv.kind === "CLAN") {
    const me = await db.clanMember.findUnique({ where: { userId } });
    if (me?.clanId !== conv.clanId) return null;
    return { conv, canSend: true, peerId: null };
  }

  if (!conv.members.some((m) => m.userId === userId)) return null;
  const peerId = conv.members.find((m) => m.userId !== userId)?.userId ?? null;
  return { conv, canSend: !!peerId && (await areFriends(userId, peerId)), peerId };
}

/** Direct chat with a friend (created on first use). */
export async function getOrCreateDirect(meId: string, otherId: string) {
  const key = pairKey(meId, otherId);
  const existing = await db.conversation.findUnique({ where: { pairKey: key } });
  if (existing) return existing;
  return db.conversation
    .create({ data: { kind: "DIRECT", pairKey: key, members: { create: [{ userId: meId }, { userId: otherId }] } } })
    .catch(() => db.conversation.findUniqueOrThrow({ where: { pairKey: key } })); // two clicks racing
}

/** The clan's chat, with a read-position row for this member (both created on first use). */
export async function ensureClanConversation(clanId: string, userId: string) {
  const conv = await db.conversation.upsert({ where: { clanId }, create: { kind: "CLAN", clanId }, update: {} });
  await db.conversationMember.upsert({
    where: { conversationId_userId: { conversationId: conv.id, userId } },
    create: { conversationId: conv.id, userId },
    update: {},
  });
  return conv;
}

/** Someone left / was removed from a clan: drop their read row (access is checked via ClanMember anyway). */
export async function leaveClanChat(clanId: string, userId: string) {
  await db.conversationMember.deleteMany({ where: { userId, conversation: { clanId } } });
}

/** Unread message count per conversation (messages from others after my read position). */
async function unreadByConversation(userId: string): Promise<Map<string, number>> {
  const rows = await db.$queryRaw<{ conversationId: string; n: number }[]>`
    SELECT m."conversationId", count(*)::int AS n
    FROM "Message" m
    JOIN "ConversationMember" cm ON cm."conversationId" = m."conversationId" AND cm."userId" = ${userId}
    WHERE m."senderId" <> ${userId} AND m."createdAt" > cm."lastReadAt"
    GROUP BY m."conversationId"`;
  return new Map(rows.map((r) => [r.conversationId, r.n]));
}

/** For the nav badge: how many conversations have something new. */
export async function unreadChats(userId: string): Promise<number> {
  return (await unreadByConversation(userId)).size;
}

/** Chat list: the clan chat first (if in a clan), then direct chats by latest message. */
export async function listConversations(userId: string) {
  const clan = await db.clanMember.findUnique({ where: { userId }, include: { clan: true } });
  if (clan) await ensureClanConversation(clan.clanId, userId);

  const [rows, unread] = await Promise.all([
    db.conversationMember.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            clan: { select: { name: true, tag: true, emblem: true, color: true } },
            members: { where: { userId: { not: userId } }, include: { user: { select: { id: true, username: true, avatarSeed: true, avatarStyle: true, gender: true } } } },
            messages: { orderBy: { createdAt: "desc" }, take: 1, include: { sender: { select: { username: true } } } },
          },
        },
      },
    }),
    unreadByConversation(userId),
  ]);

  return rows
    .map(({ conversation: c }) => {
      const peer = c.members[0]?.user ?? null;
      const last = c.messages[0];
      return {
        id: c.id,
        kind: c.kind,
        clan: c.clan,
        peer: peer && { id: peer.id, username: peer.username, avatar: avatarDataUri(peer.avatarSeed, peer.avatarStyle, peer.gender) },
        last: last && { body: last.body, mine: last.senderId === userId, sender: last.sender.username, createdAt: last.createdAt.toISOString() },
        lastMessageAt: c.lastMessageAt,
        unread: unread.get(c.id) ?? 0,
      };
    })
    .filter((c) => c.kind === "CLAN" || c.last) // empty direct chats stay hidden
    .sort((a, b) => Number(b.kind === "CLAN") - Number(a.kind === "CLAN") || b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
}

const toMessage = (m: { id: string; senderId: string; body: string; createdAt: Date; sender: { username: string } }): ChatMessage => ({
  id: m.id,
  senderId: m.senderId,
  senderName: m.sender.username,
  body: m.body,
  createdAt: m.createdAt.toISOString(),
});

/** Oldest → newest. `before` = cursor of the oldest loaded message (scrolling up); `after` = newest (polling). */
export async function getMessages(conversationId: string, opts: { before?: { createdAt: string; id: string }; after?: string } = {}) {
  const { before, after } = opts;
  const rows = await db.message.findMany({
    where: {
      conversationId,
      ...(before && {
        OR: [{ createdAt: { lt: new Date(before.createdAt) } }, { createdAt: new Date(before.createdAt), id: { lt: before.id } }],
      }),
      ...(after && { createdAt: { gt: new Date(after) } }),
    },
    orderBy: after ? [{ createdAt: "asc" }, { id: "asc" }] : [{ createdAt: "desc" }, { id: "desc" }],
    take: after ? 100 : MESSAGES_PAGE,
    include: { sender: { select: { username: true } } },
  });
  const list = rows.map(toMessage);
  return after ? list : list.reverse();
}

export async function markRead(conversationId: string, userId: string) {
  await db.conversationMember.updateMany({ where: { conversationId, userId }, data: { lastReadAt: new Date() } });
}

export async function postMessage(conversationId: string, senderId: string, body: string): Promise<ChatMessage> {
  const [message] = await db.$transaction([
    db.message.create({ data: { conversationId, senderId, body }, include: { sender: { select: { username: true } } } }),
    db.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } }),
    db.conversationMember.updateMany({ where: { conversationId, userId: senderId }, data: { lastReadAt: new Date() } }),
  ]);
  return toMessage(message);
}
