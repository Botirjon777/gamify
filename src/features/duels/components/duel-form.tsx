"use client";

import { useActionState, useState } from "react";
import { Swords, TrendingDown, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useRedirectTo } from "@/components/use-redirect-to";
import { createDuelAction, type CreateDuelState } from "../actions";
import { DUEL_STAKES } from "../constants";

interface Option {
  id: string;
  label: string;
}

const selectClass =
  "h-12 w-full rounded-xl border border-border bg-surface px-3 font-semibold outline-none focus:border-brand focus:ring-4 focus:ring-brand/15";

/** Opponent + topic + stake. Stakes above your own XP are disabled. */
export function DuelForm({
  opponents,
  tracks,
  defaultOpponent,
  defaultTrack,
  myXp,
}: {
  opponents: Option[];
  tracks: { category: string; items: Option[] }[];
  defaultOpponent?: string;
  defaultTrack?: string;
  myXp: number;
}) {
  const t = useTranslations("duels");
  const [state, action, pending] = useActionState<CreateDuelState, FormData>(createDuelAction, {});
  useRedirectTo(state.redirectTo);
  const [stake, setStake] = useState<number>(DUEL_STAKES.find((s) => s <= myXp) ?? DUEL_STAKES[0]);

  return (
    <form action={action} className="flex flex-col gap-5 rounded-3xl border border-border bg-surface p-5 sm:p-6">
      {state.error && <p className="rounded-xl bg-danger/10 px-3.5 py-2.5 text-sm font-semibold text-danger">{t(`errors.${state.error}`)}</p>}

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{t("opponent")}</span>
        {opponents.length ? (
          <select name="opponentId" defaultValue={defaultOpponent} className={selectClass} required>
            {opponents.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-sm text-muted">{t("noOpponents")}</p>
        )}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{t("topic")}</span>
        <select name="trackId" defaultValue={defaultTrack} className={selectClass} required>
          {tracks.map((group) => (
            <optgroup key={group.category} label={group.category}>
              {group.items.map((tr) => (
                <option key={tr.id} value={tr.id}>
                  {tr.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">{t("stake")}</legend>
        <input type="hidden" name="stake" value={stake} />
        <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label={t("stake")}>
          {DUEL_STAKES.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={stake === s}
              disabled={s > myXp}
              onClick={() => setStake(s)}
              className={`h-12 rounded-xl border-2 font-display font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                stake === s ? "border-brand bg-brand/5 text-brand" : "border-border hover:border-brand/40"
              }`}
            >
              {s} XP
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">{t("stakeHint", { xp: myXp })}</p>
      </fieldset>

      <div className="grid grid-cols-2 gap-3 text-sm font-bold">
        <p className="flex items-center justify-center gap-1.5 rounded-xl bg-success/10 py-2.5 text-success">
          <TrendingUp className="size-4" /> {t("winXp", { xp: stake })}
        </p>
        <p className="flex items-center justify-center gap-1.5 rounded-xl bg-danger/10 py-2.5 text-danger">
          <TrendingDown className="size-4" /> {t("loseXp", { xp: stake })}
        </p>
      </div>

      <Button type="submit" disabled={pending || !opponents.length || myXp < DUEL_STAKES[0] || !!state.redirectTo} className="h-12">
        <Swords className="size-5" /> {t("challenge")}
      </Button>
    </form>
  );
}
