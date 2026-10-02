import { Lock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { IconTile, type GradientKey } from "@/components/icon";
import type { ProgressSummary } from "../queries";

/** A subject or a category: its courses and the user's progress. Without courses it is a "coming soon" tile. */
export async function GroupCard({
  href,
  icon,
  gradient,
  title,
  text,
  progress,
}: {
  href: string;
  icon: string;
  gradient: GradientKey;
  title: string;
  text: string;
  progress: ProgressSummary & { tracks: string[] };
}) {
  const t = await getTranslations("learn");
  const empty = progress.skills === 0;
  const body = (
    <>
      <div className="flex items-start gap-4">
        <IconTile name={icon} gradient={gradient} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="break-words font-display text-base font-bold uppercase tracking-wide sm:text-lg">{title}</h2>
          <p className="mt-0.5 text-sm leading-relaxed text-muted">{text}</p>
          {empty && (
            <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-background px-2.5 py-1 text-xs font-semibold text-muted">
              <Lock className="size-3" /> {t("comingSoon")}
            </span>
          )}
        </div>
      </div>
      {!empty && (
        <>
          <p className="mt-4 line-clamp-1 text-sm font-semibold">{progress.tracks.join(" · ")}</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-border">
              <div className="h-full rounded-full bg-grad-brand" style={{ width: `${Math.round(progress.mastery)}%` }} />
            </div>
            <span className="w-10 text-right text-xs font-bold text-muted">{Math.round(progress.mastery)}%</span>
          </div>
          <p className="mt-2 text-xs text-muted">
            {t("tracksCount", { count: progress.tracks.length })} · {t("skillsCount", { count: progress.skills })} ·{" "}
            {t("exercises", { count: progress.exercises })}
          </p>
        </>
      )}
    </>
  );

  return empty ? (
    <div aria-disabled className="rounded-2xl border border-dashed border-border bg-surface/60 p-5 opacity-70">
      {body}
    </div>
  ) : (
    <Link
      href={href}
      className="group rounded-2xl border border-border bg-surface p-5 transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg hover:shadow-brand/5"
    >
      {body}
    </Link>
  );
}
