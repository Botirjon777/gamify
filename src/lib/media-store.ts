import "server-only";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { MEDIA_PATH, MEDIA_TYPES, type MediaExt } from "./media";

/** Dev: ./.media (git-ignored). Production: MEDIA_DIR in shared/.env, written by the deploy script. */
const MEDIA_DIR = process.env.MEDIA_DIR || join(process.cwd(), ".media");

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

/** The file behind a media path, or null (bad path / no such file). */
export async function readMedia(path: string): Promise<{ bytes: Buffer; type: string } | null> {
  if (!MEDIA_PATH.test(path)) return null;
  try {
    return { bytes: await readFile(join(MEDIA_DIR, path)), type: MEDIA_TYPES[path.slice(path.lastIndexOf(".") + 1) as MediaExt] };
  } catch {
    return null;
  }
}

/** What the bytes really are — the browser's "type" and the file name are not trusted. */
function sniff(bytes: Buffer): MediaExt | null {
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes.subarray(0, 4).toString("latin1") === "RIFF" && bytes.subarray(8, 12).toString("latin1") === "WEBP") return "webp";
  const head = bytes.subarray(0, 1024).toString("utf8").trimStart();
  if ((head.startsWith("<?xml") || head.startsWith("<svg")) && head.includes("<svg")) return "svg";
  return null;
}

/**
 * Store an uploaded picture under `folder` and return its media path. The name is the hash of the content:
 * the same picture uploaded twice is one file, and a file never changes once it has a URL.
 */
export async function saveMedia(folder: string, bytes: Buffer): Promise<string | null> {
  const ext = sniff(bytes);
  if (!ext || bytes.length > MAX_UPLOAD_BYTES) return null;
  const path = `${folder}/${createHash("sha256").update(bytes).digest("hex").slice(0, 20)}.${ext}`;
  if (!MEDIA_PATH.test(path)) return null;
  const file = join(MEDIA_DIR, path);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, bytes);
  return path;
}
