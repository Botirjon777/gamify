"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { getRateLimiter } from "@/lib/rate-limit";
import { notify } from "@/features/notifications/service";
import { evaluateBadges } from "@/features/badges/service";
import { effectivePlan, PLANS } from "@/features/plans/plans";

export type FriendActionResult = { ok: true } | { ok: false; error: "notFound" | "limit" | "tooMany" | "self" };

function refresh() {
  revalidatePath("/", "layout");
}

async function friendCount(userId: string) {
  return db.friendship.count({ where: { status: "ACCEPTED", OR: [{ requesterId: userId }, { addresseeId: userId }] } });
}

/** Send a request. If they already asked me, this accepts it instead. */
export async function sendFriendRequest(targetId: string): Promise<FriendActionResult> {
  const { user, tenant } = await requireSession();
  const id = z.string().min(1).parse(targetId);
  if (id === user.id) return { ok: false, error: "self" };

  const limit = await getRateLimiter().hit(`friend-req:${user.id}`, 30, 60 * 60);
  if (!limit.ok) return { ok: false, error: "tooMany" };

  const target = await db.user.findFirst({ where: { id, memberships: { some: { tenantId: tenant.id } } } });
  if (!target) return { ok: false, error: "notFound" };
  if ((await friendCount(user.id)) >= PLANS[effectivePlan(user)].maxFriends) return { ok: false, error: "limit" };

  const reverse = await db.friendship.findUnique({
    where: { requesterId_addresseeId: { requesterId: id, addresseeId: user.id } },
  });
  if (reverse) {
    if (reverse.status === "PENDING") return acceptFriendRequest(reverse.id);
    return { ok: true }; // already friends
  }

  await db.$transaction(async (tx) => {
    const created = await tx.friendship.createMany({
      data: { requesterId: user.id, addresseeId: id },
      skipDuplicates: true,
    });
    if (created.count) await notify(tx, id, "FRIEND_REQUEST", { username: user.username });
  });
  refresh();
  return { ok: true };
}

/** Only the addressee can accept. */
export async function acceptFriendRequest(requestId: string): Promise<FriendActionResult> {
  const { user, tenant } = await requireSession();
  const request = await db.friendship.findFirst({ where: { id: requestId, addresseeId: user.id, status: "PENDING" } });
  if (!request) return { ok: false, error: "notFound" };
  if ((await friendCount(user.id)) >= PLANS[effectivePlan(user)].maxFriends) return { ok: false, error: "limit" };

  await db.$transaction(async (tx) => {
    await tx.friendship.update({ where: { id: request.id }, data: { status: "ACCEPTED", respondedAt: new Date() } });
    await notify(tx, request.requesterId, "FRIEND_ACCEPTED", { username: user.username });
    await evaluateBadges(tx, user.id, tenant.id);
    await evaluateBadges(tx, request.requesterId, tenant.id);
  });
  refresh();
  return { ok: true };
}

/** Decline an incoming request, cancel an outgoing one, or unfriend — all delete the row. */
export async function removeFriendship(requestId: string): Promise<FriendActionResult> {
  const { user } = await requireSession();
  const deleted = await db.friendship.deleteMany({
    where: { id: requestId, OR: [{ requesterId: user.id }, { addresseeId: user.id }] },
  });
  refresh();
  return deleted.count ? { ok: true } : { ok: false, error: "notFound" };
}
