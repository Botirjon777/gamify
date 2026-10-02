import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireSession } from "@/lib/auth/session";
import { getCategories, getSubjectTracks } from "@/features/learn/queries";
import { CATEGORY_STYLE, categorySlug } from "@/features/learn/categories";
import { SUBJECT_CATEGORIES, SUBJECT_STYLE, subjectFromSlug } from "@/features/learn/subjects";
import { GroupCard } from "@/features/learn/components/group-card";
import { TrackCard } from "@/features/learn/components/track-card";
import { weeklyTopic } from "@/features/events/service";
import { IconTile } from "@/components/icon";

/** Step 2: one subject — its categories (Programming → Frontend, Backend …) or, when it has none, its tracks. */
export default async function SubjectPage({ params }: PageProps<"/[locale]/learn/s/[subject]">) {
  const { locale, subject: slug } = await params;
  setRequestLocale(locale);
  const subject = subjectFromSlug(slug);
  if (!subject) notFound();

  const t = await getTranslations("learn");
  const { user, tenant } = await requireSession();
  const split = SUBJECT_CATEGORIES[subject].length > 0;
  const [categories, tracks, topic] = await Promise.all([
    split ? getCategories(subject, user.id, tenant.id, locale) : [],
    split ? [] : getSubjectTracks(subject, user.id, tenant.id, locale),
    weeklyTopic(undefined, locale),
  ]);
  // A subject without published courses is "coming soon" — it has no page yet.
  if (!tracks.length && categories.every((c) => c.skills === 0)) notFound();
  const style = SUBJECT_STYLE[subject];

  return (
    <div className="flex flex-col gap-6">
      <Link href="/learn" className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> {t("backToSubjects")}
      </Link>

      <header className="flex items-center gap-4">
        <IconTile name={style.icon} gradient={style.gradient} size="lg" />
        <div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">{t(`subjects.${subject}.title`)}</h1>
          <p className="mt-1 text-muted">{t(`subjects.${subject}.text`)}</p>
        </div>
      </header>

      <div className="stagger grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
        {split
          ? categories.map((c) => (
              <GroupCard
                key={c.category}
                href={`/learn/c/${categorySlug(c.category)}`}
                {...CATEGORY_STYLE[c.category]}
                title={t(`categories.${c.category}.title`)}
                text={t(`categories.${c.category}.text`)}
                progress={c}
              />
            ))
          : tracks.map((track) => <TrackCard key={track.slug} track={track} weekly={topic?.trackId === track.id} />)}
      </div>
    </div>
  );
}
