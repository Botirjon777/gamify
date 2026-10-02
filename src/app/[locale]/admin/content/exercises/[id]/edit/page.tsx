import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { getCmsExerciseById, getCmsSkillOptions, uzText } from "@/features/admin/cms-queries";
import { ExerciseForm, type ExerciseFormData } from "@/features/admin/components/exercise-form";
import { toFileExercise } from "@/features/learn/content-export";
import { XP_BY_DIFFICULTY, type PrivateAnswer, type PublicContent } from "@/features/learn/content-schema";

export default async function EditExercisePage({ params }: PageProps<"/[locale]/admin/content/exercises/[id]/edit">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requireAdmin();
  const t = await getTranslations("admin.cms");
  const [exercise, skills] = await Promise.all([getCmsExerciseById(id), getCmsSkillOptions()]);
  if (!exercise) notFound();

  const content = exercise.content as PublicContent;
  const answer = exercise.answer as PrivateAnswer;
  const initial: ExerciseFormData = {
    id: exercise.id,
    key: exercise.key,
    skillId: exercise.skillId,
    type: exercise.type,
    difficulty: exercise.difficulty,
    customXp: exercise.xp === XP_BY_DIFFICULTY[exercise.difficulty] ? undefined : exercise.xp,
    status: exercise.status,
    prompt: uzText(content.prompt),
    explanation: uzText(exercise.explanation),
    lang: content.lang,
    code: "code" in content ? (content.code ?? "") : "",
    options: content.type === "CHOICE" ? content.options.map(uzText) : undefined,
    choiceAnswer: answer.type === "CHOICE" ? answer.index : undefined,
    outputAnswers: answer.type === "OUTPUT" ? answer.accepted : undefined,
    fillAnswers: answer.type === "FILL" ? answer.blanks : undefined,
    // The stored bank also holds the right words; the form edits only the distractors (as in the files).
    fillBank: content.type === "FILL" ? (toFileExercise(exercise).bank as string[] | undefined) : undefined,
    orderLines: answer.type === "ORDER" ? answer.lines : undefined,
    board: content.board,
    moveAnswers: answer.type === "MOVE" ? answer.san : undefined,
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/content/exercises" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-foreground">
          <ArrowLeft className="size-3.5" /> {t("exercisesTitle")}
        </Link>
        <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">{t("exercise.editTitle")}</h1>
        <p className="font-mono text-sm text-muted">{exercise.key}</p>
      </div>
      <ExerciseForm skills={skills} initial={initial} />
    </div>
  );
}
