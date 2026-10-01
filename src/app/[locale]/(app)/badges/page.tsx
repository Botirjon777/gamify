import { Lock } from "lucide-react";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { IconTile, type GradientKey } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { BADGES } from "@/features/badges/catalog";
import { statsFor } from "@/features/badges/service";

/** My badges: earned ones first (with the date), then what's left with progress. */
export default async function BadgesPage({ params }: PageProps<"/[locale]/badges">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("badgesPage");
  const tb = await getTranslations("badges");
  const format = await getFormatter();
  const { user } = await requireSession();

  const [owned, stats] = await Promise.all([
    db.userBadge.findMany({ where: { userId: user.id }, orderBy: { earnedAt: "desc" } }),
    statsFor(db as unknown as Prisma.TransactionClient, user.id),
  ]);
  const earnedAt = new Map(owned.map((b) => [b.badge, b.earnedAt]));
  const earned = owned.map((o) => BADGES.find((b) => b.key === o.badge)).filter((b) => !!b);
  const locked = BADGES.filter((b) => !earnedAt.has(b.key))
    // Closest to done first
    .map((b) => {
      const [current, target] = b.progress?.(stats) ?? [0, 0];
      return { ...b, current: Math.min(current, target), target, share: target ? current / target : 0 };
    })
    .sort((a, b) => b.share - a.share);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t("title")} subtitle={t("subtitle", { earned: earned.length, total: BADGES.length })} />

      <section>
        <h2 className="mb-3 font-display text-lg font-bold">{t("earned")}</h2>
        {earned.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-muted">{t("none")}</p>
        ) : (
          <ul className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-5">
            {earned.map((b) => (
              <li key={b.key} className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface p-4 text-center">
                <IconTile name={b.icon} gradient={b.gradient as GradientKey} size="lg" />
                <span className="text-sm font-bold">{tb(`${b.key}.title`)}</span>
                <span className="text-xs text-muted">{tb(`${b.key}.text`)}</span>
                <span className="mt-auto pt-1 text-[11px] font-semibold text-muted">
                  {format.dateTime(earnedAt.get(b.key)!, { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Tashkent" })}
                  {b.xp > 0 && <span className="text-xp"> · +{b.xp} XP</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {locked.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-lg font-bold">{t("locked")}</h2>
          <ul className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-5">
            {locked.map((b) => (
              <li key={b.key} className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface/60 p-4 text-center">
                <span className="relative opacity-60 grayscale">
                  <IconTile name={b.icon} gradient={b.gradient as GradientKey} size="lg" />
                  <span className="absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-full bg-surface text-muted shadow">
                    <Lock className="size-3.5" />
                  </span>
                </span>
                <span className="text-sm font-bold">{tb(`${b.key}.title`)}</span>
                <span className="text-xs text-muted">{tb(`${b.key}.text`)}</span>
                {b.target > 0 && (
                  <div className="mt-auto w-full pt-1">
                    <div className="h-1.5 overflow-hidden rounded-full bg-border">
                      <div className="h-full rounded-full bg-grad-brand" style={{ width: `${Math.round((b.current / b.target) * 100)}%` }} />
                    </div>
                    <p className="mt-1 text-[11px] font-semibold text-muted">
                      {b.current}/{b.target}
                      {b.xp > 0 && <span className="text-xp"> · +{b.xp} XP</span>}
                    </p>
                  </div>
                )}
                {b.target === 0 && b.xp > 0 && <span className="mt-auto pt-1 text-[11px] font-semibold text-xp">+{b.xp} XP</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
