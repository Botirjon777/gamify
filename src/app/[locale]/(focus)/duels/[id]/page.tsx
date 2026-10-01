import { notFound } from "next/navigation";
import { ArrowLeft, Ban, Hourglass, TimerOff } from "lucide-react";
import { getFormatter, getNow, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireSession } from "@/lib/auth/session";
import { AutoRefresh } from "@/components/auto-refresh";
import { getDuelView } from "@/features/duels/queries";
import { DuelArena } from "@/features/duels/components/duel-arena";
import { DuelResult } from "@/features/duels/components/duel-result";
import { InviteActions } from "@/features/duels/components/invite-actions";
import { Versus } from "@/features/duels/components/versus";

export default async function DuelPage({ params }: PageProps<"/[locale]/duels/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("duels");
  const format = await getFormatter();
  const now = await getNow();
  const { user } = await requireSession();
  const duel = await getDuelView(id, user.id, locale);
  if (!duel) notFound();

  const back = (
    <Link href="/duels" className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-muted hover:text-foreground">
      <ArrowLeft className="size-4" /> {t("all")}
    </Link>
  );
  const versus = <Versus me={duel.me} them={duel.them} stake={duel.stake} track={duel.track.title} />;
  const deadline = format.relativeTime(new Date(duel.expiresAt), now);

  return (
    // Focus layout (no app chrome): on a phone the whole screen belongs to the duel.
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-5 sm:gap-6 sm:py-8">
      {back}

      {duel.phase === "invite" && (
        <>
          {versus}
          <p className="text-center text-sm text-muted">{t("inviteText", { username: duel.them.username, deadline })}</p>
          <InviteActions duelId={duel.id} username={duel.them.username} />
        </>
      )}

      {(duel.phase === "ready" || duel.phase === "playing") && (
        <DuelArena
          duelId={duel.id}
          me={duel.me}
          them={duel.them}
          stake={duel.stake}
          track={duel.track.title}
          questions={duel.questions}
          resume={duel.phase === "playing"}
        />
      )}

      {duel.phase === "waiting" && (
        <>
          <AutoRefresh seconds={15} />
          {versus}
          <section className="flex flex-col items-center gap-3 rounded-3xl border border-border bg-surface p-8 text-center">
            <Hourglass className="size-10 animate-pulse text-brand" />
            <p className="font-display text-xl font-bold">{t("yourScore", { correct: duel.myRun?.correct ?? 0, total: duel.questions })}</p>
            <p className="text-sm text-muted">
              {duel.accepted ? t("waitingPlay", { username: duel.them.username, deadline }) : t("waitingAccept", { username: duel.them.username, deadline })}
            </p>
          </section>
        </>
      )}

      {duel.phase === "result" && duel.myRun && duel.theirRun && "answers" in duel.theirRun ? (
        <DuelResult
          result={duel.result!}
          xp={duel.xpChange}
          questions={duel.questions}
          me={{ player: duel.me, correct: duel.myRun.correct, answers: duel.myRun.answers, timeMs: duel.myRun.timeMs }}
          them={{ player: duel.them, correct: duel.theirRun.correct, answers: duel.theirRun.answers, timeMs: duel.theirRun.timeMs }}
          rematchHref={`/duels/new?opponent=${duel.them.username}&track=${duel.track.slug}`}
        />
      ) : duel.phase === "result" ? (
        // One side never played (won / lost by the deadline).
        <DuelResult
          result={duel.result!}
          xp={duel.xpChange}
          questions={duel.questions}
          me={{ player: duel.me, correct: duel.myRun?.correct ?? 0, answers: duel.myRun?.answers ?? [], timeMs: duel.myRun?.timeMs ?? 0 }}
          them={{ player: duel.them, correct: 0, answers: [], timeMs: 0 }}
          rematchHref={`/duels/new?opponent=${duel.them.username}&track=${duel.track.slug}`}
        />
      ) : null}

      {(duel.phase === "declined" || duel.phase === "expired") && (
        <>
          {versus}
          <section className="flex flex-col items-center gap-3 rounded-3xl border border-border bg-surface p-8 text-center">
            {duel.phase === "declined" ? <Ban className="size-10 text-danger" /> : <TimerOff className="size-10 text-muted" />}
            <p className="font-display text-xl font-bold">{t(duel.phase === "declined" ? "declinedTitle" : "expiredTitle")}</p>
            <p className="text-sm text-muted">{t("noXp")}</p>
          </section>
        </>
      )}
    </main>
  );
}
