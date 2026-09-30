import "server-only";
import { db } from "./client";

/** Models that carry a `tenantId` column and must never be read across tenants. */
const TENANT_MODELS = new Set(["TenantDomain", "Membership", "Session", "XpEvent", "WeeklyScore"]);

/** Operations whose `where` gets `tenantId` added (unique wheres accept extra filters since Prisma 5). */
const WHERE_OPS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "delete",
  "deleteMany",
]);

type Args = { where?: object; data?: object | object[]; create?: object };

/**
 * Prisma client that automatically filters tenant-owned models by `tenantId`
 * and stamps it on creates. Use scalar ids (`userId`), not `connect`, in create data.
 */
export function forTenant(tenantId: string) {
  return db.$extends({
    name: "tenant-scope",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!TENANT_MODELS.has(model)) return query(args);
          const a = args as Args;

          if (WHERE_OPS.has(operation)) {
            a.where = { ...a.where, tenantId };
          } else if (operation === "create") {
            a.data = { ...a.data, tenantId };
          } else if (operation === "createMany" || operation === "createManyAndReturn") {
            const rows = Array.isArray(a.data) ? a.data : [a.data ?? {}];
            a.data = rows.map((row) => ({ ...row, tenantId }));
          } else if (operation === "upsert") {
            a.where = { ...a.where, tenantId };
            a.create = { ...a.create, tenantId };
          }
          return query(a);
        },
      },
    },
  });
}

export type TenantDb = ReturnType<typeof forTenant>;
