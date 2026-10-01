import "server-only";
import { headers } from "next/headers";
import { randomInt } from "node:crypto";
import { db } from "@/lib/db";

/** No 0/O, 1/I/L — easy to read aloud and type on a phone. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

/** XP the new user gets immediately for signing up with a friend's code. */
export const REFERRAL_NEW_USER_XP = 50;

export const normalizeReferralCode = (code: string) => code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

function randomCode() {
  return Array.from({ length: CODE_LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}

/** The user's invite code, created on first use. */
export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { referralCode: true } });
  if (user.referralCode) return user.referralCode;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    // Only set it if still empty (two tabs racing) and the code is free (unique index).
    const updated = await db.user
      .updateMany({ where: { id: userId, referralCode: null }, data: { referralCode: code } })
      .catch(() => ({ count: 0 }));
    if (updated.count) return code;
    const again = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { referralCode: true } });
    if (again.referralCode) return again.referralCode;
  }
  throw new Error("Could not create a referral code");
}

/** Sign-up link with the code, on the host the user is on (study-center subdomains keep their own host). */
export async function inviteLink(code: string): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  return `${proto}://${h.get("host")}/register?ref=${code}`;
}

export async function referralStats(userId: string) {
  const [joined, rewarded] = await Promise.all([
    db.user.count({ where: { referredById: userId } }),
    db.user.count({ where: { referredById: userId, referralRewardedAt: { not: null } } }),
  ]);
  return { joined, rewarded };
}
