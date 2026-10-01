"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { getRateLimiter } from "@/lib/rate-limit";
import { CLAN_COLORS, CLAN_EMBLEMS } from "@/components/icon";
import { notify, notifyMany } from "@/features/notifications/service";
import { evaluateBadges } from "@/features/badges/service";
import { memberLimit } from "./queries";
import { leaveClanChat } from "@/features/chat/service";

export type ClanFormState = { redirectTo?: string; error?: string; fieldErrors?: Partial<Record<string, string>>; values?: Record<string, string> };
export type ClanActionResult = { ok: true } | { ok: false; error: "notFound" | "forbidden" | "inClan" | "full" | "tooMany" };

const clanSchema = z.object({
  name: z.string().trim().min(3, "nameLength").max(30, "nameLength"),
  tag: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,5}$/, "tagFormat"),
  description: z.string().trim().max(200, "descriptionLength").optional(),
  emblem: z.enum(CLAN_EMBLEMS),
  color: z.enum(CLAN_COLORS as [string, ...string[]]),
});

const refresh = () => revalidatePath("/", "layout");

async function officersOf(clanId: string) {
  const rows = await db.clanMember.findMany({ where: { clanId, role: { in: ["LEADER", "OFFICER"] } }, select: { userId: true } });
  return rows.map((r) => r.userId);
}

function parseClanForm(formData: FormData) {
  const raw = Object.fromEntries(["name", "tag", "description", "emblem", "color"].map((k) => [k, String(formData.get(k) ?? "")]));
  const values = raw as Record<string, string>;
  const parsed = clanSchema.safeParse({ ...raw, description: raw.description || undefined });
  if (parsed.success) return { values, data: parsed.data };
  const fieldErrors: Record<string, string> = {};
  for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
  return { values, fieldErrors };
}

export async function createClan(_prev: ClanFormState, formData: FormData): Promise<ClanFormState> {
  const { user, tenant } = await requireSession();
  const form = parseClanForm(formData);
  const values = form.values;
  if (!form.data) return { fieldErrors: form.fieldErrors, values };
  if (await db.clanMember.findUnique({ where: { userId: user.id } })) return { error: "inClan", values };

  const limit = await getRateLimiter().hit(`clan-create:${user.id}`, 3, 24 * 60 * 60);
  if (!limit.ok) return { error: "tooMany", values };

  const { name, tag, description, emblem, color } = form.data;
  const slug = tag.toLowerCase();
  if (await db.clan.findFirst({ where: { OR: [{ tag }, { slug }] } })) return { fieldErrors: { tag: "tagTaken" }, values };

  try {
    await db.$transaction(async (tx) => {
      const clan = await tx.clan.create({
        data: { tenantId: tenant.id, slug, name, tag, description, emblem, color, members: { create: { userId: user.id, role: "LEADER" } } },
      });
      // Founding a clan withdraws your pending requests to other clans.
      await tx.clanJoinRequest.deleteMany({ where: { userId: user.id, status: "PENDING", clanId: { not: clan.id } } });
      await evaluateBadges(tx, user.id, tenant.id);
    });
  } catch {
    return { fieldErrors: { tag: "tagTaken" }, values };
  }

  // No revalidatePath here: it re-renders the current page inside this response, and /clans/new now
  // redirects (you have a clan), so the client would never see redirectTo. useRedirectTo navigates + refreshes.
  return { redirectTo: `/clans/${slug}` };
}

/** Joining always needs approval from the leader or an officer. */
export async function requestToJoin(clanId: string, message?: string): Promise<ClanActionResult> {
  const { user, tenant } = await requireSession();
  const text = z.string().trim().max(200).optional().parse(message || undefined);

  const limit = await getRateLimiter().hit(`clan-join:${user.id}`, 10, 60 * 60);
  if (!limit.ok) return { ok: false, error: "tooMany" };

  const clan = await db.clan.findFirst({ where: { id: clanId, tenantId: tenant.id }, include: { _count: { select: { members: true } } } });
  if (!clan) return { ok: false, error: "notFound" };
  if (await db.clanMember.findUnique({ where: { userId: user.id } })) return { ok: false, error: "inClan" };
  if (clan._count.members >= (await memberLimit(clan.id))) return { ok: false, error: "full" };

  const officers = await officersOf(clan.id);
  await db.$transaction(async (tx) => {
    // Re-requesting after a rejection is allowed: reset to PENDING.
    await tx.clanJoinRequest.upsert({
      where: { clanId_userId: { clanId: clan.id, userId: user.id } },
      create: { clanId: clan.id, userId: user.id, message: text },
      update: { status: "PENDING", message: text, createdAt: new Date(), decidedAt: null, decidedById: null },
    });
    await notifyMany(tx, officers, "CLAN_JOIN_REQUEST", { username: user.username, clanName: clan.name, clanSlug: clan.slug });
  });
  refresh();
  return { ok: true };
}

export async function cancelJoinRequest(clanId: string): Promise<ClanActionResult> {
  const { user } = await requireSession();
  await db.clanJoinRequest.deleteMany({ where: { clanId, userId: user.id, status: "PENDING" } });
  refresh();
  return { ok: true };
}

/** Leader / officer approves or rejects a pending request. */
export async function decideJoinRequest(requestId: string, approve: boolean): Promise<ClanActionResult> {
  const { user, tenant } = await requireSession();
  const request = await db.clanJoinRequest.findFirst({ where: { id: requestId, status: "PENDING" }, include: { clan: true } });
  if (!request) return { ok: false, error: "notFound" };

  const me = await db.clanMember.findUnique({ where: { userId: user.id } });
  if (!me || me.clanId !== request.clanId || me.role === "MEMBER") return { ok: false, error: "forbidden" };

  if (approve) {
    if (await db.clanMember.findUnique({ where: { userId: request.userId } })) {
      await db.clanJoinRequest.update({ where: { id: request.id }, data: { status: "REJECTED", decidedAt: new Date(), decidedById: user.id } });
      refresh();
      return { ok: false, error: "inClan" };
    }
    const count = await db.clanMember.count({ where: { clanId: request.clanId } });
    if (count >= (await memberLimit(request.clanId))) return { ok: false, error: "full" };
  }

  await db.$transaction(async (tx) => {
    await tx.clanJoinRequest.update({
      where: { id: request.id },
      data: { status: approve ? "APPROVED" : "REJECTED", decidedAt: new Date(), decidedById: user.id },
    });
    const data = { clanName: request.clan.name, clanSlug: request.clan.slug };
    if (approve) {
      await tx.clanMember.create({ data: { clanId: request.clanId, userId: request.userId } });
      await tx.clanJoinRequest.deleteMany({ where: { userId: request.userId, status: "PENDING" } });
      await notify(tx, request.userId, "CLAN_JOIN_APPROVED", data);
      await evaluateBadges(tx, request.userId, tenant.id);
    } else {
      await notify(tx, request.userId, "CLAN_JOIN_REJECTED", data);
    }
  });
  refresh();
  return { ok: true };
}

/** Leaving as leader hands the clan to the longest-serving officer (or member); the last one out closes it. */
export async function leaveClan(): Promise<ClanActionResult> {
  const { user } = await requireSession();
  const me = await db.clanMember.findUnique({ where: { userId: user.id } });
  if (!me) return { ok: false, error: "notFound" };

  await db.$transaction(async (tx) => {
    await tx.clanMember.delete({ where: { userId: user.id } });
    await tx.conversationMember.deleteMany({ where: { userId: user.id, conversation: { clanId: me.clanId } } });
    if (me.role !== "LEADER") return;
    const successor =
      (await tx.clanMember.findFirst({ where: { clanId: me.clanId, role: "OFFICER" }, orderBy: { joinedAt: "asc" } })) ??
      (await tx.clanMember.findFirst({ where: { clanId: me.clanId }, orderBy: { joinedAt: "asc" } }));
    if (successor) await tx.clanMember.update({ where: { userId: successor.userId }, data: { role: "LEADER" } });
    else await tx.clan.delete({ where: { id: me.clanId } });
  });
  refresh();
  return { ok: true };
}

/** Leader can remove anyone; officers can remove members. */
export async function kickMember(userId: string): Promise<ClanActionResult> {
  const { user } = await requireSession();
  const [me, target] = await Promise.all([
    db.clanMember.findUnique({ where: { userId: user.id } }),
    db.clanMember.findUnique({ where: { userId } }),
  ]);
  if (!me || !target || me.clanId !== target.clanId || userId === user.id) return { ok: false, error: "forbidden" };
  const allowed = me.role === "LEADER" || (me.role === "OFFICER" && target.role === "MEMBER");
  if (!allowed) return { ok: false, error: "forbidden" };
  await db.clanMember.delete({ where: { userId } });
  await leaveClanChat(target.clanId, userId);
  refresh();
  return { ok: true };
}

/** Leader promotes a member to officer or demotes back. */
export async function setOfficer(userId: string, officer: boolean): Promise<ClanActionResult> {
  const { user } = await requireSession();
  const [me, target] = await Promise.all([
    db.clanMember.findUnique({ where: { userId: user.id } }),
    db.clanMember.findUnique({ where: { userId } }),
  ]);
  if (!me || !target || me.role !== "LEADER" || me.clanId !== target.clanId || target.role === "LEADER") {
    return { ok: false, error: "forbidden" };
  }
  await db.clanMember.update({ where: { userId }, data: { role: officer ? "OFFICER" : "MEMBER" } });
  refresh();
  return { ok: true };
}

// ─── Leader: settings ────────────────────────────────────────────────────────

async function leaderOf(clanId: string, userId: string) {
  const me = await db.clanMember.findUnique({ where: { userId } });
  return me?.clanId === clanId && me.role === "LEADER" ? me : null;
}

/** Edit name / tag / description / emblem / colour. The URL follows the tag. */
export async function updateClan(clanId: string, _prev: ClanFormState, formData: FormData): Promise<ClanFormState> {
  const { user } = await requireSession();
  const form = parseClanForm(formData);
  if (!form.data) return { fieldErrors: form.fieldErrors, values: form.values };
  if (!(await leaderOf(clanId, user.id))) return { error: "forbidden", values: form.values };

  const { name, tag, description, emblem, color } = form.data;
  const slug = tag.toLowerCase();
  if (await db.clan.findFirst({ where: { id: { not: clanId }, OR: [{ tag }, { slug }] } })) {
    return { fieldErrors: { tag: "tagTaken" }, values: form.values };
  }
  const before = await db.clan.findUniqueOrThrow({ where: { id: clanId }, select: { slug: true } });
  try {
    await db.clan.update({ where: { id: clanId }, data: { name, tag, slug, description: description ?? null, emblem, color } });
  } catch {
    return { fieldErrors: { tag: "tagTaken" }, values: form.values };
  }
  // A new tag moves the clan to a new URL. revalidatePath would re-render the current (old-URL) page inside
  // this response — a 404 — and the client would never get redirectTo; useRedirectTo navigates + refreshes.
  if (before.slug === slug) refresh();
  return { redirectTo: `/clans/${slug}` };
}

/** Hand the clan to another member; the old leader stays as an officer. */
export async function transferLeadership(clanId: string, userId: string): Promise<ClanActionResult> {
  const { user } = await requireSession();
  if (!(await leaderOf(clanId, user.id)) || userId === user.id) return { ok: false, error: "forbidden" };
  const target = await db.clanMember.findUnique({ where: { userId } });
  if (target?.clanId !== clanId) return { ok: false, error: "notFound" };

  await db.$transaction([
    db.clanMember.update({ where: { userId: user.id }, data: { role: "OFFICER" } }),
    db.clanMember.update({ where: { userId }, data: { role: "LEADER" } }),
  ]);
  refresh();
  return { ok: true };
}

/** Delete the clan for good — the leader has to type its name. */
export async function deleteClan(clanId: string, confirmName: string): Promise<ClanActionResult> {
  const { user } = await requireSession();
  const clan = await db.clan.findUnique({ where: { id: clanId } });
  if (!clan) return { ok: false, error: "notFound" };
  if (!(await leaderOf(clanId, user.id)) || confirmName.trim() !== clan.name) return { ok: false, error: "forbidden" };

  await db.clan.delete({ where: { id: clanId } });
  refresh();
  return { ok: true };
}
