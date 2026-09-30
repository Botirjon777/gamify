import "server-only";
import { db } from "@/lib/db";
import { iqFromRating } from "@/features/iq/rating";
import { effectivePlan } from "@/features/plans/plans";
import { tashkentWeekStart } from "@/lib/time";

export type Relation = "self" | "none" | "friends" | "outgoing" | "incoming";

export const publicUserSelect = {
  id: true,
  username: true,
  avatarSeed: true,
  avatarStyle: true,
  level: true,
  xp: true,
  plan: true,
  planExpiresAt: true,
  iqRating: true,
  iqTestedAt: true,
  clanMembership: { select: { clan: { select: { tag: true, slug: true } } } },
} as const;

export function toPublicUser(u: {
  id: string;
  username: string;
  avatarSeed: string;
  avatarStyle: string;
  level: number;
  xp: number;
  plan: "FREE" | "PRO" | "DIAMOND";
  planExpiresAt: Date | null;
  iqRating: number;
  iqTestedAt: Date | null;
  clanMembership: { clan: { tag: string; slug: string } } | null;
}) {
  return {
    id: u.id,
    username: u.username,
    avatarSeed: u.avatarSeed,
    avatarStyle: u.avatarStyle,
    level: u.level,
    xp: u.xp,
    plan: effectivePlan(u),
    iq: u.iqTestedAt ? iqFromRating(u.iqRating) : null,
    clanTag: u.clanMembership?.clan.tag ?? null,
    clanSlug: u.clanMembership?.clan.slug ?? null,
  };
}
export type PublicUser = ReturnType<typeof toPublicUser>;

/** How `me` relates to each of `otherIds`. */
export async function relationsTo(meId: string, otherIds: string[]): Promise<Map<string, { relation: Relation; requestId?: string }>> {
  const rows = await db.friendship.findMany({
    where: {
      OR: [
        { requesterId: meId, addresseeId: { in: otherIds } },
        { addresseeId: meId, requesterId: { in: otherIds } },
      ],
    },
  });
  const out = new Map<string, { relation: Relation; requestId?: string }>();
  for (const id of otherIds) out.set(id, { relation: id === meId ? "self" : "none" });
  for (const r of rows) {
    const other = r.requesterId === meId ? r.addresseeId : r.requesterId;
    out.set(other, {
      relation: r.status === "ACCEPTED" ? "friends" : r.requesterId === meId ? "outgoing" : "incoming",
      requestId: r.id,
    });
  }
  return out;
}

/** Username search among members of this tenant. */
export async function searchUsers(meId: string, tenantId: string, query: string) {
  const q = query.trim().replace(/^@/, "");
  if (q.length < 2) return [];
  const users = await db.user.findMany({
    where: {
      id: { not: meId },
      username: { contains: q.toLowerCase(), mode: "insensitive" },
      memberships: { some: { tenantId } },
    },
    orderBy: [{ xp: "desc" }],
    take: 20,
    select: publicUserSelect,
  });
  const rel = await relationsTo(meId, users.map((u) => u.id));
  return users.map((u) => ({ ...toPublicUser(u), ...rel.get(u.id)! }));
}

export async function getFriends(meId: string, tenantId: string) {
  const rows = await db.friendship.findMany({
    where: { status: "ACCEPTED", OR: [{ requesterId: meId }, { addresseeId: meId }] },
    include: { requester: { select: publicUserSelect }, addressee: { select: publicUserSelect } },
  });
  const friends = rows.map((r) => ({ ...toPublicUser(r.requesterId === meId ? r.addressee : r.requester), requestId: r.id }));

  // Weekly XP → friends ranking.
  const weekly = await db.weeklyScore.findMany({
    where: { userId: { in: friends.map((f) => f.id) }, tenantId, week: tashkentWeekStart(), board: "XP" },
  });
  const byUser = new Map(weekly.map((w) => [w.userId, w.value]));
  return friends
    .map((f) => ({ ...f, weeklyXp: byUser.get(f.id) ?? 0 }))
    .sort((a, b) => b.weeklyXp - a.weeklyXp || b.xp - a.xp);
}

export async function getFriendRequests(meId: string) {
  const [incoming, outgoing] = await Promise.all([
    db.friendship.findMany({
      where: { addresseeId: meId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: { requester: { select: publicUserSelect } },
    }),
    db.friendship.findMany({
      where: { requesterId: meId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: { addressee: { select: publicUserSelect } },
    }),
  ]);
  return {
    incoming: incoming.map((r) => ({ ...toPublicUser(r.requester), requestId: r.id, createdAt: r.createdAt })),
    outgoing: outgoing.map((r) => ({ ...toPublicUser(r.addressee), requestId: r.id, createdAt: r.createdAt })),
  };
}

export const countIncomingRequests = (meId: string) =>
  db.friendship.count({ where: { addresseeId: meId, status: "PENDING" } });
