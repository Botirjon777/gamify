import { ArrowLeft, Pencil, Plus, Search } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { getCmsExercises, toExerciseType, toStatus, uzText } from "@/features/admin/cms-queries";
import { StatusToggle } from "@/features/admin/components/cms-status-controls";
import type { PublicContent } from "@/features/learn/content-schema";
import { buttonClass } from "@/components/ui/button";

const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);
const TYPES = ["CHOICE", "OUTPUT", "FILL", "ORDER", "MOVE"] as const;
const STATUSES = ["PUBLISHED", "DRAFT", "ARCHIVED"] as const;

/** The question bank: search and filter every exercise. ?skill=<id> narrows it to one skill. */
export default async function CmsExercisesPage({ params, searchParams }: PageProps<"/[locale]/admin/content/exercises">) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  await requireAdmin();
  const t = await getTranslations("admin.cms");
  const tLearn = await getTranslations("learn");

  const filter = { search: one(query.search), type: toExerciseType(one(query.type)), status: toStatus(one(query.status)), skillId: one(query.skill) };
  const result = await getCmsExercises({ ...filter, page: Number(one(query.page)) });
  // Pagination links keep the filters.
  const pageHref = (page: number) => {
    const sp = new URLSearchParams({ page: String(page) });
    if (filter.search) sp.set("search", filter.search);
    if (filter.type) sp.set("type", filter.type);
    if (filter.status) sp.set("status", filter.status);
    if (filter.skillId) sp.set("skill", filter.skillId);
    return `/admin/content/exercises?${sp}`;
  };
  const newHref = `/admin/content/exercises/new${filter.skillId ? `?skill=${filter.skillId}` : ""}`;
  const selectClass = "h-10 rounded-xl border border-border bg-background px-3 text-sm font-medium";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/admin/content" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-foreground">
            <ArrowLeft className="size-3.5" /> {t("home")}
          </Link>
          <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">{t("exercisesTitle")}</h1>
          <p className="text-sm text-muted">{t("found", { count: result.total })}</p>
        </div>
        <Link href={newHref} className={buttonClass("primary")}>
          <Plus className="size-4" /> {t("newExercise")}
        </Link>
      </div>

      <form className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface p-4">
        {filter.skillId && <input type="hidden" name="skill" value={filter.skillId} />}
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-3 top-3 size-4 text-muted" />
          <input
            name="search"
            defaultValue={filter.search ?? ""}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-brand"
          />
        </div>
        <select name="type" defaultValue={filter.type ?? ""} aria-label={t("fields.type")} className={selectClass}>
          <option value="">{t("allTypes")}</option>
          {TYPES.map((type) => (
            <option key={type} value={type}>
              {t(`exercise.types.${type}`)}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={filter.status ?? ""} aria-label={t("fields.status")} className={selectClass}>
          <option value="">{t("allStatuses")}</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {t(`status.${status}`)}
            </option>
          ))}
        </select>
        <button type="submit" className={buttonClass("secondary", "h-10 text-xs")}>
          {t("filter")}
        </button>
        {filter.skillId && (
          <Link href="/admin/content/exercises" className="text-xs font-bold text-brand hover:underline">
            {t("allSkills")}
          </Link>
        )}
      </form>

      <div className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
        {result.items.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted">{t("exercise.empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted">
                  <th className="pb-3 font-semibold">{t("columns.question")}</th>
                  <th className="px-4 pb-3 font-semibold">{t("fields.type")}</th>
                  <th className="px-4 pb-3 font-semibold">{t("fields.skill")}</th>
                  <th className="px-4 pb-3 font-semibold">{t("fields.status")}</th>
                  <th className="pb-3 text-right font-semibold">{t("columns.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {result.items.map((exercise) => (
                  <tr key={exercise.id} className="hover:bg-background/50">
                    <td className="max-w-xs py-3.5 pr-4 sm:max-w-md">
                      <span className="font-mono text-xs font-bold text-brand">{exercise.key}</span>
                      <p className="line-clamp-2 text-sm font-medium leading-snug">{uzText((exercise.content as PublicContent).prompt)}</p>
                    </td>
                    <td className="px-4 py-3.5 text-xs font-semibold text-muted">
                      <span className="block whitespace-nowrap text-foreground">{t(`exercise.types.${exercise.type}`)}</span>
                      {t("exercise.level", { difficulty: exercise.difficulty, xp: exercise.xp })}
                    </td>
                    <td className="px-4 py-3.5 text-xs font-semibold text-muted">
                      <span className="block font-bold text-foreground">{uzText(exercise.skill.title)}</span>
                      {uzText(exercise.skill.module.track.title)} · {tLearn(`subjects.${exercise.skill.module.track.subject}.title`)}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusToggle id={exercise.id} status={exercise.status} kind="exercise" />
                    </td>
                    <td className="py-3.5 pl-4 text-right">
                      <Link href={`/admin/content/exercises/${exercise.id}/edit`} className={buttonClass("secondary", "h-9 px-3 text-xs")}>
                        <Pencil className="size-3.5" /> {t("edit")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {result.pages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-xs font-semibold">
            <span className="text-muted">{t("page", { page: result.page, pages: result.pages })}</span>
            <div className="flex gap-2">
              {result.page > 1 && (
                <Link href={pageHref(result.page - 1)} className={buttonClass("secondary", "h-8 px-3 text-xs")}>
                  ← {t("prev")}
                </Link>
              )}
              {result.page < result.pages && (
                <Link href={pageHref(result.page + 1)} className={buttonClass("secondary", "h-8 px-3 text-xs")}>
                  {t("next")} →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
