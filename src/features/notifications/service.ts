import "server-only";
import type { NotificationType, Prisma } from "@/generated/prisma/client";

type Db = Prisma.TransactionClient;

/** Payload per notification type — rendered by NotificationItem with the matching i18n message. */
export interface NotificationData {
  FRIEND_REQUEST: { username: string };
  FRIEND_ACCEPTED: { username: string };
  CLAN_JOIN_REQUEST: { username: string; clanName: string; clanSlug: string };
  CLAN_JOIN_APPROVED: { clanName: string; clanSlug: string };
  CLAN_JOIN_REJECTED: { clanName: string; clanSlug: string };
  CLAN_WEEKLY_RESULT: { clanName: string; clanSlug: string; rank: number; xp: number };
  BADGE_EARNED: { badge: string; xp: number };
  LEVEL_UP: { level: number };
  REFERRAL_JOINED: { username: string };
  REFERRAL_REWARD: { username: string; xp: number };
  PAYMENT_SUBMITTED: { username: string; plan: string; amount: number };
  PAYMENT_APPROVED: { plan: string; until: string };
  PAYMENT_REJECTED: { plan: string; reason: string };
  TRACK_COMPLETED: { track: string; trackSlug: string; xp: number };
  SEASON_RESULT: { season: number; rank: number; xp: number };
  DUEL_INVITE: { username: string; track: string; stake: number; duelId: string };
  DUEL_DECLINED: { username: string; duelId: string };
  DUEL_RESULT: { username: string; result: "win" | "lose" | "draw"; xp: number; duelId: string };
}

export async function notify<T extends NotificationType>(db: Db, userId: string, type: T, data: NotificationData[T]) {
  await db.notification.create({ data: { userId, type, data: data as unknown as Prisma.InputJsonValue } });
}

export async function notifyMany<T extends NotificationType>(db: Db, userIds: string[], type: T, data: NotificationData[T]) {
  if (!userIds.length) return;
  await db.notification.createMany({
    data: userIds.map((userId) => ({ userId, type, data: data as unknown as Prisma.InputJsonValue })),
  });
}
