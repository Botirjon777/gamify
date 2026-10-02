/**
 * Local media store → the server. Pictures are not in git: ours are made by scripts/iq-collect.py into ./.media,
 * and this sends that folder to /srv/zukkolar/shared/media (what the app serves at /media/…).
 *   pnpm media:push          show what would be sent
 *   pnpm media:push --yes    send it
 *
 * Files are added or overwritten, never deleted: pictures uploaded in the admin panel live in the same folder.
 * The questions that point at the pictures go separately: `pnpm content:push --prod --yes`.
 */
import { execSync } from "node:child_process";
import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { MEDIA_PATH } from "../src/lib/media";
import { REMOTE, connect, exec, readEnv, sftp, upload } from "./lib/vps";

const ROOT = process.cwd();
const LOCAL = join(ROOT, ".media");
const ARCHIVE = ".media.tgz";

async function main() {
  if (!existsSync(LOCAL)) throw new Error(".media not found — nothing to send");
  const files = (readdirSync(LOCAL, { recursive: true }) as string[]).map((f) => f.replaceAll("\\", "/")).filter((f) => statSync(join(LOCAL, f)).isFile());
  // The app refuses to serve anything else, so it would only be dead weight on the server.
  const bad = files.filter((f) => !MEDIA_PATH.test(f));
  if (bad.length) throw new Error(`not media paths (lowercase folders/name.png|jpg|webp|svg): ${bad.slice(0, 5).join(", ")}`);
  const bytes = files.reduce((n, f) => n + statSync(join(LOCAL, f)).size, 0);
  console.log(`${files.length} files, ${(bytes / 1024 / 1024).toFixed(1)} MB in .media → ${REMOTE}/shared/media`);
  if (!process.argv.includes("--yes")) return console.log("Dry run — nothing was sent. Add --yes to upload.");

  const vps = readEnv(join(ROOT, ".env.vps"));
  // One archive instead of thousands of SFTP round trips. Relative paths: GNU tar would read "D:\…" as a remote host.
  execSync(`tar -czf ${ARCHIVE} -C .media .`, { cwd: ROOT, stdio: "inherit" });
  const c = await connect(vps);
  try {
    await upload(await sftp(c), join(ROOT, ARCHIVE), `/tmp/zukkolar-media.tgz`);
    await exec(
      c,
      `set -e
install -d -o zukkolar -g zukkolar -m 755 ${REMOTE}/shared/media
tar -xzf /tmp/zukkolar-media.tgz -C ${REMOTE}/shared/media --no-same-owner --no-same-permissions
rm /tmp/zukkolar-media.tgz
chown -R zukkolar:zukkolar ${REMOTE}/shared/media
chmod -R u=rwX,go=rX ${REMOTE}/shared/media
echo "on the server: $(find ${REMOTE}/shared/media -type f | wc -l) files"`,
    );
  } finally {
    c.end();
    rmSync(join(ROOT, ARCHIVE), { force: true });
  }
  console.log("✔ Sent");
}

main().catch((e) => {
  console.error(`\n✘ ${e.message}`);
  process.exit(1);
});
