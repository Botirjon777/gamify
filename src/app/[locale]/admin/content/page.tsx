import { BookOpen, Brain, FileText, Layers, Plus } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { getCmsOverviewStats } from "@/features/admin/cms-queries";
import { buttonClass } from "@/components/ui/button";

/** Content management home: counts and the three areas (courses, exercises, IQ questions). */
export default async function CmsOverviewPage({ params }: PageProps<"/[locale]/admin/content">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin();
  const t = await getTranslations("admin.cms");
  const stats = await getCmsOverviewStats();
  const total = (counts: Record<string, number>) => Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{t("title")}</h1>
          <p className="text-sm text-muted">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/content/tracks" className={buttonClass("secondary")}>
            <BookOpen className="size-4" /> {t("tracks")}
          </Link>
          <Link href="/admin/content/exercises/new" className={buttonClass("primary")}>
            <Plus className="size-4" /> {t("newExercise")}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<BookOpen className="size-5" />}
          gradient="bg-grad-brand"
          label={t("totalTracks")}
          value={`${stats.tracks.PUBLISHED} / ${total(stats.tracks)}`}
          sub={t("publishedVsTotal")}
          href="/admin/content/tracks"
        />
        <StatCard
          icon={<Layers className="size-5" />}
          gradient="bg-grad-gold"
          label={t("modulesAndSkills")}
          value={`${stats.modules} / ${stats.skills}`}
          sub={t("modulesSkillsCount")}
          href="/admin/content/tracks"
        />
        <StatCard
          icon={<FileText className="size-5" />}
          gradient="bg-grad-streak"
          label={t("totalExercises")}
          value={String(stats.exercises.PUBLISHED)}
          sub={t("drafts", { count: stats.exercises.DRAFT })}
          href="/admin/content/exercises"
        />
        <StatCard
          icon={<Brain className="size-5" />}
          gradient="bg-grad-iq"
          label={t("iqItems")}
          value={String(stats.iqItems.PUBLISHED)}
          sub={t("drafts", { count: stats.iqItems.DRAFT })}
          href="/admin/content/iq"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <NavCard icon={<BookOpen className="size-8 text-brand" />} title={t("tracksTitle")} text={t("tracksDesc")} href="/admin/content/tracks" badge={t("published", { count: stats.tracks.PUBLISHED })} />
        <NavCard icon={<FileText className="size-8 text-streak" />} title={t("exercisesTitle")} text={t("exercisesDesc")} href="/admin/content/exercises" badge={t("published", { count: stats.exercises.PUBLISHED })} />
        <NavCard icon={<Brain className="size-8 text-brand-2" />} title={t("iqTitle")} text={t("iqDesc")} href="/admin/content/iq" badge={t("published", { count: stats.iqItems.PUBLISHED })} />
      </div>

      <p className="rounded-2xl border border-dashed border-border p-4 text-sm leading-relaxed text-muted">{t("filesNote")}</p>
    </div>
  );
}

function StatCard({ icon, gradient, label, value, sub, href }: { icon: React.ReactNode; gradient: string; label: string; value: string; sub: string; href: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition hover:border-brand/40">
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl text-white shadow-lg shadow-black/5 ${gradient}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted">{label}</p>
        <p className="truncate font-display text-lg font-bold">{value}</p>
        <p className="truncate text-xs text-muted">{sub}</p>
      </div>
    </Link>
  );
}

function NavCard({ icon, title, text, href, badge }: { icon: React.ReactNode; title: string; text: string; href: string; badge: string }) {
  return (
    <Link href={href} className="flex flex-col rounded-3xl border border-border bg-surface p-6 shadow-sm transition hover:border-brand/40 hover:shadow-md">
      <div className="flex items-center justify-between gap-2">
        {icon}
        <span className="rounded-full bg-brand/10 px-2.5 py-1 text-xs font-bold text-brand">{badge}</span>
      </div>
      <h2 className="mt-4 font-display text-lg font-bold">{title}</h2>
      <p className="mt-1 text-sm text-muted">{text}</p>
    </Link>
  );
}
