import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Locale routing only. Tenant is resolved from the Host header in server code (lib/tenant.ts),
// and auth is checked in layouts / server actions — never rely on proxy alone for security.
//
// Production note: the standalone server must run with HOSTNAME=localhost. With an IP (127.0.0.1)
// Next.js sees next-intl's rewrite (http://localhost:PORT/uz/…) as a different origin and proxies the
// request to itself over HTTP — which loops locally and fails behind HTTPS (nginx).
export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
