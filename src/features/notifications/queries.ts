import "server-only";
import { db } from "@/lib/db";

export const unreadCount = (userId: string) => db.notification.count({ where: { userId, readAt: null } });

/** Plain, serializable notification for the client list. */
export interface NotificationItem {
  id: string;
  type: string;
  data: Record<string, string | number>;
  read: boolean;
  createdAt: string;
}

/**
 * Newest first. `before` = the last item already shown (cursor paging: createdAt, then id as tie-break),
 * so notifications arriving while you scroll never cause duplicates or gaps.
 */
export async function listNotifications(
  userId: string,
  limit = 30,
  before?: { createdAt: string; id: string },
): Promise<NotificationItem[]> {
  const rows = await db.notification.findMany({
    where: {
      userId,
      ...(before && {
        OR: [
          { createdAt: { lt: new Date(before.createdAt) } },
          { createdAt: new Date(before.createdAt), id: { lt: before.id } },
        ],
      }),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
  });
  return rows.map(toItem);
}

/** One of the user's own notifications (null for someone else's id). */
export async function getNotification(userId: string, id: string): Promise<NotificationItem | null> {
  const n = await db.notification.findFirst({ where: { id, userId } });
  return n && toItem(n);
}

const toItem = (n: { id: string; type: string; data: unknown; readAt: Date | null; createdAt: Date }): NotificationItem => ({
  id: n.id,
  type: n.type,
  data: n.data as Record<string, string | number>,
  read: !!n.readAt,
  createdAt: n.createdAt.toISOString(),
});
