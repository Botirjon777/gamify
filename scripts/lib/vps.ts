/** SSH access to the VPS for the deploy and media scripts. Credentials: .env.vps (never committed). */
import { existsSync, readFileSync } from "node:fs";
import { parse } from "dotenv";
import { Client, type SFTPWrapper } from "ssh2";

export const REMOTE = "/srv/zukkolar";

export function readEnv(file: string) {
  if (!existsSync(file)) throw new Error(`${file} not found`);
  return parse(readFileSync(file));
}

export function connect(vps: Record<string, string>): Promise<Client> {
  return new Promise((resolve, reject) => {
    const c = new Client();
    c.on("ready", () => resolve(c))
      .on("error", reject)
      .connect({
        host: vps.VPS_IP,
        port: Number(vps.VPS_SSH_PORT ?? 22),
        username: vps.VPS_SSH_USER,
        password: vps.VPS_SSH_PASSWORD,
        readyTimeout: 20_000,
      });
  });
}

export function exec(c: Client, cmd: string, { quiet = false } = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    c.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      stream
        .on("close", (code: number) => (code === 0 ? resolve(out) : reject(new Error(`remote command failed (${code})\n${out}`))))
        .on("data", (d: Buffer) => {
          out += d;
          if (!quiet) process.stdout.write(d);
        })
        .stderr.on("data", (d: Buffer) => {
          out += d;
          if (!quiet) process.stderr.write(d);
        });
    });
  });
}

export const sftp = (c: Client) => new Promise<SFTPWrapper>((res, rej) => c.sftp((e, s) => (e ? rej(e) : res(s))));

export function upload(s: SFTPWrapper, local: string, remote: string) {
  return new Promise<void>((res, rej) => s.fastPut(local, remote, (e) => (e ? rej(e) : res())));
}

export function writeRemote(s: SFTPWrapper, remote: string, content: string, mode: number) {
  return new Promise<void>((res, rej) => s.writeFile(remote, content, { mode }, (e) => (e ? rej(e) : res())));
}
