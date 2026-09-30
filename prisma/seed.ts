import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { randomBytes } from "node:crypto";
import { argon2id } from "hash-wasm";
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

  // Platform admin — created once; re-running the seed never resets its password.
  const email = (process.env.ADMIN_EMAIL ?? "admin@zukkolar.uz").toLowerCase();
  if (await db.user.findUnique({ where: { email } })) {
    console.log(`Admin ${email} already exists — unchanged`);
  } else {
    const main = await db.tenant.findUniqueOrThrow({ where: { slug: defaultSlug } });
    const passwordHash = await argon2id({
      password: process.env.ADMIN_PASSWORD ?? "admin123",
      salt: randomBytes(16),
      parallelism: 1,
      iterations: 2,
      memorySize: 19456,
      hashLength: 32,
      outputType: "encoded",
    });
    await db.user.create({
      data: {
        email,
        username: "admin",
        passwordHash,
        // The default password is weak — the app keeps asking to change it until it is.
        mustChangePassword: true,
        isSuperAdmin: true,
        avatarSeed: "admin",
        avatarStyle: "bottts",
        memberships: { create: { tenantId: main.id, role: "OWNER" } },
      },
    });
    console.log(`Admin ${email} created (change the password after first login!)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
