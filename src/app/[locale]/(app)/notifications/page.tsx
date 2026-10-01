import { Bell, CheckCheck } from "lucide-react";
import { getNow, getTranslations, setRequestLocale } from "next-intl/server";
import { requireSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { listNotifications, unreadCount } from "@/features/notifications/queries";
import { markAllNotificationsRead } from "@/features/notifications/actions";
import { NOTIFICATIONS_PAGE } from "@/features/notifications/constants";
import { NotificationList } from "@/features/notifications/components/notification-list";

export default async function NotificationsPage({ params }: PageProps<"/[locale]/notifications">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("notifications");
  const { user } = await requireSession();
  const [items, unread] = await Promise.all([listNotifications(user.id, NOTIFICATIONS_PAGE), unreadCount(user.id)]);
  const now = (await getNow()).toISOString();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        subtitle={unread > 0 ? t("unread", { count: unread }) : undefined}
        action={
          unread > 0 && (
            <form action={markAllNotificationsRead}>
              <button className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 text-sm font-semibold text-brand transition hover:border-brand/40 hover:bg-brand/5">
                <CheckCheck className="size-4" /> {t("markAll")}
              </button>
            </form>
          )
        }
      />

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border bg-surface p-10 text-center text-muted">
          <Bell className="size-10" />
          {t("empty")}
        </div>
      ) : (
        // key: after "read all" the list starts fresh from the server instead of keeping its old state
        <NotificationList key={unread} initial={items} now={now} />
      )}
    </div>
  );
}
