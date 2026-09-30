import { Award, BadgeCheck, Ban, Bell, Wallet, Check, PartyPopper, Shield, ShieldCheck, ShieldX, Trophy, UserCheck, UserPlus, Gift, type LucideIcon } from "lucide-react";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import type { NotificationType } from "@/generated/prisma/enums";
import { Link } from "@/i18n/navigation";
import { requireSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { listNotifications } from "@/features/notifications/queries";
import { markAllNotificationsRead } from "@/features/notifications/actions";
import { MarkReadOnView } from "@/features/notifications/components/mark-read-on-view";

const STYLE: Record<NotificationType, { icon: LucideIcon; gradient: string; href: (d: Record<string, string | number>) => string }> = {
  FRIEND_REQUEST: { icon: UserPlus, gradient: "bg-grad-brand", href: () => "/friends?tab=requests" },
  FRIEND_ACCEPTED: { icon: UserCheck, gradient: "bg-grad-success", href: (d) => `/u/${d.username}` },
  CLAN_JOIN_REQUEST: { icon: Shield, gradient: "bg-grad-dark", href: (d) => `/clans/${d.clanSlug}` },
  CLAN_JOIN_APPROVED: { icon: ShieldCheck, gradient: "bg-grad-success", href: (d) => `/clans/${d.clanSlug}` },
  CLAN_JOIN_REJECTED: { icon: ShieldX, gradient: "bg-grad-streak", href: () => "/clans" },
  CLAN_WEEKLY_RESULT: { icon: Trophy, gradient: "bg-grad-gold", href: (d) => `/clans/${d.clanSlug}` },
  BADGE_EARNED: { icon: Award, gradient: "bg-grad-xp", href: () => "/profile" },
  LEVEL_UP: { icon: PartyPopper, gradient: "bg-grad-brand", href: () => "/dashboard" },
  REFERRAL_JOINED: { icon: Gift, gradient: "bg-grad-success", href: (d) => `/u/${d.username}` },
  REFERRAL_REWARD: { icon: Gift, gradient: "bg-grad-gold", href: (d) => `/u/${d.username}` },
  PAYMENT_SUBMITTED: { icon: Wallet, gradient: "bg-grad-xp", href: () => "/admin/payments" },
  PAYMENT_APPROVED: { icon: BadgeCheck, gradient: "bg-grad-success", href: () => "/plans" },
  PAYMENT_REJECTED: { icon: Ban, gradient: "bg-grad-streak", href: () => "/plans" },
};

export default async function NotificationsPage({ params }: PageProps<"/[locale]/notifications">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("notifications");
  const tb = await getTranslations("badges");
  const format = await getFormatter();
  const { user } = await requireSession();
  const items = await listNotifications(user.id);
  const hasUnread = items.some((n) => !n.readAt);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        action={
          hasUnread && (
            <form action={markAllNotificationsRead}>
              <button className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
                <Check className="size-4" /> {t("markAll")}
              </button>
            </form>
          )
        }
      />
      {hasUnread && <MarkReadOnView />}

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border bg-surface p-10 text-center text-muted">
          <Bell className="size-10" />
          {t("empty")}
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-border bg-surface">
          {items.map((n) => {
            const style = STYLE[n.type];
            const data = n.data as Record<string, string | number>;
            const values = n.type === "BADGE_EARNED" ? { ...data, badge: tb(`${data.badge}.title`) } : data;
            const href = n.type === "BADGE_EARNED" || n.type === "LEVEL_UP" ? `/u/${user.username}` : style.href(data);
            const Icon = style.icon;
            return (
              <li key={n.id} className={`border-b border-border last:border-b-0 ${n.readAt ? "" : "bg-brand/5"}`}>
                <Link href={href} className="flex items-start gap-3 px-4 py-3.5 hover:bg-background">
                  <span className={`grid size-10 shrink-0 place-items-center rounded-xl text-white ${style.gradient}`}>
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm leading-relaxed">
                      {t.rich(`types.${n.type}`, { ...values, b: (chunks) => <b className="font-bold">{chunks}</b> })}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">{format.relativeTime(n.createdAt)}</span>
                  </span>
                  {!n.readAt && <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-grad-streak" />}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
