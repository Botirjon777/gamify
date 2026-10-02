"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { useTimeText } from "@/components/use-time-text";
import { Link } from "@/i18n/navigation";
import { SkeletonRows } from "@/components/skeletons";
import { useInfinite } from "@/components/use-infinite";
import { loadMoreNotifications } from "../actions";
import { NOTIFICATIONS_PAGE } from "../constants";
import type { NotificationItem } from "../queries";
import { NOTIFICATION_STYLE } from "../styles";

/**
 * First page from the server; older notifications load as you scroll, fading in. Opening one marks it read.
 * `now` comes from the server so "5 daqiqa oldin" renders the same on the server and on hydration.
 */
export function NotificationList({ initial, now }: { initial: NotificationItem[]; now: string }) {
  const t = useTranslations("notifications");
  const tb = useTranslations("badges");
  const tc = useTranslations("common");
  const time = useTimeText();
  const loadPage = useCallback((loaded: NotificationItem[]) => {
    const last = loaded[loaded.length - 1];
    return loadMoreNotifications({ createdAt: last.createdAt, id: last.id });
  }, []);
  const { items, loading, error, done, sentinelRef, retry } = useInfinite(initial, NOTIFICATIONS_PAGE, loadPage);

  return (
    <div className="flex flex-col gap-3">
      <ul className="stagger overflow-hidden rounded-2xl border border-border bg-surface">
        {items.map((n) => {
          const style = NOTIFICATION_STYLE[n.type];
          if (!style) return null;
          const values = n.type === "BADGE_EARNED" ? { ...n.data, badge: tb(`${n.data.badge}.title`) } : n.data;
          const Icon = style.icon;
          return (
            <li key={n.id} className={`border-b border-border last:border-b-0 ${n.read ? "" : "bg-brand/5"}`}>
              <Link href={`/notifications/${n.id}`} className="flex items-start gap-3 px-4 py-3.5 hover:bg-background">
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl text-white ${style.gradient}`}>
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm leading-relaxed">
                    {t.rich(`types.${n.type}`, { ...values, b: (chunks) => <b className="font-bold">{chunks}</b> })}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">{time.ago(new Date(n.createdAt), new Date(now))}</span>
                </span>
                {!n.read && <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-grad-streak" />}
              </Link>
            </li>
          );
        })}
      </ul>
      {!done && <div ref={sentinelRef} aria-hidden className="h-px" />}
      {loading && <SkeletonRows count={3} />}
      {error && (
        <button type="button" onClick={() => void retry()} className="mx-auto text-sm font-semibold text-brand hover:underline">
          {tc("retry")}
        </button>
      )}
    </div>
  );
}
