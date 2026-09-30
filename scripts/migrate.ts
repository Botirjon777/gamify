/**
 * `pnpm db:migrate --name add_x` → `prisma migrate dev --name add_x` + `prisma generate`
 * (Prisma 7 no longer generates the client after migrate dev.) Dev databases only.
 */
import { spawnSync } from "node:child_process";

const run = (args: string[]) => {
  const { status } = spawnSync("prisma", args, { stdio: "inherit", shell: true });
  if (status !== 0) process.exit(status ?? 1);
};

run(["migrate", "dev", ...process.argv.slice(2)]);
run(["generate"]);
