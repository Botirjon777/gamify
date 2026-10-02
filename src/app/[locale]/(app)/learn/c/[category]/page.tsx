import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireSession } from "@/lib/auth/session";
import { getCategoryTracks } from "@/features/learn/queries";
import { CATEGORY_STYLE, categoryFromSlug } from "@/features/learn/categories";
import { subjectOfCategory, subjectSlug } from "@/features/learn/subjects";
import { TrackCard } from "@/features/learn/components/track-card";
import { weeklyTopic } from "@/features/events/service";
import { IconTile } from "@/components/icon";

/** Step 3: the tracks of one direction (Frontend → HTML, CSS, JavaScript …). */
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
  const subject = subjectOfCategory(category);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/learn/s/${subjectSlug(subject)}`}
        className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {t(`subjects.${subject}.title`)}
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
          <TrackCard key={track.slug} track={track} weekly={topic?.trackId === track.id} />
        ))}
      </div>
    </div>
  );
}
