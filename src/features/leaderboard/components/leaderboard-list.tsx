"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { SkeletonRows } from "@/components/skeletons";
import { useInfinite } from "@/components/use-infinite";
import type { LeaderboardEntry } from "@/lib/leaderboard";
import { loadLeaderboardPage } from "../actions";
import { LEADERBOARD_PAGE } from "../constants";
import { LeaderboardRow } from "./leaderboard-row";

interface Props {
  initial: LeaderboardEntry[];
  board: "XP" | "IQ";
  period: "all-time" | "weekly" | "season";
  meId: string;
}

/** First page from the server; the next pages load as you scroll, rows fading in. */
export function LeaderboardList({ initial, board, period, meId }: Props) {
  const t = useTranslations("leaderboard");
  const tc = useTranslations("common");
  const loadPage = useCallback((loaded: LeaderboardEntry[]) => loadLeaderboardPage(board, period, loaded.length), [board, period]);
  const { items, loading, error, done, sentinelRef, retry } = useInfinite(initial, LEADERBOARD_PAGE, loadPage);

  return (
    <div className="flex flex-col gap-3">
      <ol className="stagger overflow-hidden rounded-2xl border border-border bg-surface">
        {items.map((e) => (
          <LeaderboardRow key={e.userId} entry={e} board={board} isMe={e.userId === meId} youLabel={t("you")} />
        ))}
      </ol>
      {!done && <div ref={sentinelRef} aria-hidden className="h-px" />}
      {loading && <SkeletonRows count={3} />}
      {error && (
        <button type="button" onClick={() => void retry()} className="mx-auto text-sm font-semibold text-brand hover:underline">
          {tc("retry")}
        </button>
      )}
      {done && items.length > LEADERBOARD_PAGE && <p className="text-center text-xs text-muted">{tc("endOfList")}</p>}
    </div>
  );
}
