import { TrendingDown, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import type { DuelPlayer } from "../queries";

/** Two players sliding in, a "VS" stamp, and what's at stake — the duel's opening card. */
export function Versus({ me, them, stake, track }: { me: DuelPlayer; them: DuelPlayer; stake: number; track: string }) {
  const t = useTranslations("duels");
  return (
    <div className="relative overflow-hidden rounded-3xl bg-grad-dark p-6 text-white shadow-2xl shadow-black/20 sm:p-8">
      <div className="absolute -left-16 -top-16 size-56 rounded-full bg-brand/30 blur-3xl" />
      <div className="absolute -bottom-16 -right-16 size-56 rounded-full bg-streak/30 blur-3xl" />
      <p className="relative text-center text-xs font-bold uppercase tracking-[0.3em] text-white/60">{track}</p>

      <div className="relative mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <PlayerCard player={me} label={t("you")} level={t("level", { level: me.level })} className="animate-duel-left" />
        <span className="animate-vs bg-grad-gold bg-clip-text font-display text-5xl font-black italic text-transparent drop-shadow sm:text-6xl">VS</span>
        <PlayerCard player={them} level={t("level", { level: them.level })} className="animate-duel-right" />
      </div>

      <div className="relative mt-6 grid grid-cols-2 gap-3 [&>*]:animate-fade-in [&>*]:[animation-delay:0.9s]">
        <p className="flex items-center justify-center gap-2 rounded-2xl bg-success/20 px-3 py-2.5 text-sm font-bold text-[#7ff0b6]">
          <TrendingUp className="size-4" /> {t("winXp", { xp: stake })}
        </p>
        <p className="flex items-center justify-center gap-2 rounded-2xl bg-danger/20 px-3 py-2.5 text-sm font-bold text-[#ff9ea1]">
          <TrendingDown className="size-4" /> {t("loseXp", { xp: stake })}
        </p>
      </div>
    </div>
  );
}

function PlayerCard({ player, label, level, className }: { player: DuelPlayer; label?: string; level: string; className: string }) {
  return (
    <div className={`flex flex-col items-center gap-2 text-center ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- inline SVG data URI */}
      <img src={player.avatar} alt="" className="size-20 rounded-full bg-white/10 ring-4 ring-white/20 sm:size-24" />
      <span className="max-w-full truncate font-display text-base font-bold sm:text-lg">{player.username}</span>
      <span className="text-xs text-white/60">
        {label ? `${label} · ` : ""}
        {level}
      </span>
    </div>
  );
}
