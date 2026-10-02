import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { normalizePartnerCode, PARTNER_COOKIE, PARTNER_COOKIE_DAYS } from "@/features/partners/service";

/**
 * A partner's link: zukkolar.uz/p/<code> (optionally ?to=/iq-test). Counts the click, remembers the partner
 * in a cookie and sends the visitor on. An unknown or switched-off code just opens the site.
 */
export async function GET(request: Request, { params }: RouteContext<"/[locale]/p/[code]">) {
  const { code: raw } = await params;
  const code = normalizePartnerCode(raw);
  // Only our own pages: a path that starts with one "/" (never "//host" or a full URL).
  const to = new URL(request.url).searchParams.get("to") ?? "";
  const target = /^\/(?!\/)[\w\-/?=&%.]*$/.test(to) ? to : "/";

  if (code) {
    const counted = await db.partner.updateMany({ where: { code, active: true }, data: { clicks: { increment: 1 } } });
    if (counted.count) {
      (await cookies()).set(PARTNER_COOKIE, code, { httpOnly: true, sameSite: "lax", path: "/", maxAge: PARTNER_COOKIE_DAYS * 24 * 60 * 60 });
    }
  }
  // Relative: behind the reverse proxy the request URL is the internal one.
  return new Response(null, { status: 307, headers: { Location: target, "Cache-Control": "no-store" } });
}
