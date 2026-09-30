import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Locale routing only. Tenant is resolved from the Host header in server code (lib/tenant.ts),
// and auth is checked in layouts / server actions — never rely on proxy alone for security.
export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
