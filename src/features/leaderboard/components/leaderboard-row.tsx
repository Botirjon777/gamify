import { Medal } from "lucide-react";
import { Avatar } from "@/components/avatar";
import type { LeaderboardEntry } from "@/lib/leaderboard";

const MEDALS = ["bg-grad-gold", "bg-grad-silver", "bg-grad-bronze"];

/** One leaderboard line — used by the server page (your position) and the infinite client list. */
export function LeaderboardRow({
  entry,
  board,
  isMe,
  youLabel,
}: {
  entry: LeaderboardEntry;
  board: "XP" | "IQ";
  isMe: boolean;
  youLabel: string;
}) {
  const top = entry.rank <= 3;
  return (
    <li
      className={`flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 sm:gap-4 ${
        isMe ? "bg-brand/5" : top ? "bg-xp/5" : ""
      }`}
    >
      {top ? (
        <span className={`grid size-9 shrink-0 place-items-center rounded-full text-foreground shadow-md ${MEDALS[entry.rank - 1]}`}>
          <Medal className="size-5" />
        </span>
      ) : (
        <span className="w-9 shrink-0 text-center font-display font-bold text-muted">{entry.rank}</span>
      )}
      <Avatar user={entry} className="size-10" />
      <span className="min-w-0 flex-1 truncate font-semibold">
        {entry.username}
        {isMe && <span className="ml-2 rounded-full bg-brand px-2 py-0.5 text-xs text-brand-foreground">{youLabel}</span>}
      </span>
      <span className={`shrink-0 font-bold ${board === "XP" ? "text-xp" : "text-brand"}`}>
        {Math.round(entry.value).toLocaleString("uz-UZ")} {board === "XP" ? "XP" : "IQ"}
      </span>
    </li>
  );
}
