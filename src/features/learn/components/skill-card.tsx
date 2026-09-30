import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { masteryLevel } from "../mastery";
import type { SkillProgress } from "../queries";
import { MasteryBar } from "./mastery-bar";

export async function SkillCard({ skill }: { skill: SkillProgress }) {
  const t = await getTranslations("learn");
  const level = masteryLevel(skill.mastery, skill.attempts);

  return (
    <Link
      href={`/learn/${skill.trackSlug}/${skill.slug}`}
      className="group flex flex-col rounded-2xl border border-border bg-surface p-4 transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg hover:shadow-brand/5"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-mono text-lg font-bold group-hover:text-brand">{skill.title}</h3>
        {skill.due ? (
          <span className="shrink-0 rounded-full bg-xp/15 px-2 py-0.5 text-xs font-semibold text-[#a86a00]">{t("due")}</span>
        ) : (
          <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-xs font-semibold text-muted">
            {t(`levels.${level}`)}
          </span>
        )}
      </div>
      <p className="mt-1.5 line-clamp-2 flex-1 text-sm leading-relaxed text-muted">{skill.description}</p>
      <div className="mt-4 flex items-center gap-3">
        <MasteryBar score={skill.mastery} attempts={skill.attempts} className="flex-1" />
        <span className="w-10 text-right text-xs font-bold text-muted">{Math.round(skill.mastery)}%</span>
      </div>
      <p className="mt-2 text-xs text-muted">{t("exercises", { count: skill.exerciseCount })}</p>
    </Link>
  );
}
