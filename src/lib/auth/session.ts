import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { UAParser } from "ua-parser-js";
import { db } from "@/lib/db";
import { getCurrentTenant } from "@/lib/tenant";
import { redirect } from "@/i18n/navigation";

export const SESSION_COOKIE = "gamify_session";

const DAY_MS = 24 * 60 * 60 * 1000;
const SESSION_TTL_MS = 30 * DAY_MS;
/** Extend a session when it has less than this left (sliding expiry). */
const RENEW_BEFORE_MS = 15 * DAY_MS;
/** Don't write lastActiveAt more often than this. */
const TOUCH_EVERY_MS = 5 * 60 * 1000;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

async function clientInfo() {
  const h = await headers();
  const userAgent = h.get("user-agent") ?? "";
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  const { browser, os, device } = UAParser(userAgent);
  const deviceName = [browser.name, os.name, device.model].filter(Boolean).join(" · ") || null;
  return { userAgent, ip, deviceName };
}

export async function getClientIp() {
  return (await clientInfo()).ip ?? "unknown";
}

/** Create a session for this device and set the cookie. Call only from server actions / route handlers. */
export async function createSession(userId: string, tenantId: string) {
  const token = randomBytes(32).toString("base64url");
  const info = await clientInfo();

  await db.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      tenantId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      ...info,
    },
  });

  // Secure whenever the visitor is on HTTPS (nginx sets X-Forwarded-Proto) — always true in production,
  // while a local production build over plain http://localhost still works.
  const https = (await headers()).get("x-forwarded-proto") === "https";

  // The DB row is the source of truth for expiry; the cookie just lives long enough.
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: https,
    sameSite: "lax",
    path: "/",
    maxAge: 400 * 24 * 60 * 60,
  });
}

/** The current session + user, or null. Deduplicated per request. */
export const getCurrentSession = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const tenant = await getCurrentTenant();
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  const now = Date.now();
  if (!session || session.revokedAt || session.expiresAt.getTime() < now) return null;
  // A session only works on the tenant (subdomain) it was created on.
  if (session.tenantId !== tenant.id) return null;

  const needsTouch = now - session.lastActiveAt.getTime() > TOUCH_EVERY_MS;
  const needsRenew = session.expiresAt.getTime() - now < RENEW_BEFORE_MS;
  if (needsTouch || needsRenew) {
    await db.session.update({
      where: { id: session.id },
      data: {
        lastActiveAt: new Date(now),
        ...(needsRenew && { expiresAt: new Date(now + SESSION_TTL_MS) }),
      },
    });
  }

  const { user, ...rest } = session;
  return { session: rest, user, tenant };
});

/** For protected pages/actions: returns the session or redirects to /login. */
export async function requireSession() {
  const current = await getCurrentSession();
  if (!current) redirect({ href: "/login", locale: await getLocale() });
  return current!;
}

export async function revokeSession(sessionId: string) {
  await db.session.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date() } });
}

export async function revokeOtherSessions(userId: string, keepSessionId: string) {
  await db.session.updateMany({
    where: { userId, revokedAt: null, id: { not: keepSessionId } },
    data: { revokedAt: new Date() },
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** "Just signed up": account from the last few minutes that has only ever had this one session. */
export async function isJustSignedUp(user: { id: string; createdAt: Date }) {
  if (Date.now() - user.createdAt.getTime() > 10 * 60 * 1000) return false;
  return (await db.session.count({ where: { userId: user.id } })) === 1;
}
