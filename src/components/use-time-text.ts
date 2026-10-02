"use client";

import { useTranslations } from "next-intl";
import { tashkentParts, timeAgo } from "@/lib/format";

/** Times as Uzbek text that is the same on the server and in every browser (see lib/format). */
export function useTimeText() {
  const t = useTranslations("time");
  /** "2-oktabr" (Tashkent date). */
  const day = (date: Date) => {
    const { day, month } = tashkentParts(date);
    return t("date", { day, month: t(`months.${month}`) });
  };
  return {
    day,
    /** "14:05" (Tashkent time). */
    clock: (date: Date) => tashkentParts(date).clock,
    /** "5 daqiqa oldin", "3 kun oldin", and a date once it is more than a week ago. */
    ago: (date: Date, now: Date) => {
      const { unit, count } = timeAgo(date, now);
      return unit === "date" ? day(date) : t(unit, { count });
    },
  };
}
