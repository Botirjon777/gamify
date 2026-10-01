import { MessagesSquare } from "lucide-react";
import { getFormatter, getNow, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireSession } from "@/lib/auth/session";
import { IconTile, type GradientKey } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { listConversations } from "@/features/chat/service";

/** Clan chat + direct chats with friends. New chats start from a friend's profile ("Xabar yozish"). */
export default async function ChatListPage({ params }: PageProps<"/[locale]/chat">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("chat");
  const format = await getFormatter();
  const now = await getNow();
  const { user } = await requireSession();
  const conversations = await listConversations(user.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      {conversations.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border bg-surface p-10 text-center text-muted">
          <MessagesSquare className="size-10" />
          <p>{t("empty")}</p>
          <Link href="/friends" className="font-semibold text-brand hover:underline">
            {t("toFriends")} →
          </Link>
        </div>
      ) : (
        <ul className="stagger overflow-hidden rounded-2xl border border-border bg-surface">
          {conversations.map((c) => {
            const title = c.kind === "CLAN" ? c.clan!.name : c.peer?.username ?? "—";
            const preview = c.last ? `${c.last.mine ? t("you") + ": " : c.kind === "CLAN" ? c.last.sender + ": " : ""}${c.last.body}` : t("clanEmpty");
            return (
              <li key={c.id} className="border-b border-border last:border-b-0">
                <Link href={`/chat/${c.id}`} className={`flex items-center gap-3 px-4 py-3.5 hover:bg-background ${c.unread ? "bg-brand/5" : ""}`}>
                  {c.kind === "CLAN" ? (
                    <IconTile name={c.clan!.emblem} gradient={c.clan!.color as GradientKey} size="md" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element -- inline SVG data URI
                    <img src={c.peer?.avatar} alt="" className="size-11 shrink-0 rounded-full bg-background" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-semibold">{title}</span>
                      {c.kind === "CLAN" && <span className="rounded bg-grad-dark px-1.5 py-0.5 text-[10px] font-bold text-white">{t("clanBadge")}</span>}
                    </span>
                    <span className={`block truncate text-sm ${c.unread ? "font-semibold text-foreground" : "text-muted"}`}>{preview}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    {c.last && <span className="text-xs text-muted">{format.relativeTime(new Date(c.last.createdAt), now)}</span>}
                    {c.unread > 0 && (
                      <span className="grid min-w-5 place-items-center rounded-full bg-grad-streak px-1.5 text-[11px] font-bold text-white">
                        {c.unread > 99 ? "99+" : c.unread}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
