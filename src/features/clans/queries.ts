import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { addDays, tashkentWeekStart } from "@/lib/time";
import { awardXp } from "@/features/gamification/xp";
import { grantBadge } from "@/features/badges/service";
import { notifyMany } from "@/features/notifications/service";
import { effectivePlan, PLANS } from "@/features/plans/plans";
import { publicUserSelect, toPublicUser } from "@/features/social/queries";

type Db = Prisma.TransactionClient;

/** XP rewards for every member of the top-3 clans of a finished week. */
export const CLAN_WEEKLY_REWARDS = [300, 200, 100];

export interface ClanStanding {
  id: string;
  slug: string;
  name: string;
  tag: string;
  emblem: string;
  color: string;
  members: number;
  score: number;
  rank: number;
}

/** Clan score for a week = total XP its (current) members earned that week. */
export async function standings(tx: Db, tenantId: string, week: Date): Promise<ClanStanding[]> {
  const clans = await tx.clan.findMany({ where: { tenantId }, include: { members: { select: { userId: true } } } });
  const userIds = clans.flatMap((c) => c.members.map((m) => m.userId));
  const scores = userIds.length
    ? await tx.weeklyScore.findMany({ where: { tenantId, week, board: "XP", userId: { in: userIds } } })
    : [];
  const byUser = new Map(scores.map((s) => [s.userId, s.value]));

  return clans
    .map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      tag: c.tag,
      emblem: c.emblem,
      color: c.color,
      members: c.members.length,
      score: c.members.reduce((sum, m) => sum + (byUser.get(m.userId) ?? 0), 0),
    }))
    .sort((a, b) => b.score - a.score || b.members - a.members || a.name.localeCompare(b.name))
    .map((c, i) => ({ ...c, rank: i + 1 }));
}

/**
 * Write last week's final standings and hand out rewards — exactly once per tenant per week.
 * Runs lazily on the first page view after the week ends (no job runner needed); an advisory lock
 * makes concurrent viewers wait instead of double-rewarding.
 */
export async function finalizePreviousWeek(tenantId: string) {
  const week = addDays(tashkentWeekStart(), -7);
  if (await db.clanWeeklyResult.findFirst({ where: { tenantId, week } })) return;

  await db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`clan-week:${tenantId}:${week.toISOString()}`}))`;
      if (await tx.clanWeeklyResult.findFirst({ where: { tenantId, week } })) return;

      const final = (await standings(tx, tenantId, week)).filter((s) => s.score > 0);
      if (!final.length) return;

      await tx.clanWeeklyResult.createMany({
        data: final.map((s) => ({ tenantId, week, clanId: s.id, rank: s.rank, score: s.score, members: s.members })),
      });

      for (const s of final.slice(0, CLAN_WEEKLY_REWARDS.length)) {
        const xp = CLAN_WEEKLY_REWARDS[s.rank - 1];
        const members = await tx.clanMember.findMany({ where: { clanId: s.id }, select: { userId: true } });
        for (const m of members) {
          await awardXp(tx, { userId: m.userId, tenantId, amount: xp, reason: "CLAN_REWARD", refId: s.id });
          if (s.rank === 1) await grantBadge(tx, m.userId, tenantId, "clan_champion");
        }
        await notifyMany(
          tx,
          members.map((m) => m.userId),
          "CLAN_WEEKLY_RESULT",
          { clanName: s.name, clanSlug: s.slug, rank: s.rank, xp },
        );
      }
    },
    { timeout: 60_000 },
  );
}

export async function getClanRating(tenantId: string) {
  await finalizePreviousWeek(tenantId);
  const week = tashkentWeekStart();
  const [current, lastWeek] = await Promise.all([
    standings(db, tenantId, week),
    db.clanWeeklyResult.findMany({
      where: { tenantId, week: addDays(week, -7), rank: { lte: 3 } },
      orderBy: { rank: "asc" },
      include: { clan: true },
    }),
  ]);
  return { current, lastWeek };
}

/** Member limit depends on the leader's plan. */
async function memberLimit(clanId: string) {
  const leader = await db.clanMember.findFirst({ where: { clanId, role: "LEADER" }, include: { user: true } });
  return PLANS[leader ? effectivePlan(leader.user) : "FREE"].clanMemberLimit;
}

export async function getClan(slug: string, tenantId: string, meId: string) {
  const clan = await db.clan.findFirst({
    where: { slug, tenantId },
    include: {
      members: { include: { user: { select: publicUserSelect } }, orderBy: { joinedAt: "asc" } },
      requests: {
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
        include: { user: { select: publicUserSelect } },
      },
    },
  });
  if (!clan) return null;

  const week = tashkentWeekStart();
  const [scores, limit, myMembership, myRequest, all] = await Promise.all([
    db.weeklyScore.findMany({
      where: { tenantId, week, board: "XP", userId: { in: clan.members.map((m) => m.userId) } },
    }),
    memberLimit(clan.id),
    db.clanMember.findUnique({ where: { userId: meId } }),
    db.clanJoinRequest.findUnique({ where: { clanId_userId: { clanId: clan.id, userId: meId } } }),
    standings(db, tenantId, week),
  ]);
  const byUser = new Map(scores.map((s) => [s.userId, s.value]));
  const members = clan.members
    .map((m) => ({ ...toPublicUser(m.user), role: m.role, joinedAt: m.joinedAt, weeklyXp: byUser.get(m.userId) ?? 0 }))
    .sort((a, b) => roleOrder(a.role) - roleOrder(b.role) || b.weeklyXp - a.weeklyXp);

  const myRole = myMembership?.clanId === clan.id ? myMembership.role : null;
  return {
    id: clan.id,
    slug: clan.slug,
    name: clan.name,
    tag: clan.tag,
    description: clan.description,
    emblem: clan.emblem,
    color: clan.color,
    createdAt: clan.createdAt,
    members,
    memberLimit: limit,
    weeklyScore: members.reduce((sum, m) => sum + m.weeklyXp, 0),
    weeklyRank: all.find((s) => s.id === clan.id)?.rank ?? null,
    myRole,
    /** In another clan already → can't request. */
    inOtherClan: !!myMembership && myMembership.clanId !== clan.id,
    myRequestPending: myRequest?.status === "PENDING",
    // Only leaders and officers see (and decide) join requests.
    requests:
      myRole === "LEADER" || myRole === "OFFICER"
        ? clan.requests.map((r) => ({ id: r.id, message: r.message, createdAt: r.createdAt, user: toPublicUser(r.user) }))
        : [],
  };
}

const roleOrder = (role: string) => ({ LEADER: 0, OFFICER: 1, MEMBER: 2 })[role] ?? 3;

export async function getMyClan(userId: string) {
  const m = await db.clanMember.findUnique({ where: { userId }, include: { clan: true } });
  return m ? { ...m.clan, role: m.role } : null;
}

export const pendingClanRequestsFor = (userId: string) =>
  db.clanJoinRequest.count({
    where: { status: "PENDING", clan: { members: { some: { userId, role: { in: ["LEADER", "OFFICER"] } } } } },
  });

export { memberLimit };
