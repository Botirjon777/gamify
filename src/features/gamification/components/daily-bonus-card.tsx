"use client";

import { useState, useTransition } from "react";
import { Check, Gift } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { playSound } from "@/lib/sound";
import { claimDailyBonus } from "../daily-bonus";

interface Props {
  claimed: boolean;
  /** Bonus XP for each day of the 7-day cycle. */
  cycle: readonly number[];
  /** Which day of the cycle the next claim lands on (1–7). */
  nextDay: number;
}

export function DailyBonusCard({ claimed: initialClaimed, cycle, nextDay }: Props) {
  const t = useTranslations("dashboard.dailyBonus");
  const [claimed, setClaimed] = useState(initialClaimed);
  const [pending, startTransition] = useTransition();

  const claim = () =>
    startTransition(async () => {
      // An "alreadyClaimed" result means another tab got there first — same end state.
      await claimDailyBonus();
      setClaimed(true);
      playSound("claim");
    });

  return (
    <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-grad-xp text-white shadow-lg shadow-xp/25">
          <Gift className="size-5" />
        </span>
        <div>
          <h2 className="font-display text-lg font-bold">{t("title")}</h2>
          <p className="text-sm text-muted">{t("text")}</p>
        </div>
      </div>

      <ol className="mt-5 grid grid-cols-7 gap-1.5">
        {cycle.map((xp, i) => {
          const day = i + 1;
          const done = day < nextDay || (claimed && day === nextDay);
          const today = day === nextDay;
          return (
            <li
              key={day}
              className={`flex flex-col items-center rounded-xl border-2 py-2 text-center ${
                done ? "border-transparent bg-grad-xp text-white" : today ? "border-brand bg-brand/5" : "border-border"
              }`}
            >
              <span className={`text-[10px] font-medium sm:text-xs ${done ? "text-white/85" : "text-muted"}`}>{t("day", { day })}</span>
              {done ? <Check className="my-0.5 size-4 sm:size-5" /> : <span className="text-sm font-bold text-xp sm:text-base">{xp}</span>}
            </li>
          );
        })}
      </ol>

      <Button onClick={claim} disabled={claimed || pending} className="mt-5 w-full">
        {claimed ? t("claimed") : t("claim", { xp: cycle[nextDay - 1] })}
      </Button>
    </section>
  );
}
