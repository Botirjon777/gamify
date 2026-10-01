import { notFound } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireSession } from "@/lib/auth/session";
import { getCategoryTracks } from "@/features/learn/queries";
import { CATEGORY_STYLE, categoryFromSlug } from "@/features/learn/categories";
import { TRACK_GRADIENTS } from "@/features/learn/track-style";
import { weeklyTopic } from "@/features/events/service";
import { IconTile } from "@/components/icon";

/** Step 2: the tracks of one direction (Frontend → HTML, CSS, JavaScript …). */
export default async function CategoryPage({ params }: PageProps<"/[locale]/learn/c/[category]">) {
  const { locale, category: slug } = await params;
  setRequestLocale(locale);
  const category = categoryFromSlug(slug);
  if (!category) notFound();

  const t = await getTranslations("learn");
  const { user, tenant } = await requireSession();
  const [tracks, topic] = await Promise.all([getCategoryTracks(category, user.id, tenant.id, locale), weeklyTopic(undefined, locale)]);
  if (!tracks.length) notFound();
  const style = CATEGORY_STYLE[category];

  return (
    <div className="flex flex-col gap-6">
      <Link href="/learn" className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> {t("backToCategories")}
      </Link>

      <header className="flex items-center gap-4">
        <IconTile name={style.icon} gradient={style.gradient} size="lg" />
        <div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">{t(`categories.${category}.title`)}</h1>
          <p className="mt-1 text-muted">{t(`categories.${category}.text`)}</p>
        </div>
      </header>

      <div className="stagger grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
        {tracks.map((track) => (
          <Link
            key={track.slug}
            href={`/learn/${track.slug}`}
            className="group flex flex-col rounded-2xl border border-border bg-surface p-5 transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg hover:shadow-brand/5"
          >
            <div className="flex items-start gap-3">
              <IconTile name={track.icon ?? "braces"} gradient={TRACK_GRADIENTS[track.slug] ?? "brand"} size="md" />
              <h2 className="flex-1 font-display text-lg font-bold group-hover:text-brand">{track.title}</h2>
              {topic?.trackId === track.id && (
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
        ))}
      </div>
    </div>
  );
}
