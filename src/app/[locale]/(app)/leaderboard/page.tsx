import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireSession } from "@/lib/auth/session";
import { avatarDataUri } from "@/lib/avatar";
import { getLeaderboardStore, type LeaderboardEntry, type Period } from "@/lib/leaderboard";
import { iqFromRating } from "@/features/iq/rating";
import { db } from "@/lib/db";
import { tashkentWeekStart } from "@/lib/time";

const BOARDS = ["XP", "IQ"] as const;
const PERIODS = ["all-time", "weekly"] as const;
const LIMIT = 50;
const MEDALS = ["🥇", "🥈", "🥉"];

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

  const [entries, myRank] = await Promise.all([store.top({ ...query, limit: LIMIT }), store.rankOf(user.id, query)]);
  const meInList = entries.some((e) => e.userId === user.id);
  const myValue = myRank && !meInList ? await myScore(user.id, tenant.id, board, period) : null;

  const href = (b: string, p: string) => `/leaderboard?board=${b}&period=${p}`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t("title")}</h1>
        <p className="mt-1.5 text-muted">{t("subtitle")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs items={BOARDS.map((b) => ({ href: href(b, period), label: t(`boards.${b}`), active: b === board }))} />
        <Tabs items={PERIODS.map((p) => ({ href: href(board, p), label: t(`periods.${p}`), active: p === period }))} />
      </div>

      {entries.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-muted">{t("empty")}</p>
      ) : (
        <ol className="overflow-hidden rounded-2xl border border-border bg-surface">
          {entries.map((e) => (
            <Row key={e.userId} entry={e} board={board} isMe={e.userId === user.id} youLabel={t("you")} />
          ))}
        </ol>
      )}

      {/* Your position when you're not in the top list */}
      {!meInList && (
        <section className="rounded-2xl border-2 border-brand/30 bg-brand/5">
          <p className="px-4 pt-3 text-xs font-bold uppercase tracking-wider text-brand">{t("yourRank")}</p>
          {myRank && myValue !== null ? (
            <ol>
              <Row
                entry={{ rank: myRank, userId: user.id, username: user.username, avatarSeed: user.avatarSeed, value: myValue }}
                board={board}
                isMe
                youLabel={t("you")}
              />
            </ol>
          ) : (
            <p className="px-4 pb-4 pt-1 text-sm text-muted">
              {t("notRanked")} {board === "IQ" ? t("notRankedIq") : t("notRankedXp")}
            </p>
          )}
        </section>
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
            item.active ? "bg-brand text-brand-foreground" : "text-muted hover:text-foreground"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

function Row({ entry, board, isMe, youLabel }: { entry: LeaderboardEntry; board: "XP" | "IQ"; isMe: boolean; youLabel: string }) {
  const top = entry.rank <= 3;
  return (
    <li
      className={`flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 sm:gap-4 ${
        isMe ? "bg-brand/5" : top ? "bg-xp/5" : ""
      }`}
    >
      <span className={`w-9 shrink-0 text-center font-extrabold ${top ? "text-2xl" : "text-muted"}`}>
        {top ? MEDALS[entry.rank - 1] : entry.rank}
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element -- inline SVG data URI */}
      <img src={avatarDataUri(entry.avatarSeed)} alt="" className="size-10 shrink-0 rounded-full" />
      <span className="min-w-0 flex-1 truncate font-semibold">
        {entry.username}
        {isMe && <span className="ml-2 rounded-full bg-brand px-2 py-0.5 text-xs text-brand-foreground">{youLabel}</span>}
      </span>
      <span className={`shrink-0 font-extrabold ${board === "XP" ? "text-xp" : "text-brand"}`}>
        {Math.round(entry.value).toLocaleString("uz-UZ")} {board === "XP" ? "XP" : "IQ"}
      </span>
    </li>
  );
}
