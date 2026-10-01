import "server-only";
import { db } from "@/lib/db";
import { avatarDataUri } from "@/lib/avatar";
import { localized, type LocalizedText } from "@/i18n/content";
import { resolveDuel, settleExpired, type RunAnswer } from "./service";

const player = { select: { id: true, username: true, avatarSeed: true, avatarStyle: true, gender: true, level: true, xp: true } } as const;

type Player = { id: string; username: string; avatarSeed: string; avatarStyle: string; gender: "MALE" | "FEMALE" | null; level: number; xp: number };
const toPlayer = (u: Player) => ({ id: u.id, username: u.username, level: u.level, xp: u.xp, avatar: avatarDataUri(u.avatarSeed, u.avatarStyle, u.gender) });
export type DuelPlayer = ReturnType<typeof toPlayer>;

export type DuelPhase = "invite" | "ready" | "playing" | "waiting" | "result" | "declined" | "expired";

/** Everything the duel page needs, from this user's point of view. */
export async function getDuelView(duelId: string, userId: string, locale: string) {
  const duel = await db.duel.findUnique({ where: { id: duelId }, select: { id: true, challengerId: true, opponentId: true, expiresAt: true, status: true } });
  if (!duel || (duel.challengerId !== userId && duel.opponentId !== userId)) return null;
  if ((duel.status === "PENDING" || duel.status === "ACTIVE") && duel.expiresAt <= new Date()) await resolveDuel(duelId);

  const full = await db.duel.findUniqueOrThrow({
    where: { id: duelId },
    include: { challenger: player, opponent: player, track: { select: { title: true, slug: true, icon: true } }, runs: true },
  });
  const meIsChallenger = full.challengerId === userId;
  const me = toPlayer(meIsChallenger ? full.challenger : full.opponent);
  const them = toPlayer(meIsChallenger ? full.opponent : full.challenger);
  const myRun = full.runs.find((r) => r.userId === userId) ?? null;
  const theirRun = full.runs.find((r) => r.userId !== userId) ?? null;

  let phase: DuelPhase;
  if (full.status === "DONE") phase = "result";
  else if (full.status === "DECLINED") phase = "declined";
  else if (full.status === "EXPIRED") phase = "expired";
  else if (!meIsChallenger && full.status === "PENDING") phase = "invite";
  else if (myRun?.finishedAt) phase = "waiting";
  else if (myRun) phase = "playing";
  else phase = "ready";

  const xpChange =
    full.status === "DONE"
      ? ((await db.xpEvent.aggregate({ where: { userId, reason: "DUEL", refId: duelId }, _sum: { amount: true } }))._sum.amount ?? 0)
      : 0;

  const summary = (run: typeof myRun) =>
    run && { correct: run.correct, answers: (run.answers as unknown as RunAnswer[]).map((a) => a.correct), finished: !!run.finishedAt, timeMs: (run.answers as unknown as RunAnswer[]).reduce((n, a) => n + a.timeMs, 0) };

  return {
    id: full.id,
    phase,
    stake: full.stake,
    questions: full.questionIds.length,
    track: { title: localized(full.track.title as LocalizedText, locale), slug: full.track.slug, icon: full.track.icon },
    me,
    them,
    meIsChallenger,
    status: full.status,
    expiresAt: full.expiresAt.toISOString(),
    accepted: full.status !== "PENDING",
    myRun: summary(myRun),
    // Their score stays hidden until the duel is over (no peeking before you play).
    theirRun: full.status === "DONE" ? summary(theirRun) : theirRun?.finishedAt ? { finished: true } : null,
    xpChange,
    result: (full.status === "DONE" ? (full.winnerId === null ? "draw" : full.winnerId === userId ? "win" : "lose") : null) as "win" | "lose" | "draw" | null,
  };
}
export type DuelView = NonNullable<Awaited<ReturnType<typeof getDuelView>>>;

/** /duels: invites, your turn, waiting for them, recent results. */
export async function listMyDuels(userId: string, locale: string) {
  await settleExpired(userId);
  const duels = await db.duel.findMany({
    where: { OR: [{ challengerId: userId }, { opponentId: userId }] },
    orderBy: { createdAt: "desc" },
    take: 40,
    include: { challenger: player, opponent: player, track: { select: { title: true } }, runs: { select: { userId: true, finishedAt: true } } },
  });

  return duels.map((d) => {
    const meIsChallenger = d.challengerId === userId;
    const them = toPlayer(meIsChallenger ? d.opponent : d.challenger);
    const mine = d.runs.find((r) => r.userId === userId);
    const open = d.status === "PENDING" || d.status === "ACTIVE";
    const group = !open
      ? "history"
      : !meIsChallenger && d.status === "PENDING"
        ? "invites"
        : mine?.finishedAt
          ? "waiting"
          : "yourTurn";
    return {
      id: d.id,
      group,
      them,
      stake: d.stake,
      track: localized(d.track.title as LocalizedText, locale),
      status: d.status,
      result: d.status === "DONE" ? (d.winnerId === null ? "draw" : d.winnerId === userId ? "win" : "lose") : null,
      createdAt: d.createdAt,
    };
  });
}

/** Nav badge: invites waiting for you + accepted duels you still have to play. */
export async function duelsNeedingMe(userId: string): Promise<number> {
  const now = new Date();
  const [invites, toPlay] = await Promise.all([
    db.duel.count({ where: { opponentId: userId, status: "PENDING", expiresAt: { gt: now } } }),
    db.duel.count({
      where: {
        status: "ACTIVE",
        expiresAt: { gt: now },
        OR: [{ challengerId: userId }, { opponentId: userId }],
        runs: { none: { userId, finishedAt: { not: null } } },
      },
    }),
  ]);
  return invites + toPlay;
}
