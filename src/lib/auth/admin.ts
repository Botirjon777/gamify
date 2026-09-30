import "server-only";
import { notFound } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireSession } from "./session";

/** Admin pages / actions: super admins only. Others get a 404 — the panel doesn't reveal it exists. */
export async function requireAdmin() {
  const current = await requireSession();
  if (!current.user.isSuperAdmin) notFound();
  return current;
}

/** Record an admin action (who did what to whom) for accountability. */
export async function audit(
  tx: Prisma.TransactionClient | typeof db,
  adminId: string,
  action: string,
  targetUserId?: string | null,
  data?: Prisma.InputJsonValue,
) {
  await tx.adminAction.create({ data: { adminId, action, targetUserId: targetUserId ?? null, data } });
}
