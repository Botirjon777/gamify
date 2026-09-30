import { Search } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireSession } from "@/lib/auth/session";
import { getFriendRequests, getFriends, searchUsers } from "@/features/social/queries";
import { FriendButton } from "@/features/social/components/friend-button";
import { UserRow } from "@/features/social/components/user-row";
import { PageHeader } from "@/components/page-header";

const TABS = ["friends", "requests", "search"] as const;

export default async function FriendsPage({ params, searchParams }: PageProps<"/[locale]/friends">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const tab = TABS.find((x) => x === sp.tab) ?? "friends";
  const q = typeof sp.q === "string" ? sp.q : "";

  const t = await getTranslations("friends");
  const { user, tenant } = await requireSession();
  const requests = await getFriendRequests(user.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="inline-flex w-fit rounded-xl border border-border bg-surface p-1">
        {TABS.map((key) => (
          <Link
            key={key}
            href={`/friends?tab=${key}`}
            aria-current={tab === key ? "page" : undefined}
            className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
              tab === key ? "bg-grad-brand text-white shadow-md shadow-brand/20" : "text-muted hover:text-foreground"
            }`}
          >
            {t(`tabs.${key}`)}
            {key === "requests" && requests.incoming.length > 0 && (
              <span className="grid min-w-5 place-items-center rounded-full bg-grad-streak px-1 text-[10px] font-bold text-white">
                {requests.incoming.length}
              </span>
            )}
          </Link>
        ))}
      </div>

      {tab === "friends" && <FriendsList userId={user.id} tenantId={tenant.id} />}

      {tab === "requests" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <List title={t("incoming")} empty={t("noRequests")}>
            {requests.incoming.map((r) => (
              <UserRow key={r.id} user={r} action={<FriendButton userId={r.id} relation="incoming" requestId={r.requestId} />} />
            ))}
          </List>
          <List title={t("outgoing")} empty={t("noRequests")}>
            {requests.outgoing.map((r) => (
              <UserRow key={r.id} user={r} action={<FriendButton userId={r.id} relation="outgoing" requestId={r.requestId} />} />
            ))}
          </List>
        </div>
      )}

      {tab === "search" && (
        <div className="flex flex-col gap-4">
          <form className="relative max-w-xl">
            <input type="hidden" name="tab" value="search" />
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
            <input
              name="q"
              defaultValue={q}
              autoFocus
              autoComplete="off"
              autoCapitalize="none"
              placeholder={t("searchPlaceholder")}
              className="h-12 w-full rounded-2xl border border-border bg-surface pl-12 pr-4 text-base outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15"
            />
          </form>
          {q.trim().length >= 2 ? <SearchResults meId={user.id} tenantId={tenant.id} q={q} /> : <p className="text-sm text-muted">{t("searchHint")}</p>}
        </div>
      )}
    </div>
  );
}

async function FriendsList({ userId, tenantId }: { userId: string; tenantId: string }) {
  const t = await getTranslations("friends");
  const friends = await getFriends(userId, tenantId);
  return (
    <List empty={t("noFriends")}>
      {friends.map((f) => (
        <UserRow
          key={f.id}
          user={f}
          extra={t("weeklyXp", { xp: Math.round(f.weeklyXp) })}
          action={<FriendButton userId={f.id} relation="friends" requestId={f.requestId} />}
        />
      ))}
    </List>
  );
}

async function SearchResults({ meId, tenantId, q }: { meId: string; tenantId: string; q: string }) {
  const t = await getTranslations("friends");
  const results = await searchUsers(meId, tenantId, q);
  return (
    <List empty={t("noResults")}>
      {results.map((u) => (
        <UserRow key={u.id} user={u} action={<FriendButton userId={u.id} relation={u.relation} requestId={u.requestId} />} />
      ))}
    </List>
  );
}

function List({ title, empty, children }: { title?: string; empty: string; children: React.ReactNode[] }) {
  return (
    <section>
      {title && <h2 className="mb-3 font-display text-sm font-bold">{title}</h2>}
      {children.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center text-sm text-muted">{empty}</p>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-border bg-surface">{children}</ul>
      )}
    </section>
  );
}
