import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const defaultSlug = process.env.DEFAULT_TENANT_SLUG ?? "gamify";

  await db.tenant.upsert({
    where: { slug: defaultSlug },
    create: { slug: defaultSlug, name: "Zukkolar" },
    update: { name: "Zukkolar" },
  });

  // Example study center → demo.<ROOT_DOMAIN>, with its own brand color.
  await db.tenant.upsert({
    where: { slug: "demo" },
    create: { slug: "demo", name: "Demo Academy", theme: { brand: "#0f9d76", brand2: "#22c55e" } },
    update: {},
  });

  console.log(`Seeded tenants: ${defaultSlug}, demo`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
