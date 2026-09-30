import { Info, Plus, Users } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { IconTile, type GradientKey } from "@/components/icon";
import { buttonClass } from "@/components/ui/button";
import { CLAN_WEEKLY_REWARDS, getClanRating, getMyClan } from "@/features/clans/queries";

const MEDAL = ["bg-grad-gold", "bg-grad-silver", "bg-grad-bronze"];

export default async function ClansPage({ params }: PageProps<"/[locale]/clans">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("clans");
  const { user, tenant } = await requireSession();
  const [{ current, lastWeek }, myClan] = await Promise.all([getClanRating(tenant.id), getMyClan(user.id)]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        action={
          myClan ? (
            <Link href={`/clans/${myClan.slug}`} className={buttonClass("secondary")}>
              <IconTile name={myClan.emblem} gradient={myClan.color as GradientKey} size="sm" /> {t("myClan")}
            </Link>
          ) : (
            <Link href="/clans/new" className={buttonClass("primary")}>
              <Plus className="size-4" /> {t("create")}
            </Link>
          )
        }
      />

      {/* Last week's podium */}
      {lastWeek.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-sm font-bold">{t("lastWeek")}</h2>
          <div className="stagger grid gap-3 sm:grid-cols-3">
            {lastWeek.map((r) => (
              <Link
                key={r.id}
                href={`/clans/${r.clan.slug}`}
                className={`relative overflow-hidden rounded-2xl p-4 text-foreground shadow-lg ${MEDAL[r.rank - 1]}`}
              >
                <span className="font-display text-3xl font-bold opacity-80">#{r.rank}</span>
                <p className="mt-1 truncate font-bold">{r.clan.name}</p>
                <p className="text-sm font-semibold opacity-80">{t("score", { xp: Math.round(r.score) })}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* This week */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-display text-sm font-bold">{t("weeklyTitle")}</h2>
        </div>
        <p className="mb-4 flex items-start gap-2 rounded-2xl bg-brand/5 p-3 text-sm text-muted">
          <Info className="mt-0.5 size-4 shrink-0 text-brand" />
          {t("howScore", { first: CLAN_WEEKLY_REWARDS[0], second: CLAN_WEEKLY_REWARDS[1], third: CLAN_WEEKLY_REWARDS[2] })}
        </p>

        {current.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-muted">{t("noClans")}</p>
        ) : (
          <ol className="stagger overflow-hidden rounded-2xl border border-border bg-surface">
            {current.map((c) => {
              const mine = myClan?.id === c.id;
              return (
                <li key={c.id} className={`border-b border-border last:border-b-0 ${mine ? "bg-brand/5" : ""}`}>
                  <Link href={`/clans/${c.slug}`} className="flex items-center gap-3 px-4 py-3 hover:bg-background sm:gap-4">
                    <span
                      className={`grid size-8 shrink-0 place-items-center rounded-lg font-display text-sm font-bold ${
                        c.rank <= 3 ? `${MEDAL[c.rank - 1]} text-foreground` : "text-muted"
                      }`}
                    >
                      {c.rank}
                    </span>
                    <IconTile name={c.emblem} gradient={c.color as GradientKey} size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">
                        {c.name} <span className="text-xs font-bold text-muted">[{c.tag}]</span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-muted">
                        <Users className="size-3.5" /> {t("members", { count: c.members })}
                      </span>
                    </span>
                    <span className="shrink-0 font-display font-bold text-xp">{t("score", { xp: Math.round(c.score) })}</span>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
