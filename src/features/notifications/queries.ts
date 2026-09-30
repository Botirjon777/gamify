import "server-only";
import { db } from "@/lib/db";

export const unreadCount = (userId: string) => db.notification.count({ where: { userId, readAt: null } });

export async function listNotifications(userId: string, limit = 50) {
  return db.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: limit });
}
