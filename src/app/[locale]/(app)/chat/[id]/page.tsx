import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { Avatar } from "@/components/avatar";
import { IconTile, type GradientKey } from "@/components/icon";
import { accessTo, ensureClanConversation, getMessages } from "@/features/chat/service";
import { MESSAGES_PAGE } from "@/features/chat/constants";
import { ChatView } from "@/features/chat/components/chat-view";

export default async function ConversationPage({ params }: PageProps<"/[locale]/chat/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("chat");
  const { user } = await requireSession();
  const access = await accessTo(id, user.id);
  if (!access) notFound();
  const { conv, canSend, peerId } = access;

  if (conv.kind === "CLAN") await ensureClanConversation(conv.clanId!, user.id);
  const [messages, clan, peer] = await Promise.all([
    getMessages(conv.id),
    conv.clanId ? db.clan.findUnique({ where: { id: conv.clanId }, select: { name: true, slug: true, emblem: true, color: true, _count: { select: { members: true } } } }) : null,
    peerId ? db.user.findUnique({ where: { id: peerId }, select: { username: true, avatarSeed: true, avatarStyle: true, gender: true } }) : null,
  ]);

  return (
    // Fill the viewport below the top bar so the composer stays at the bottom.
    <div className="-mb-28 flex h-[calc(100dvh-10rem-env(safe-area-inset-bottom))] flex-col md:-mb-10 md:h-[calc(100dvh-7.5rem)]">
      <header className="flex items-center gap-3 border-b border-border pb-3">
        <Link href="/chat" aria-label={t("back")} className="grid size-9 place-items-center rounded-xl text-muted hover:bg-surface hover:text-foreground">
          <ArrowLeft className="size-5" />
        </Link>
        {clan ? (
          <Link href={`/clans/${clan.slug}`} className="flex min-w-0 items-center gap-3">
            <IconTile name={clan.emblem} gradient={clan.color as GradientKey} size="sm" />
            <span className="min-w-0">
              <span className="block truncate font-display font-bold">{clan.name}</span>
              <span className="block text-xs text-muted">{t("members", { count: clan._count.members })}</span>
            </span>
          </Link>
        ) : peer ? (
          <Link href={`/u/${peer.username}`} className="flex min-w-0 items-center gap-3">
            <Avatar user={peer} className="size-9" />
            <span className="truncate font-display font-bold">{peer.username}</span>
          </Link>
        ) : null}
      </header>

      <ChatView
        conversationId={conv.id}
        meId={user.id}
        initial={messages}
        hasMore={messages.length >= MESSAGES_PAGE}
        canSend={canSend}
        showNames={conv.kind === "CLAN"}
      />
    </div>
  );
}
