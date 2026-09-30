import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { LeaderboardList } from "@/features/leaderboard/components/leaderboard-list";
import { LeaderboardRow } from "@/features/leaderboard/components/leaderboard-row";
import { LEADERBOARD_PAGE } from "@/features/leaderboard/constants";
import { getLeaderboardStore, type Period } from "@/lib/leaderboard";
import { iqFromRating } from "@/features/iq/rating";
import { db } from "@/lib/db";
import { tashkentWeekStart } from "@/lib/time";

const BOARDS = ["XP", "IQ"] as const;
const PERIODS = ["all-time", "weekly"] as const;


export default async function LeaderboardPage({ params, searchParams }: PageProps<"/[locale]/leaderboard">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const board = BOARDS.find((b) => b === sp.board) ?? "XP";
  const period: Period = PERIODS.find((p) => p === sp.period) ?? "all-time";

  const t = await getTranslations("leaderboard");
  const { user, tenant } = await requireSession();
  const store = getLeaderboardStore();
  const query = { board, period, tenantId: tenant.id };

  const [entries, myRank] = await Promise.all([store.top({ ...query, limit: LEADERBOARD_PAGE }), store.rankOf(user.id, query)]);
  const meInList = entries.some((e) => e.userId === user.id);
  const myValue = myRank && !meInList ? await myScore(user.id, tenant.id, board, period) : null;

  const href = (b: string, p: string) => `/leaderboard?board=${b}&period=${p}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="flex flex-wrap items-center gap-3">
        <Tabs items={BOARDS.map((b) => ({ href: href(b, period), label: t(`boards.${b}`), active: b === board }))} />
        <Tabs items={PERIODS.map((p) => ({ href: href(board, p), label: t(`periods.${p}`), active: p === period }))} />
      </div>

      {/* Your position when you're not in the top list */}
      {!meInList && (
        <section className="rounded-2xl border-2 border-brand/30 bg-brand/5">
          <p className="px-4 pt-3 text-xs font-bold uppercase tracking-wider text-brand">{t("yourRank")}</p>
          {myRank && myValue !== null ? (
            <ol>
              <LeaderboardRow
                entry={{ rank: myRank, userId: user.id, username: user.username, avatarSeed: user.avatarSeed, avatarStyle: user.avatarStyle, gender: user.gender, value: myValue }}
                board={board}
                isMe
                youLabel={t("you")}
              />
            </ol>
          ) : (
            <div className="flex flex-col gap-3 px-4 pb-4 pt-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted">
                {t("notRanked")} {board === "IQ" ? t("notRankedIq") : t("notRankedXp")}
              </p>
              {board === "IQ" && !user.iqTestedAt && (
                <Link href="/iq/placement" className="shrink-0 text-sm font-semibold text-brand hover:underline">
                  {t("takeTest")} →
                </Link>
              )}
            </div>
          )}
        </section>
      )}

      {entries.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-muted">{t("empty")}</p>
      ) : (
        // key: switching tabs starts a fresh list
        <LeaderboardList key={`${board}-${period}`} initial={entries} board={board} period={period} meId={user.id} />
      )}

      {period === "weekly" && <p className="text-xs text-muted">{t("weeklyReset")}</p>}
    </div>
  );
}

async function myScore(userId: string, tenantId: string, board: "XP" | "IQ", period: Period) {
  if (period === "weekly") {
    const row = await db.weeklyScore.findUnique({
      where: { userId_tenantId_week_board: { userId, tenantId, week: tashkentWeekStart(), board } },
    });
    return row?.value ?? null;
  }
  const me = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { xp: true, iqRating: true } });
  return board === "XP" ? me.xp : iqFromRating(me.iqRating);
}

function Tabs({ items }: { items: { href: string; label: string; active: boolean }[] }) {
  return (
    <div className="inline-flex rounded-xl border border-border bg-surface p-1">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
            item.active ? "bg-grad-brand text-brand-foreground shadow-md shadow-brand/20" : "text-muted hover:text-foreground"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
