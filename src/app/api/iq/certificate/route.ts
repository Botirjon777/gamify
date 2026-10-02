import { getCurrentSession } from "@/lib/auth/session";
import { siteOrigin } from "@/lib/site-url";
import { iqCertificateAccess } from "@/features/iq/certificate";
import { userCertificateData } from "@/features/iq/certificate-data";
import { certificateResponse } from "@/features/iq/certificate-render";

/**
 * The signed-in user's IQ certificate: the picture, or with `?format=pdf` the PDF (`&download=1` saves it).
 * Only for users who unlocked it — see iqCertificateAccess.
 */
export async function GET(request: Request) {
  const current = await getCurrentSession();
  // Relative: behind the reverse proxy the request URL is the internal one.
  if (!current) return new Response(null, { status: 303, headers: { Location: "/login" } });
  const { user, tenant } = current;
  if (!(await iqCertificateAccess(user)).unlocked) return new Response("Forbidden", { status: 403 });
  if (!user.iqTestedAt) return new Response("Not found", { status: 404 });

  return certificateResponse(request, await userCertificateData({ ...user, iqTestedAt: user.iqTestedAt }, tenant.name, await siteOrigin()));
}
