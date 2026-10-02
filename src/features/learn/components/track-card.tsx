import { Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { IconTile } from "@/components/icon";
import type { TrackProgress } from "../queries";
import { SUBJECT_STYLE } from "../subjects";
import { TRACK_GRADIENTS } from "../track-style";

/** One course with the user's progress. `weekly` marks this week's double-XP topic. */
export async function TrackCard({ track, weekly = false }: { track: TrackProgress; weekly?: boolean }) {
  const t = await getTranslations("learn");
  const subject = SUBJECT_STYLE[track.subject];

  return (
    <Link
      href={`/learn/${track.slug}`}
      className="group flex flex-col rounded-2xl border border-border bg-surface p-5 transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg hover:shadow-brand/5"
    >
      <div className="flex items-start gap-3">
        <IconTile name={track.icon ?? subject.icon} gradient={TRACK_GRADIENTS[track.slug] ?? subject.gradient} size="md" />
        <h2 className="flex-1 font-display text-lg font-bold group-hover:text-brand">{track.title}</h2>
        {weekly && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-grad-gold px-2 py-0.5 text-xs font-bold text-white">
            <Sparkles className="size-3" /> {t("weeklyBadge")}
          </span>
        )}
      </div>
      <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-muted">{track.description}</p>
      <div className="mt-4 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full bg-grad-brand" style={{ width: `${Math.round(track.mastery)}%` }} />
        </div>
        <span className="w-10 text-right text-xs font-bold text-muted">{Math.round(track.mastery)}%</span>
      </div>
      <p className="mt-2 text-xs text-muted">
        {t("skillsCount", { count: track.skills })} · {t("exercises", { count: track.exercises })}
      </p>
    </Link>
  );
}
