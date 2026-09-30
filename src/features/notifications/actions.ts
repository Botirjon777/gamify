"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { NOTIFICATIONS_PAGE } from "./constants";
import { listNotifications } from "./queries";

export async function markAllNotificationsRead() {
  const { user } = await requireSession();
  await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/", "layout");
}

/** Older notifications for infinite scroll. */
export async function loadMoreNotifications(before: { createdAt: string; id: string }) {
  const { user } = await requireSession();
  const cursor = z.object({ createdAt: z.iso.datetime(), id: z.string().min(1).max(40) }).parse(before);
  return listNotifications(user.id, NOTIFICATIONS_PAGE, cursor);
}
