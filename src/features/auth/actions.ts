"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentTenant, isDefaultTenant } from "@/lib/tenant";
import { getRateLimiter } from "@/lib/rate-limit";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { looksLikePhone, normalizePhone } from "@/lib/auth/phone";
import {
  clearSessionCookie,
  createSession,
  getClientIp,
  getCurrentSession,
  requireSession,
  revokeOtherSessions,
  revokeSession,
} from "@/lib/auth/session";
import { redirect } from "@/i18n/navigation";
import { Prisma } from "@/generated/prisma/client";
import { loginSchema, registerSchema, type FormState } from "./schemas";
import { awardXp } from "@/features/gamification/xp";
import { notify } from "@/features/notifications/service";
import { normalizeReferralCode, REFERRAL_NEW_USER_XP } from "@/features/referrals/service";

function fieldErrors(error: z.ZodError): FormState["fieldErrors"] {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0]);
    out[key] ??= issue.message;
  }
  return out;
}

/** Hash of a random password, verified against when the user doesn't exist → same timing either way. */
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= hashPassword("dummy-password-for-timing"));

export async function register(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = {
    phone: String(formData.get("phone") ?? ""),
    username: String(formData.get("username") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
  const refRaw = String(formData.get("ref") ?? "");
  const values = { phone: raw.phone, username: raw.username, ref: refRaw };

  const tenant = await getCurrentTenant();
  // Study center students are created by their admins; public sign-up only on the main site.
  if (!isDefaultTenant(tenant)) return { error: "registrationClosed", values };

  const limit = await getRateLimiter().hit(`register:ip:${await getClientIp()}`, 5, 60 * 60);
  if (!limit.ok) return { error: "tooManyAttempts", values };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  const phone = normalizePhone(parsed.data.phone);
  if (!phone) return { fieldErrors: { phone: "invalidPhone" }, values };
  const { username, password } = parsed.data;

  // Optional invite code from a friend.
  const refCode = normalizeReferralCode(refRaw);
  const referrer = refCode ? await db.user.findUnique({ where: { referralCode: refCode }, select: { id: true } }) : null;
  if (refCode && !referrer) return { fieldErrors: { ref: "invalidReferral" }, values };

  const [phoneTaken, usernameTaken] = await Promise.all([
    db.user.findUnique({ where: { phone }, select: { id: true } }),
    db.user.findUnique({ where: { username }, select: { id: true } }),
  ]);
  if (phoneTaken || usernameTaken) {
    return {
      fieldErrors: {
        ...(phoneTaken && { phone: "phoneTaken" }),
        ...(usernameTaken && { username: "usernameTaken" }),
      },
      values,
    };
  }

  let userId: string;
  const passwordHash = await hashPassword(password);
  try {
    userId = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          phone,
          username,
          passwordHash,
          avatarSeed: username,
          referredById: referrer?.id,
          memberships: { create: { tenantId: tenant.id, role: "STUDENT" } },
        },
      });
      if (referrer) {
        // New user gets a welcome bonus now; the inviter is rewarded once this user reaches level 3 (see awardXp).
        await awardXp(tx, { userId: user.id, tenantId: tenant.id, amount: REFERRAL_NEW_USER_XP, reason: "REFERRAL", refId: referrer.id });
        await notify(tx, referrer.id, "REFERRAL_JOINED", { username });
      }
      return user.id;
    });
  } catch (e) {
    // Lost a race against another sign-up with the same phone/username.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "alreadyTaken", values };
    }
    throw e;
  }

  await createSession(userId, tenant.id);
  // New users take the placement IQ test first.
  redirect({ href: "/iq/placement", locale: await getLocale() });
  return {};
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = {
    identifier: String(formData.get("identifier") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
  const values = { identifier: raw.identifier };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };
  const { identifier, password } = parsed.data;

  const limiter = getRateLimiter();
  const [byIp, byId] = await Promise.all([
    limiter.hit(`login:ip:${await getClientIp()}`, 20, 15 * 60),
    limiter.hit(`login:id:${identifier.toLowerCase()}`, 8, 15 * 60),
  ]);
  if (!byIp.ok || !byId.ok) return { error: "tooManyAttempts", values };

  const phone = looksLikePhone(identifier) ? normalizePhone(identifier) : null;
  const user = await db.user.findUnique({
    where: phone ? { phone } : { username: identifier.toLowerCase() },
  });

  const passwordOk = await verifyPassword(user?.passwordHash ?? (await getDummyHash()), password);
  if (!user || !passwordOk) return { error: "invalidCredentials", values };

  const tenant = await getCurrentTenant();
  if (isDefaultTenant(tenant)) {
    // Everyone can use the public platform.
    await db.membership.upsert({
      where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
      create: { userId: user.id, tenantId: tenant.id, role: "STUDENT" },
      update: {},
    });
  } else if (!user.isSuperAdmin) {
    const member = await db.membership.findUnique({
      where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
    });
    if (!member) return { error: "notAMember", values };
  }

  await createSession(user.id, tenant.id);
  redirect({ href: "/dashboard", locale: await getLocale() });
  return {};
}

export async function logout() {
  const current = await getCurrentSession();
  if (current) await revokeSession(current.session.id);
  await clearSessionCookie();
  redirect({ href: "/", locale: await getLocale() });
}

export async function revokeDevice(sessionId: string) {
  const { user, session } = await requireSession();
  if (sessionId === session.id) return;
  // Only the user's own sessions can be revoked.
  await db.session.updateMany({
    where: { id: sessionId, userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  revalidatePath("/settings/devices");
}

export async function revokeAllOtherDevices() {
  const { user, session } = await requireSession();
  await revokeOtherSessions(user.id, session.id);
  revalidatePath("/settings/devices");
}
