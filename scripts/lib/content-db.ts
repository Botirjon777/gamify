/** Database connection for the content scripts: the local dev database, or production with `--prod`. */
import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";

export const CONTENT_DIR = join(process.cwd(), "content");

export function connect(prod: boolean): { db: PrismaClient; target: string } {
  let connectionString = process.env.DATABASE_URL;
  if (prod) {
    // Same route as `deploy:prod --migrate`: the production URL in .env points at 127.0.0.1 (for the app on
    // the server); from this machine the host is the server itself, over SSL.
    if (!process.env.PRODUCTION_DATABASE_URL) throw new Error("PRODUCTION_DATABASE_URL missing in .env");
    const vpsFile = join(process.cwd(), ".env.vps");
    const vps = existsSync(vpsFile) ? parse(readFileSync(vpsFile)) : {};
    const host = vps.PG_HOST ?? vps.VPS_IP;
    if (!host) throw new Error("PG_HOST / VPS_IP missing in .env.vps");
    const url = new URL(process.env.PRODUCTION_DATABASE_URL);
    url.hostname = host;
    url.searchParams.set("sslmode", "require");
    connectionString = url.toString();
  }
  if (!connectionString) throw new Error("DATABASE_URL missing in .env");
  const { hostname, pathname } = new URL(connectionString);
  return {
    db: new PrismaClient({ adapter: new PrismaPg({ connectionString }) }),
    target: `${prod ? "PRODUCTION" : "local"} database (${hostname}${pathname})`,
  };
}
