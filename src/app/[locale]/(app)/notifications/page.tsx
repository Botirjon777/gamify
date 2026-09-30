import { Bell, Check } from "lucide-react";
import { getNow, getTranslations, setRequestLocale } from "next-intl/server";
import { requireSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { listNotifications } from "@/features/notifications/queries";
import { markAllNotificationsRead } from "@/features/notifications/actions";
import { NOTIFICATIONS_PAGE } from "@/features/notifications/constants";
import { MarkReadOnView } from "@/features/notifications/components/mark-read-on-view";
import { NotificationList } from "@/features/notifications/components/notification-list";

export default async function NotificationsPage({ params }: PageProps<"/[locale]/notifications">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("notifications");
  const { user } = await requireSession();
  const items = await listNotifications(user.id, NOTIFICATIONS_PAGE);
  const hasUnread = items.some((n) => !n.read);
  const now = (await getNow()).toISOString();

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
        <NotificationList initial={items} username={user.username} now={now} />
      )}
    </div>
  );
}
