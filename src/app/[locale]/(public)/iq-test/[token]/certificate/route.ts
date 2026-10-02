import { siteOrigin } from "@/lib/site-url";
import { getCurrentTenant } from "@/lib/tenant";
import { guestCertificateData } from "@/features/iq/certificate-data";
import { certificateResponse } from "@/features/iq/certificate-render";
import { guestTestByToken } from "@/features/iq/guest";

/**
 * The certificate of a paid test, by its secret link:
 *   /iq-test/<token>/certificate                        the picture (shown on the result page)
 *   /iq-test/<token>/certificate?format=pdf             the PDF, opened in the browser
 *   /iq-test/<token>/certificate?format=pdf&download=1  the PDF, saved as "Zukkolar-IQ-sertifikat-<name>.pdf"
 */
export async function GET(request: Request, { params }: RouteContext<"/[locale]/iq-test/[token]/certificate">) {
  const { token } = await params;
  const test = await guestTestByToken(token);
  if (!test?.paidAt) return new Response("Not found", { status: 404 });
  const [tenant, origin] = await Promise.all([getCurrentTenant(), siteOrigin()]);
  return certificateResponse(request, await guestCertificateData(test, tenant.name, origin));
}
