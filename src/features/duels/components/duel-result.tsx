"use client";

import { useEffect, useState } from "react";
import { Frown, Handshake, RotateCcw, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonClass } from "@/components/ui/button";
import { playSound } from "@/lib/sound";
import type { DuelPlayer } from "../queries";

interface Side {
  player: DuelPlayer;
  correct: number;
  answers: boolean[];
  timeMs: number;
}

const LOOK = {
  win: { icon: Trophy, ring: "bg-grad-gold", text: "text-xp" },
  lose: { icon: Frown, ring: "bg-grad-streak", text: "text-danger" },
  draw: { icon: Handshake, ring: "bg-grad-iq", text: "text-brand" },
} as const;

/** Big animated verdict, XP counting up (or down), then both players' answers side by side. */
export function DuelResult({
  result,
  xp,
  me,
  them,
  questions,
  rematchHref,
}: {
  result: "win" | "lose" | "draw";
  xp: number;
  me: Side;
  them: Side;
  questions: number;
  rematchHref: string;
}) {
  const t = useTranslations("duels");
  const [shown, setShown] = useState(0);
  const look = LOOK[result];
  const Icon = look.icon;

  // The verdict has a sound (a draw stays quiet).
  useEffect(() => {
    if (result !== "draw") playSound(result);
  }, [result]);

  // Count to the XP change over ~1 s, starting after the verdict has popped in.
  useEffect(() => {
    if (!xp) return;
    let frame = 0;
    const start = performance.now() + 500;
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - start) / 1000));
      setShown(Math.round(xp * (1 - (1 - p) ** 3)));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [xp]);

  return (
    <div className="flex flex-col gap-6">
      <section className="relative flex flex-col items-center overflow-hidden rounded-3xl border border-border bg-surface px-6 py-10 text-center">
        <span className={`animate-result grid size-24 place-items-center rounded-full text-white shadow-2xl ${look.ring}`}>
          <Icon className="size-12" />
        </span>
        <h1 className="animate-result mt-5 font-display text-4xl font-black [animation-delay:0.15s]">{t(`results.${result}`)}</h1>
        <p className={`mt-3 font-display text-5xl font-black tabular-nums ${look.text}`} aria-label={t("xpChange", { xp })}>
          {xp > 0 ? "+" : xp < 0 ? "−" : ""}
          {Math.abs(shown)} XP
        </p>
        {result === "draw" && <p className="mt-2 text-sm text-muted">{t("drawText")}</p>}
      </section>

      <section className="grid grid-cols-2 gap-3">
        {[me, them].map((side, i) => (
          <div key={side.player.id} className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface p-4 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- inline SVG data URI */}
            <img src={side.player.avatar} alt="" className="size-14 rounded-full bg-background" />
            <p className="truncate font-bold">
              {side.player.username} {i === 0 && <span className="text-xs font-semibold text-muted">({t("you")})</span>}
            </p>
            <p className="font-display text-2xl font-bold">
              {side.correct}/{questions}
            </p>
            <div className="flex gap-1">
              {side.answers.map((ok, j) => (
                <span key={j} className={`size-2.5 rounded-full ${ok ? "bg-success" : "bg-danger"}`} />
              ))}
            </div>
            <p className="text-xs text-muted">{t("time", { seconds: Math.round(side.timeMs / 1000) })}</p>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/duels" className={buttonClass("secondary", "h-12")}>
          {t("all")}
        </Link>
        <Link href={rematchHref} className={buttonClass("primary", "h-12")}>
          <RotateCcw className="size-4" /> {t("rematch")}
        </Link>
      </div>
    </div>
  );
}
