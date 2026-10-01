/**
 * Build the web assets from the source logo (design/zukkolar-logo.png, 500×500 transparent PNG):
 *   pnpm tsx scripts/logo-assets.ts
 *
 *   public/brand/logo-mark-{96,192}.webp   emblem only (headers, sidebar) — square, transparent
 *   public/brand/logo-full-320.webp       emblem + wordmark (footer) — the source is only 319 px wide
 *   src/app/favicon.ico                    16 / 32 px: brain + book on a white tile; 48 px: full emblem
 *   src/app/icon.png                       192 px, emblem (Android, PWA)
 *   src/app/apple-icon.png                 180 px, emblem on white (iOS shows transparency as black)
 */
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const SRC = join(process.cwd(), "design", "zukkolar-logo.png");
const OUT = join(process.cwd(), "public", "brand");
const APP = join(process.cwd(), "src", "app");

/** Rows of the emblem inside the source image (the wordmark starts at y=345). */
const EMBLEM = { top: 89, bottom: 307 };

const kb = (file: string) => `${(statSync(file).size / 1024).toFixed(1)} kB`;

/** Emblem cut out, trimmed and centred on a transparent square with a little breathing room. */
async function emblemSquare(size: number, padding = 0.04, background = { r: 0, g: 0, b: 0, alpha: 0 }) {
  const meta = await sharp(SRC).metadata();
  // Two steps: within one sharp pipeline trim runs before extract, whatever the call order.
  const band = await sharp(SRC)
    .extract({ left: 0, top: EMBLEM.top, width: meta.width!, height: EMBLEM.bottom - EMBLEM.top })
    .toBuffer();
  const cut = await sharp(band).trim().toBuffer();
  const inner = Math.round(size * (1 - padding * 2));
  const resized = await sharp(cut).resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  const pad = Math.floor((size - inner) / 2);
  return sharp(resized).extend({ top: pad, bottom: size - inner - pad, left: pad, right: size - inner - pad, background });
}

/** Brain + book, the part that still reads at 16 px. */
const TILE_CROP = { left: 172, top: 126, width: 180, height: 180 };

/** Tiny sizes: the centre of the emblem on a white rounded tile (the full emblem turns to mush at 16 px). */
async function tile(size: number) {
  const art = await sharp(SRC).extract(TILE_CROP).resize(size, size, { kernel: "lanczos3" }).flatten({ background: "#ffffff" }).toBuffer();
  const r = Math.round(size * 0.22);
  const mask = Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}" ry="${r}"/></svg>`);
  return sharp(art).ensureAlpha().composite([{ input: mask, blend: "dest-in" }]);
}

/** ICO container with PNG-compressed images (supported by every current browser). */
function ico(images: { size: number; png: Buffer }[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + images.length * 16;
  const entries = images.map(({ size, png }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt16LE(1, 4); // colour planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += png.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...images.map((i) => i.png)]);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const report: string[] = [];

  for (const size of [96, 192]) {
    const file = join(OUT, `logo-mark-${size}.webp`);
    await (await emblemSquare(size, 0)).webp({ quality: 86, effort: 6 }).toFile(file);
    report.push(`${file.replace(process.cwd(), ".")}  ${kb(file)}`);
  }

  const full = await sharp(SRC).trim().toBuffer();
  for (const width of [320]) {
    const file = join(OUT, `logo-full-${width}.webp`);
    await sharp(full).resize({ width, kernel: "lanczos3" }).webp({ quality: 86, effort: 6 }).toFile(file);
    report.push(`${file.replace(process.cwd(), ".")}  ${kb(file)}`);
  }

  const pngs = await Promise.all(
    [16, 32, 48].map(async (size) => ({
      size,
      png: await (size < 48 ? await tile(size) : await emblemSquare(size, 0)).png({ compressionLevel: 9 }).toBuffer(),
    })),
  );
  writeFileSync(join(APP, "favicon.ico"), ico(pngs));
  await (await emblemSquare(192, 0.04)).png({ compressionLevel: 9, palette: true }).toFile(join(APP, "icon.png"));
  await (await emblemSquare(180, 0.1, { r: 255, g: 255, b: 255, alpha: 1 })).flatten({ background: "#ffffff" }).png({ compressionLevel: 9, palette: true }).toFile(join(APP, "apple-icon.png"));
  for (const f of ["favicon.ico", "icon.png", "apple-icon.png"]) report.push(`./src/app/${f}  ${kb(join(APP, f))}`);

  console.log(`source  ${kb(SRC)}\n` + report.join("\n"));
}

void main();
