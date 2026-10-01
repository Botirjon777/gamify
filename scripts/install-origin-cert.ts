/**
 * Install a Cloudflare Origin certificate on the VPS (for Cloudflare SSL mode "Full (strict)").
 *
 *   pnpm tsx scripts/install-origin-cert.ts <cert.pem> <key.pem>
 *
 * Keep the PEM files outside the repo. The current certificate is backed up (*.bak) and restored
 * automatically if the key doesn't match or `nginx -t` fails.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "dotenv";
import { Client } from "ssh2";

const DIR = "/etc/ssl/zukkolar";
const [certFile, keyFile] = process.argv.slice(2);
if (!certFile || !keyFile) throw new Error("usage: install-origin-cert.ts <cert.pem> <key.pem>");
const cert = readFileSync(certFile, "utf8").replace(/\r\n/g, "\n");
const key = readFileSync(keyFile, "utf8").replace(/\r\n/g, "\n");
if (!cert.includes("BEGIN CERTIFICATE") || !key.includes("PRIVATE KEY")) throw new Error("not a PEM certificate/key pair");

const vps = parse(readFileSync(join(process.cwd(), ".env.vps")));
const c = new Client();

function exec(cmd: string): Promise<{ code: number; out: string }> {
  return new Promise((resolve, reject) =>
    c.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      stream.on("data", (d: Buffer) => (out += d)).stderr.on("data", (d: Buffer) => (out += d));
      stream.on("close", (code: number) => resolve({ code, out: out.trim() }));
    }),
  );
}

c.on("ready", async () => {
  try {
    // Heredocs keep the key off the command line (no ps / shell history exposure).
    const script = `set -e
cd ${DIR}
cp -p zukkolar.uz.pem zukkolar.uz.pem.bak; cp -p zukkolar.uz.key zukkolar.uz.key.bak
umask 077
cat > zukkolar.uz.pem.new <<'PEM'
${cert.trim()}
PEM
cat > zukkolar.uz.key.new <<'PEM'
${key.trim()}
PEM
a=$(openssl x509 -noout -pubkey -in zukkolar.uz.pem.new | sha256sum); b=$(openssl pkey -pubout -in zukkolar.uz.key.new | sha256sum)
[ "$a" = "$b" ] || { rm -f *.new; echo "certificate and key do not match"; exit 3; }
mv zukkolar.uz.pem.new zukkolar.uz.pem; mv zukkolar.uz.key.new zukkolar.uz.key
chmod 644 zukkolar.uz.pem; chmod 600 zukkolar.uz.key
if nginx -t 2>&1; then systemctl reload nginx; echo RELOADED; else mv zukkolar.uz.pem.bak zukkolar.uz.pem; mv zukkolar.uz.key.bak zukkolar.uz.key; echo "nginx -t failed, restored old certificate"; exit 4; fi
openssl x509 -noout -subject -issuer -enddate -ext subjectAltName -in zukkolar.uz.pem`;
    const r = await exec(`bash -s <<'OUTER'\n${script}\nOUTER`);
    console.log(r.out);
    process.exitCode = r.code;
  } finally {
    c.end();
  }
});
c.connect({ host: vps.VPS_IP, port: Number(vps.VPS_SSH_PORT || 22), username: vps.VPS_SSH_USER, password: vps.VPS_SSH_PASSWORD });
