import "server-only";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

/** Set by /p/<code>; read when an account is created (or a guest IQ test is started). */
export const PARTNER_COOKIE = "zk_partner";
/** How long after opening a partner's link a sign-up still counts as theirs. */
export const PARTNER_COOKIE_DAYS = 30;

/** Partner codes are lowercase letters, digits and "-": zukkolar.uz/p/aziz-blog */
export const normalizePartnerCode = (code: string) =>
  code
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 40);

/** The active partner whose link this visitor opened (last one wins), or null. */
export async function partnerFromCookie(): Promise<string | null> {
  const code = normalizePartnerCode((await cookies()).get(PARTNER_COOKIE)?.value ?? "");
  if (!code) return null;
  const partner = await db.partner.findUnique({ where: { code }, select: { id: true, active: true } });
  return partner?.active ? partner.id : null;
}

export interface PartnerStats {
  signups: number;
  /** Users with at least one approved payment. */
  payers: number;
  /** Sum of their approved payments, soʻm. */
  revenue: number;
}

/** Per partner: what their users did. Partners without users are simply missing from the map. */
export async function partnerStats(): Promise<Map<string, PartnerStats>> {
  const [signups, paid] = await Promise.all([
    db.user.groupBy({ by: ["partnerId"], where: { partnerId: { not: null } }, _count: true }),
    db.$queryRaw<{ partnerId: string; payers: number; revenue: number }[]>`
      SELECT u."partnerId", COUNT(DISTINCT p."userId")::int AS payers, COALESCE(SUM(p."amountUzs"), 0)::int AS revenue
      FROM "Payment" p JOIN "User" u ON u.id = p."userId"
      WHERE p.status = 'APPROVED' AND u."partnerId" IS NOT NULL
      GROUP BY u."partnerId"`,
  ]);
  const stats = new Map<string, PartnerStats>();
  for (const row of signups) if (row.partnerId) stats.set(row.partnerId, { signups: row._count, payers: 0, revenue: 0 });
  for (const row of paid) {
    const s = stats.get(row.partnerId);
    if (s) Object.assign(s, { payers: row.payers, revenue: row.revenue });
  }
  return stats;
}
