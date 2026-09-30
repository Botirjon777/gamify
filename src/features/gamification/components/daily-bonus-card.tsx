"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
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
    });

  return (
    <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="text-lg font-bold">{t("title")}</h2>
      <p className="mt-1 text-sm text-muted">{t("text")}</p>

      <ol className="mt-5 grid grid-cols-7 gap-1.5">
        {cycle.map((xp, i) => {
          const day = i + 1;
          const done = day < nextDay || (claimed && day === nextDay);
          const today = day === nextDay;
          return (
            <li
              key={day}
              className={`flex flex-col items-center rounded-xl border-2 py-2 text-center ${
                done ? "border-xp bg-xp/10" : today ? "border-brand" : "border-border"
              }`}
            >
              <span className="text-[10px] font-medium text-muted sm:text-xs">{t("day", { day })}</span>
              <span className="text-sm font-extrabold text-xp sm:text-base">{xp}</span>
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
