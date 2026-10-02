import { ArrowLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { getCatalogStructure } from "@/features/learn/queries";
import { groupMessageKey, inGroup, TRACK_GROUPS } from "@/features/learn/subjects";
import { getFriends } from "@/features/social/queries";
import { DuelForm } from "@/features/duels/components/duel-form";
import { DUEL_QUESTIONS } from "@/features/duels/constants";

/** ?opponent=<username>&track=<slug> preselect (from a profile or "rematch"). */
export default async function NewDuelPage({ params, searchParams }: PageProps<"/[locale]/duels/new">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations("duels");
  const tl = await getTranslations("learn");
  const { user, tenant } = await requireSession();

  const [friends, catalog, named] = await Promise.all([
    getFriends(user.id, tenant.id),
    getCatalogStructure(tenant.id, locale),
    typeof sp.opponent === "string"
      ? db.user.findFirst({ where: { username: sp.opponent.toLowerCase(), memberships: { some: { tenantId: tenant.id } } }, select: { id: true, username: true } })
      : null,
  ]);

  // Friends first; someone opened from a profile is added if not a friend.
  const opponents = friends.map((f) => ({ id: f.id, label: f.username }));
  if (named && named.id !== user.id && !opponents.some((o) => o.id === named.id)) opponents.unshift({ id: named.id, label: named.username });

  const playable = catalog.filter((tr) => tr.modules.reduce((n, m) => n + m.skills.reduce((k, s) => k + s.exerciseCount, 0), 0) >= DUEL_QUESTIONS);
  const tracks = TRACK_GROUPS.map((g) => ({
    category: tl(`${groupMessageKey(g)}.title`),
    items: playable.filter((tr) => inGroup(g, tr)).map((tr) => ({ id: tr.id, label: tr.title })),
  })).filter((g) => g.items.length);
  const defaultTrack = playable.find((tr) => tr.slug === sp.track)?.id;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Link href="/duels" className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> {t("all")}
      </Link>
      <PageHeader title={t("new")} subtitle={t("newSubtitle", { questions: DUEL_QUESTIONS })} />
      <DuelForm opponents={opponents} tracks={tracks} defaultOpponent={named?.id} defaultTrack={defaultTrack} myXp={user.xp} />
    </div>
  );
}
