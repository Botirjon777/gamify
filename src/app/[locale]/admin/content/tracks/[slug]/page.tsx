import { notFound } from "next/navigation";
import { ArrowLeft, Layers, List, Plus } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { getCmsTrackBySlug, uzText } from "@/features/admin/cms-queries";
import { ModuleDialog, SkillDialog } from "@/features/admin/components/module-skill-dialogs";
import { TrackFormDialog } from "@/features/admin/components/track-form-dialog";
import { StatusBadge } from "@/features/admin/components/cms-status-controls";

/** One course: its modules and skills. Exercises are managed from the question bank, filtered by skill. */
export default async function CmsTrackDetailPage({ params }: PageProps<"/[locale]/admin/content/tracks/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  await requireAdmin();
  const t = await getTranslations("admin.cms");
  const tLearn = await getTranslations("learn");
  const track = await getCmsTrackBySlug(slug);
  if (!track) notFound();
  const nextModuleOrder = Math.max(-1, ...track.modules.map((m) => m.order)) + 1;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/content/tracks" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-foreground">
          <ArrowLeft className="size-3.5" /> {t("tracksTitle")}
        </Link>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold sm:text-3xl">{uzText(track.title)}</h1>
              <StatusBadge status={track.status} />
            </div>
            <p className="font-mono text-xs text-muted">
              /{track.slug} · {tLearn(`subjects.${track.subject}.title`)}
              {track.category && ` · ${tLearn(`categories.${track.category}.title`)}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TrackFormDialog
              track={{
                id: track.id,
                slug: track.slug,
                title: uzText(track.title),
                description: uzText(track.description),
                subject: track.subject,
                category: track.category,
                icon: track.icon,
                order: track.order,
                status: track.status,
              }}
            />
            <ModuleDialog trackId={track.id} nextOrder={nextModuleOrder} />
          </div>
        </div>
      </div>

      {track.modules.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-border bg-surface p-12 text-center">
          <Layers className="size-12 text-muted" />
          <h2 className="font-display text-lg font-bold">{t("module.empty")}</h2>
          <p className="max-w-md text-sm text-muted">{t("module.emptyText")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {track.modules.map((mod, index) => (
            <section key={mod.id} className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-8 place-items-center rounded-lg bg-brand/10 text-xs font-bold text-brand">{index + 1}</span>
                  <div>
                    <h2 className="font-display text-base font-bold">{uzText(mod.title)}</h2>
                    <span className="font-mono text-xs text-muted">/{mod.slug}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <ModuleDialog trackId={track.id} mod={{ id: mod.id, slug: mod.slug, title: uzText(mod.title), order: mod.order }} />
                  <SkillDialog moduleId={mod.id} nextOrder={Math.max(-1, ...mod.skills.map((s) => s.order)) + 1} />
                </div>
              </div>

              {mod.skills.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted">{t("skill.empty")}</p>
              ) : (
                <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                  {mod.skills.map((skill) => (
                    <li key={skill.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/80 bg-background/50 p-3.5">
                      <div className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{uzText(skill.title)}</span>
                        <span className="block truncate font-mono text-xs text-muted">
                          /{skill.slug} · {t("exerciseCount", { count: skill._count.exercises })}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <SkillDialog
                          moduleId={mod.id}
                          skill={{ id: skill.id, slug: skill.slug, title: uzText(skill.title), description: uzText(skill.description), order: skill.order }}
                        />
                        <Link
                          href={`/admin/content/exercises?skill=${skill.id}`}
                          aria-label={t("skill.exercises")}
                          title={t("skill.exercises")}
                          className="grid size-8 place-items-center rounded-lg text-muted hover:bg-background hover:text-foreground"
                        >
                          <List className="size-4" />
                        </Link>
                        <Link
                          href={`/admin/content/exercises/new?skill=${skill.id}`}
                          className="inline-flex h-8 items-center gap-1 rounded-lg bg-brand/10 px-2.5 text-xs font-bold text-brand hover:bg-brand/20"
                        >
                          <Plus className="size-3" /> {t("exercise.short")}
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
