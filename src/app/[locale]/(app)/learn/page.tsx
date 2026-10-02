import { SlidersHorizontal } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireSession } from "@/lib/auth/session";
import { getSubjects, type SubjectProgress } from "@/features/learn/queries";
import { SUBJECT_STYLE, subjectSlug } from "@/features/learn/subjects";
import { GroupCard } from "@/features/learn/components/group-card";
import { WeeklyTopicCard } from "@/features/events/components/weekly-topic-card";
import { PageHeader } from "@/components/page-header";
import { buttonClass } from "@/components/ui/button";

/** Step 1: pick a subject — the ones the user follows come first. Categories, tracks and skills are on the next pages. */
export default async function LearnPage({ params }: PageProps<"/[locale]/learn">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("learn");
  const { user, tenant } = await requireSession();
  const subjects = await getSubjects(user.id, tenant.id, locale);
  const mine = subjects.filter((s) => user.interests.includes(s.subject));
  const others = subjects.filter((s) => !user.interests.includes(s.subject));

  const grid = (items: SubjectProgress[]) => (
    <div className="stagger grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
      {items.map((s) => (
        <GroupCard
          key={s.subject}
          href={`/learn/s/${subjectSlug(s.subject)}`}
          {...SUBJECT_STYLE[s.subject]}
          title={t(`subjects.${s.subject}.title`)}
          text={t(`subjects.${s.subject}.text`)}
          progress={s}
        />
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        action={
          <Link href="/settings#interests" className={buttonClass("secondary", "h-10 w-fit")}>
            <SlidersHorizontal className="size-4" /> {t("editInterests")}
          </Link>
        }
      />
      <WeeklyTopicCard />

      {mine.length > 0 && others.length > 0 ? (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted">{t("mySubjects")}</h2>
            {grid(mine)}
          </section>
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted">{t("otherSubjects")}</h2>
            {grid(others)}
          </section>
        </>
      ) : (
        grid(subjects)
      )}
    </div>
  );
}
