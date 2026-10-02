import { ArrowLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { getCmsSkillOptions } from "@/features/admin/cms-queries";
import { ExerciseForm } from "@/features/admin/components/exercise-form";

/** New exercise. ?skill=<id> preselects the skill (from a course page or a filtered question bank). */
export default async function NewExercisePage({ params, searchParams }: PageProps<"/[locale]/admin/content/exercises/new">) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  await requireAdmin();
  const t = await getTranslations("admin.cms");
  const skills = await getCmsSkillOptions();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/content/exercises" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-foreground">
          <ArrowLeft className="size-3.5" /> {t("exercisesTitle")}
        </Link>
        <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">{t("exercise.newTitle")}</h1>
      </div>
      {skills.length ? (
        <ExerciseForm skills={skills} defaultSkillId={typeof query.skill === "string" ? query.skill : undefined} />
      ) : (
        <p className="rounded-3xl border border-border bg-surface p-12 text-center text-sm text-muted">{t("exercise.noSkills")}</p>
      )}
    </div>
  );
}
