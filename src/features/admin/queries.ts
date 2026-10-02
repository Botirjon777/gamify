import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { addDays, tashkentToday } from "@/lib/time";

const DAY_MS = 24 * 60 * 60 * 1000;
/** UTC instant of 00:00 Tashkent for a Tashkent calendar day. */
const dayStart = (day: Date) => new Date(day.getTime() - 5 * 60 * 60 * 1000);

export async function getAdminStats() {
  const today = tashkentToday();
  const now = new Date();
  const monthStart = dayStart(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)));
  const paidWhere: Prisma.UserWhereInput = { plan: { not: "FREE" }, OR: [{ planExpiresAt: null }, { planExpiresAt: { gt: now } }] };

  const [
    totalUsers,
    newToday,
    new7d,
    new30d,
    activeToday,
    active7d,
    paidUsers,
    proUsers,
    diamondUsers,
    blockedUsers,
    iqTested,
    pendingPayments,
    revenueMonth,
    revenueTotal,
    attemptsToday,
    clans,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: dayStart(today) } } }),
    db.user.count({ where: { createdAt: { gte: dayStart(addDays(today, -6)) } } }),
    db.user.count({ where: { createdAt: { gte: dayStart(addDays(today, -29)) } } }),
    db.user.count({ where: { lastActiveDay: today } }),
    db.user.count({ where: { lastActiveDay: { gte: addDays(today, -6) } } }),
    db.user.count({ where: paidWhere }),
    db.user.count({ where: { ...paidWhere, plan: "PRO" } }),
    db.user.count({ where: { ...paidWhere, plan: "DIAMOND" } }),
    db.user.count({ where: { blockedAt: { not: null } } }),
    db.user.count({ where: { iqTestedAt: { not: null } } }),
    db.payment.count({ where: { status: "PENDING" } }),
    db.payment.aggregate({ where: { status: "APPROVED", reviewedAt: { gte: monthStart } }, _sum: { amountUzs: true } }),
    db.payment.aggregate({ where: { status: "APPROVED" }, _sum: { amountUzs: true } }),
    db.attempt.count({ where: { createdAt: { gte: dayStart(today) } } }),
    db.clan.count(),
  ]);

  return {
    totalUsers,
    newToday,
    new7d,
    new30d,
    activeToday,
    active7d,
    paidUsers,
    proUsers,
    diamondUsers,
    blockedUsers,
    iqTested,
    pendingPayments,
    revenueMonth: revenueMonth._sum.amountUzs ?? 0,
    revenueTotal: revenueTotal._sum.amountUzs ?? 0,
    attemptsToday,
    clans,
  };
}

/** Sign-ups per Tashkent day for the last `days` days (zero-filled, oldest first). */
export async function getSignupSeries(days = 30) {
  const today = tashkentToday();
  const from = addDays(today, -(days - 1));
  const rows = await db.$queryRaw<{ day: Date; count: bigint }[]>`
    SELECT date_trunc('day', "createdAt" + interval '5 hours') AS day, count(*) AS count
    FROM "User"
    WHERE "createdAt" >= ${dayStart(from)}
    GROUP BY 1`;
  const byDay = new Map(rows.map((r) => [new Date(r.day).toISOString().slice(0, 10), Number(r.count)]));
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(from.getTime() + i * DAY_MS);
    const key = d.toISOString().slice(0, 10);
    return { day: key, count: byDay.get(key) ?? 0 };
  });
}

export type UserFilter = "all" | "paid" | "blocked" | "admins";
const PAGE_SIZE = 30;

export async function listUsers({ q, filter, page }: { q: string; filter: UserFilter; page: number }) {
  const now = new Date();
  const text = q.trim().replace(/^@/, "");
  const where: Prisma.UserWhereInput = {
    ...(text && {
      OR: [
        { username: { contains: text.toLowerCase(), mode: "insensitive" } },
        { phone: { contains: text.replace(/[\s()-]/g, "") } },
        { email: { contains: text.toLowerCase(), mode: "insensitive" } },
      ],
    }),
    ...(filter === "paid" && { plan: { not: "FREE" }, OR: [{ planExpiresAt: null }, { planExpiresAt: { gt: now } }] }),
    ...(filter === "blocked" && { blockedAt: { not: null } }),
    ...(filter === "admins" && { isSuperAdmin: true }),
  };
  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        username: true,
        phone: true,
        email: true,
        gender: true,
        avatarSeed: true,
        avatarStyle: true,
        level: true,
        xp: true,
        plan: true,
        planExpiresAt: true,
        isSuperAdmin: true,
        blockedAt: true,
        createdAt: true,
        lastActiveDay: true,
      },
    }),
  ]);
  return { total, users, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)), pageSize: PAGE_SIZE };
}

export async function getAdminUser(id: string) {
  const user = await db.user.findUnique({
    where: { id },
    include: {
      payments: { orderBy: { createdAt: "desc" }, take: 20 },
      sessions: { where: { revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { lastActiveAt: "desc" } },
      clanMembership: { include: { clan: true } },
      _count: { select: { attempts: true, iqSessions: true, badges: true } },
    },
  });
  if (!user) return null;
  const [xpEvents, actions] = await Promise.all([
    db.xpEvent.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 15 }),
    db.adminAction.findMany({ where: { targetUserId: id }, orderBy: { createdAt: "desc" }, take: 15 }),
  ]);
  return { user, xpEvents, actions };
}

export async function listPayments(status: "PENDING" | "APPROVED" | "REJECTED") {
  return db.payment.findMany({
    where: { status },
    orderBy: status === "PENDING" ? { createdAt: "asc" } : { reviewedAt: "desc" },
    take: 100,
    include: {
      user: { select: { id: true, username: true, phone: true, avatarSeed: true, avatarStyle: true, gender: true, plan: true, planExpiresAt: true } },
      promoCode: { select: { code: true, percent: true } },
    },
  });
}

export async function listAudit(limit = 100) {
  const actions = await db.adminAction.findMany({ orderBy: { createdAt: "desc" }, take: limit });
  const ids = [...new Set(actions.flatMap((a) => [a.adminId, a.targetUserId].filter(Boolean) as string[]))];
  const users = await db.user.findMany({ where: { id: { in: ids } }, select: { id: true, username: true } });
  const names = new Map(users.map((u) => [u.id, u.username]));
  return actions.map((a) => ({ ...a, adminName: names.get(a.adminId) ?? "?", targetName: a.targetUserId ? (names.get(a.targetUserId) ?? "?") : null }));
}
