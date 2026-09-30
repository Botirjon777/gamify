/**
 * Manually set a user's plan until payments (Click / Payme) are integrated.
 *   pnpm plan:set <username> <FREE|PRO|DIAMOND> [days=30]
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const [username, plan, daysArg] = process.argv.slice(2);
if (!username || !["FREE", "PRO", "DIAMOND"].includes(plan ?? "")) {
  console.error("Usage: pnpm plan:set <username> <FREE|PRO|DIAMOND> [days=30]");
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const days = Number(daysArg ?? 30);

db.user
  .update({
    where: { username: username.toLowerCase() },
    data: {
      plan: plan as "FREE" | "PRO" | "DIAMOND",
      planExpiresAt: plan === "FREE" ? null : new Date(Date.now() + days * 24 * 60 * 60 * 1000),
    },
  })
  .then((u) => console.log(`✔ ${u.username}: ${u.plan}${u.planExpiresAt ? ` until ${u.planExpiresAt.toISOString().slice(0, 10)}` : ""}`))
  .catch((e) => {
    console.error("✘", e.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
