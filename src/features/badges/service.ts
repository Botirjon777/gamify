import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { awardXp } from "@/features/gamification/xp";
import { notify } from "@/features/notifications/service";
import { effectivePlan } from "@/features/plans/plans";
import { iqFromRating } from "@/features/iq/rating";
import { BADGE_BY_KEY, BADGES, type BadgeStats } from "./catalog";

type Tx = Prisma.TransactionClient;

async function statsFor(tx: Tx, userId: string): Promise<BadgeStats> {
  const [user, solved, mastered, friends, membership, referrals] = await Promise.all([
    tx.user.findUniqueOrThrow({ where: { id: userId } }),
    tx.attempt.count({ where: { userId, correct: true } }),
    tx.skillMastery.count({ where: { userId, score: { gte: 85 } } }),
    tx.friendship.count({ where: { status: "ACCEPTED", OR: [{ requesterId: userId }, { addresseeId: userId }] } }),
    tx.clanMember.findUnique({ where: { userId } }),
    tx.user.count({ where: { referredById: userId, referralRewardedAt: { not: null } } }),
  ]);
  return {
    level: user.level,
    longestStreak: user.longestStreak,
    solved,
    masteredSkills: mastered,
    iqTested: !!user.iqTestedAt,
    iq: user.iqTestedAt ? iqFromRating(user.iqRating) : null,
    friends,
    inClan: !!membership,
    clanLeader: membership?.role === "LEADER",
    referralsRewarded: referrals,
    paid: effectivePlan(user),
  };
}

/**
 * Check every stats-based badge, grant the new ones (+XP, +notification).
 * Call at the end of any transaction that changes progress. Returns the keys of newly earned badges.
 */
export async function evaluateBadges(tx: Tx, userId: string, tenantId: string): Promise<string[]> {
  const [stats, owned] = await Promise.all([
    statsFor(tx, userId),
    tx.userBadge.findMany({ where: { userId }, select: { badge: true } }),
  ]);
  const have = new Set(owned.map((b) => b.badge));
  const fresh = BADGES.filter((b) => b.earned && !have.has(b.key) && b.earned(stats)).map((b) => b.key);
  for (const key of fresh) await grantBadge(tx, userId, tenantId, key);
  return fresh;
}

/** Grant one badge (idempotent). Used directly for event badges like clan_champion. */
export async function grantBadge(tx: Tx, userId: string, tenantId: string, key: string) {
  const def = BADGE_BY_KEY.get(key);
  if (!def) return false;
  const created = await tx.userBadge.createMany({ data: { userId, badge: key }, skipDuplicates: true });
  if (created.count === 0) return false;
  if (def.xp > 0) await awardXp(tx, { userId, tenantId, amount: def.xp, reason: "BADGE", refId: key });
  await notify(tx, userId, "BADGE_EARNED", { badge: key, xp: def.xp });
  return true;
}
