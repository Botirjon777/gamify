import { Lock } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireSession } from "@/lib/auth/session";
import { getCategories } from "@/features/learn/queries";
import { CATEGORY_STYLE, categorySlug } from "@/features/learn/categories";
import { WeeklyTopicCard } from "@/features/events/components/weekly-topic-card";
import { IconTile } from "@/components/icon";
import { PageHeader } from "@/components/page-header";

/** Step 1: pick a direction. Tracks and skills come on the next pages. */
export default async function LearnPage({ params }: PageProps<"/[locale]/learn">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("learn");
  const { user, tenant } = await requireSession();
  const categories = await getCategories(user.id, tenant.id, locale);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <WeeklyTopicCard />

      <div className="stagger grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
        {categories.map((c) => {
          const style = CATEGORY_STYLE[c.category];
          const empty = c.skills === 0;
          const body = (
            <>
              <div className="flex items-start gap-4">
                <IconTile name={style.icon} gradient={style.gradient} size="lg" />
                <div className="min-w-0 flex-1">
                  <h2 className="break-words font-display text-base font-bold uppercase tracking-wide sm:text-lg">
                    {t(`categories.${c.category}.title`)}
                  </h2>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted">{t(`categories.${c.category}.text`)}</p>
                  {empty && (
                    <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-background px-2.5 py-1 text-xs font-semibold text-muted">
                      <Lock className="size-3" /> {t("comingSoon")}
                    </span>
                  )}
                </div>
              </div>
              {!empty && (
                <>
                  <p className="mt-4 line-clamp-1 text-sm font-semibold">{c.tracks.join(" · ")}</p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-border">
                      <div className="h-full rounded-full bg-grad-brand" style={{ width: `${Math.round(c.mastery)}%` }} />
                    </div>
                    <span className="w-10 text-right text-xs font-bold text-muted">{Math.round(c.mastery)}%</span>
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    {t("tracksCount", { count: c.tracks.length })} · {t("skillsCount", { count: c.skills })} ·{" "}
                    {t("exercises", { count: c.exercises })}
                  </p>
                </>
              )}
            </>
          );

          return empty ? (
            <div key={c.category} aria-disabled className="rounded-2xl border border-dashed border-border bg-surface/60 p-5 opacity-70">
              {body}
            </div>
          ) : (
            <Link
              key={c.category}
              href={`/learn/c/${categorySlug(c.category)}`}
              className="group rounded-2xl border border-border bg-surface p-5 transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg hover:shadow-brand/5"
            >
              {body}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
