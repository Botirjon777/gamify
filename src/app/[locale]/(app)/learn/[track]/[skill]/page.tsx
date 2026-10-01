import { notFound } from "next/navigation";
import { ArrowLeft, Play } from "lucide-react";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonClass } from "@/components/ui/button";
import { requireSession } from "@/lib/auth/session";
import { getSkill } from "@/features/learn/queries";
import { masteryLevel } from "@/features/learn/mastery";
import { MasteryBar } from "@/features/learn/components/mastery-bar";

export default async function SkillPage({ params }: PageProps<"/[locale]/learn/[track]/[skill]">) {
  const { locale, track, skill: skillSlug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("learn");
  const format = await getFormatter();
  const { user, tenant } = await requireSession();

  const skill = await getSkill(track, skillSlug, user.id, tenant.id, locale);
  if (!skill) notFound();

  const level = masteryLevel(skill.mastery, skill.attempts);
  const accuracy = skill.attempts ? Math.round((skill.correct / skill.attempts) * 100) : null;
  const cta = skill.attempts === 0 ? t("start") : skill.due ? t("review") : t("continue");

  return (
    <div className="flex flex-col gap-6">
      <Link href={`/learn/${skill.trackSlug}`} className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> {skill.trackTitle}
      </Link>

      <section className="rounded-3xl border border-border bg-surface p-6 sm:p-8">
        <p className="text-sm font-semibold text-muted">
          {skill.trackTitle} · {skill.moduleTitle}
        </p>
        <h1 className="mt-2 font-mono text-3xl font-bold tracking-tight sm:text-4xl">{skill.title}</h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-muted">{skill.description}</p>

        <div className="mt-6 max-w-md">
          <div className="flex items-baseline justify-between text-sm font-semibold">
            <span>
              {t("mastery")} · <span className="text-muted">{t(`levels.${level}`)}</span>
            </span>
            <span className="text-brand">{Math.round(skill.mastery)}%</span>
          </div>
          <MasteryBar score={skill.mastery} attempts={skill.attempts} className="mt-2 h-3" />
        </div>

        <Link
          href={`/learn/${skill.trackSlug}/${skill.slug}/drill`}
          className={buttonClass("primary", "mt-8 h-12 w-full px-8 text-base sm:w-auto")}
        >
          <Play className="size-5" /> {cta}
        </Link>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <Stat label={t("stats.solved")} value={`${skill.solved}/${skill.exerciseCount}`} />
        <Stat label={t("stats.accuracy")} value={accuracy === null ? "—" : `${accuracy}%`} />
        <Stat
          label={t("stats.lastPracticed")}
          value={skill.lastPracticedAt ? format.relativeTime(skill.lastPracticedAt) : "—"}
        />
      </section>

      <section className="rounded-2xl border border-dashed border-border p-5">
        <h2 className="font-bold">{t("howTitle")}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">{t("how")}</p>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs font-medium text-muted sm:text-sm">{label}</p>
      <p className="mt-1 truncate text-lg font-bold sm:text-xl">{value}</p>
    </div>
  );
}
