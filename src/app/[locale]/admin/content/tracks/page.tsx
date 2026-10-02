import { ArrowLeft, Layers } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { getCmsTracks, uzText } from "@/features/admin/cms-queries";
import { TrackFormDialog } from "@/features/admin/components/track-form-dialog";
import { StatusToggle } from "@/features/admin/components/cms-status-controls";
import { SUBJECT_STYLE } from "@/features/learn/subjects";
import { TRACK_GRADIENTS } from "@/features/learn/track-style";
import { IconTile } from "@/components/icon";
import { buttonClass } from "@/components/ui/button";

/** Every course (all statuses), grouped by subject by the query's ordering. */
export default async function CmsTracksPage({ params }: PageProps<"/[locale]/admin/content/tracks">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin();
  const t = await getTranslations("admin.cms");
  const tLearn = await getTranslations("learn");
  const tracks = await getCmsTracks();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/admin/content" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-foreground">
            <ArrowLeft className="size-3.5" /> {t("home")}
          </Link>
          <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">{t("tracksTitle")}</h1>
          <p className="text-sm text-muted">{t("tracksDesc")}</p>
        </div>
        <TrackFormDialog />
      </div>

      <div className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
        {tracks.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted">{t("track.empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted">
                  <th className="pb-3 font-semibold">{t("columns.track")}</th>
                  <th className="px-4 pb-3 font-semibold">{t("columns.subject")}</th>
                  <th className="px-4 pb-3 font-semibold">{t("columns.structure")}</th>
                  <th className="px-4 pb-3 font-semibold">{t("fields.status")}</th>
                  <th className="pb-3 text-right font-semibold">{t("columns.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {tracks.map((track) => {
                  const subject = SUBJECT_STYLE[track.subject];
                  return (
                    <tr key={track.id} className="group hover:bg-background/50">
                      <td className="py-3.5 pr-4">
                        <Link href={`/admin/content/tracks/${track.slug}`} className="flex items-center gap-3">
                          <IconTile name={track.icon ?? subject.icon} gradient={TRACK_GRADIENTS[track.slug] ?? subject.gradient} size="md" />
                          <span>
                            <span className="block font-bold group-hover:text-brand">{uzText(track.title)}</span>
                            <span className="font-mono text-xs text-muted">/{track.slug}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-muted">
                        {tLearn(`subjects.${track.subject}.title`)}
                        {track.category && ` · ${tLearn(`categories.${track.category}.title`)}`}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-medium text-muted">
                        {t("structure", { modules: track.moduleCount, skills: track.skillCount, exercises: track.exerciseCount })}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusToggle id={track.id} status={track.status} kind="track" />
                      </td>
                      <td className="py-3.5 pl-4">
                        <div className="flex items-center justify-end gap-2">
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
                          <Link href={`/admin/content/tracks/${track.slug}`} className={buttonClass("secondary", "h-9 whitespace-nowrap px-3 text-xs")}>
                            <Layers className="size-3.5" /> {t("track.open")}
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
