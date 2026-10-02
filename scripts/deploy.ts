/**
 * Deploy Zukkolar to the VPS.
 *
 *   pnpm deploy:prod              build → upload → switch release → health check (auto-rollback on failure)
 *   pnpm deploy:prod --setup      first time: server user/folders/cert/systemd/nginx + write shared/.env
 *   pnpm deploy:prod --migrate    also apply pending Prisma migrations to the production DB
 *   pnpm deploy:prod --skip-build reuse the last build
 *   pnpm deploy:prod --dry-run    build + assemble only (test the bundle locally)
 *   pnpm deploy:prod --from-working-tree   build the current folder instead of a clean checkout of HEAD
 *
 * SSH credentials come from .env.vps (VPS_IP, VPS_SSH_PORT, VPS_SSH_USER, VPS_SSH_PASSWORD) — never committed.
 * The production DATABASE_URL comes from .env (PRODUCTION_DATABASE_URL, 127.0.0.1 → used on the server).
 *
 * Layout on the server (mirrors the hotel sites):
 *   /srv/zukkolar/releases/<id>/   one folder per deploy (last 3 kept)
 *   /srv/zukkolar/current          → symlink to the live release
 *   /srv/zukkolar/shared/.env      secrets, never overwritten by a deploy
 *   /srv/zukkolar/shared/media/    uploaded pictures (MEDIA_DIR) — filled by the admin panel and `pnpm media:push`
 */
import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { Client, SFTPWrapper } from "ssh2";
import { REMOTE, connect, exec, readEnv, sftp, upload, writeRemote } from "./lib/vps";

const ROOT = process.cwd();
const OUT = join(ROOT, ".deploy");
const APP = join(OUT, "app");
const TARBALL = join(OUT, "release.tgz");
const PORT = 3010;

const args = new Set(process.argv.slice(2));
const step = (msg: string) => console.log(`\n▶ ${msg}`);

// ─── local build ────────────────────────────────────────────────────────────

const CLEAN = join(ROOT, ".deploy-src");

/**
 * Where the release is built from. Default: a clean `git worktree` of HEAD, so production always
 * matches what is committed — uncommitted work in progress is never shipped by accident.
 * --from-working-tree builds the current folder instead (quick experiments).
 */
function prepareSource(): string {
  if (args.has("--from-working-tree")) return ROOT;
  step(`Clean checkout of HEAD (${execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim()})`);
  if (existsSync(CLEAN)) execSync(`git worktree remove --force "${CLEAN}"`, { cwd: ROOT, stdio: "inherit" });
  execSync(`git worktree add --detach "${CLEAN}" HEAD`, { cwd: ROOT, stdio: "inherit" });
  execSync("pnpm install --frozen-lockfile", { cwd: CLEAN, stdio: "inherit" });
  return CLEAN;
}

function build() {
  const SRC = args.has("--skip-build") ? (existsSync(join(CLEAN, ".next/standalone")) ? CLEAN : ROOT) : prepareSource();
  if (!args.has("--skip-build")) {
    step("Building (next build, standalone)");
    execSync("pnpm build", { cwd: SRC, stdio: "inherit", env: { ...process.env, NODE_ENV: "production" } });
  }
  step("Assembling release");
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT);
  // dereference: Turbopack links some packages from .next/node_modules — ship the real files.
  cpSync(join(SRC, ".next/standalone"), APP, { recursive: true, dereference: true });
  // Next copies .env into standalone — secrets must never ship in the bundle.
  for (const f of [".env", ".env.local", ".env.production", ".env.vps"]) rmSync(join(APP, f), { force: true });
  cpSync(join(SRC, ".next/static"), join(APP, ".next/static"), { recursive: true });
  cpSync(join(SRC, "public"), join(APP, "public"), { recursive: true });
  // Relative paths: GNU tar (Git Bash) would read "D:\…" as a remote host.
  execSync("tar -czf release.tgz -C app .", { stdio: "inherit", cwd: OUT });
  console.log(`  ${(readFileSync(TARBALL).length / 1024 / 1024).toFixed(1)} MB`);
}

// ─── steps ──────────────────────────────────────────────────────────────────

async function setup(c: Client, s: SFTPWrapper) {
  step("Server setup (user, folders, certificate, systemd, nginx)");
  await exec(c, "mkdir -p /tmp/zukkolar-setup", { quiet: true });
  for (const f of ["setup-server.sh", "zukkolar.service", "nginx-zukkolar.conf"]) {
    await upload(s, join(ROOT, "deploy", f), `/tmp/zukkolar-setup/${f}`);
  }
  await exec(c, "bash /tmp/zukkolar-setup/setup-server.sh && rm -rf /tmp/zukkolar-setup");

  // shared/.env — written once; later edits on the server are kept.
  const exists = await exec(c, `test -f ${REMOTE}/shared/.env && echo yes || echo no`, { quiet: true });
  if (exists.trim() === "yes" && !args.has("--force-env")) {
    console.log("  shared/.env exists — kept (use --force-env to overwrite)");
    return;
  }
  const local = readEnv(join(ROOT, ".env"));
  if (!local.PRODUCTION_DATABASE_URL) throw new Error("PRODUCTION_DATABASE_URL missing in .env");
  const env = [
    "NODE_ENV=production",
    `PORT=${PORT}`,
    // Must be "localhost" (not 127.0.0.1) — see src/proxy.ts. On this VPS localhost resolves to 127.0.0.1 only.
    "HOSTNAME=localhost",
    `DATABASE_URL="${local.PRODUCTION_DATABASE_URL}"`,
    "DATABASE_POOL_MAX=5",
    "ROOT_DOMAIN=zukkolar.uz",
    "DEFAULT_TENANT_SLUG=gamify",
    "FEATURE_SMS_OTP=false",
    "FEATURE_REDIS=false",
    `MEDIA_DIR=${REMOTE}/shared/media`,
    "",
  ].join("\n");
  await writeRemote(s, `${REMOTE}/shared/.env`, env, 0o600);
  await exec(c, `chown zukkolar:zukkolar ${REMOTE}/shared/.env && chmod 600 ${REMOTE}/shared/.env`, { quiet: true });
  console.log("  shared/.env written (600, owner zukkolar)");
}

function migrate(vps: Record<string, string>) {
  step("Applying Prisma migrations to production");
  const local = readEnv(join(ROOT, ".env"));
  const url = new URL(local.PRODUCTION_DATABASE_URL);
  url.hostname = vps.PG_HOST ?? vps.VPS_IP; // remote access from this machine (pg_hba allows it over SSL)
  url.searchParams.set("sslmode", "require");
  execSync("pnpm prisma migrate deploy", { stdio: "inherit", env: { ...process.env, DATABASE_URL: url.toString() } });
}

async function release(c: Client, s: SFTPWrapper) {
  const id = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  step(`Uploading release ${id}`);
  await upload(s, TARBALL, `${REMOTE}/releases/${id}.tgz`);

  step("Switching release + health check");
  await exec(
    c,
    `set -e
cd ${REMOTE}
mkdir releases/${id}
tar -xzf releases/${id}.tgz -C releases/${id} && rm releases/${id}.tgz
chown -R zukkolar:zukkolar releases/${id}
# Media store: outside the releases, so pictures survive a deploy. Servers set up before it existed get it here.
install -d -o zukkolar -g zukkolar -m 755 shared/media
grep -q '^MEDIA_DIR=' shared/.env || echo 'MEDIA_DIR=${REMOTE}/shared/media' >> shared/.env
# Previous release (only if "current" is a real symlink to an existing directory)
PREV=""
if [ -L current ] && [ -d "$(readlink current)" ]; then PREV=$(readlink current); fi
ln -sfn ${REMOTE}/releases/${id} current
systemctl restart zukkolar
ok=0
for i in $(seq 1 30); do
  if curl -fsS -o /dev/null -H "Host: zukkolar.uz" -H "X-Forwarded-Proto: https" http://127.0.0.1:${PORT}/login; then ok=1; break; fi
  sleep 1
done
if [ "$ok" != 1 ]; then
  echo "✘ health check failed — rolling back"
  journalctl -u zukkolar -n 30 --no-pager || true
  if [ -n "$PREV" ] && [ "$PREV" != "${REMOTE}/releases/${id}" ]; then
    ln -sfn "$PREV" current; systemctl restart zukkolar; echo "rolled back to $PREV"
  else
    echo "no previous release to roll back to"
  fi
  exit 1
fi
echo "✔ healthy: $(curl -s -o /dev/null -w '%{http_code}' -H 'Host: zukkolar.uz' http://127.0.0.1:${PORT}/) on :${PORT}"
# keep the 3 newest releases
ls -1dt releases/*/ | tail -n +4 | xargs -r rm -rf
echo "releases: $(ls releases | tr '\\n' ' ')"`,
  );
}

async function main() {
  const vps = readEnv(join(ROOT, ".env.vps"));
  build();
  if (args.has("--dry-run")) return console.log(`
✔ Dry run: release assembled in ${APP}`);
  if (args.has("--migrate")) migrate(vps);

  step(`Connecting to ${vps.VPS_IP}`);
  const c = await connect(vps);
  try {
    const s = await sftp(c);
    if (args.has("--setup")) await setup(c, s);
    await release(c, s);
  } finally {
    c.end();
  }
  console.log("\n✔ Deployed");
}

main().catch((e) => {
  console.error(`\n✘ ${e.message}`);
  process.exit(1);
});
