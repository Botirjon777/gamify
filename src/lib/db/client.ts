import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    // Local `prisma dev` (PGlite) can't handle parallel connections → set DATABASE_POOL_MAX=1 there.
    max: Number(process.env.DATABASE_POOL_MAX) || undefined,
  });
  return new PrismaClient({ adapter });
}

/** Unscoped client. Prefer `forTenant(tenantId)` for tenant-owned data. */
export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
