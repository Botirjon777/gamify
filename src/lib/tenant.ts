import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";

const ROOT_DOMAIN = (process.env.ROOT_DOMAIN ?? "localhost:3000").toLowerCase();
export const DEFAULT_TENANT_SLUG = process.env.DEFAULT_TENANT_SLUG ?? "gamify";

/**
 * Host → tenant lookup:
 *   zukkolar.uz / www.zukkolar.uz → default tenant
 *   najot.zukkolar.uz           → { slug: "najot" }
 *   anything else             → custom domain (TenantDomain)
 */
export function parseHost(host: string): { slug: string } | { domain: string } {
  const h = host.toLowerCase();
  if (h === ROOT_DOMAIN || h === `www.${ROOT_DOMAIN}`) return { slug: DEFAULT_TENANT_SLUG };
  if (h.endsWith(`.${ROOT_DOMAIN}`)) return { slug: h.slice(0, -(ROOT_DOMAIN.length + 1)) };
  return { domain: h.split(":")[0] };
}

/** Current tenant for this request (deduplicated per request). 404s on unknown / inactive tenants. */
export const getCurrentTenant = cache(async () => {
  const host = (await headers()).get("host") ?? ROOT_DOMAIN;
  const parsed = parseHost(host);

  const tenant =
    "slug" in parsed
      ? await db.tenant.findUnique({ where: { slug: parsed.slug } })
      : (await db.tenantDomain.findUnique({ where: { domain: parsed.domain }, include: { tenant: true } }))
          ?.tenant;

  if (!tenant || !tenant.isActive) notFound();
  return tenant;
});

export const isDefaultTenant = (tenant: { slug: string }) => tenant.slug === DEFAULT_TENANT_SLUG;
