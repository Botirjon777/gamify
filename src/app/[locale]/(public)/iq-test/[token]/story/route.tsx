import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import QRCode from "qrcode";
import { siteOrigin } from "@/lib/site-url";
import { getCurrentTenant } from "@/lib/tenant";
import { guestCertificate, guestShareUrl, guestTestByToken } from "@/features/iq/guest";

/**
 * The result as a picture, for sharing:
 *   /iq-test/<token>/story            1080×1920 — an Instagram / Telegram story
 *   /iq-test/<token>/story?format=og  1200×630  — the link preview in chats
 * Both carry the person's referral link (text + QR code): stories have no clickable links by default.
 * Only for paid tests (before that there is nothing to show).
 */

// Inter, bundled (public/fonts/og): Latin incl. oʻ gʻ, and Cyrillic for names typed that way.
// Bold files first: a glyph missing from the Latin file (a Cyrillic name) falls back to the first file that has it,
// and names are set in bold.
const FONT_FILES = ([800, 400] as const).flatMap((weight) => (["latin", "latin-ext", "cyrillic"] as const).map((subset) => ({ subset, weight })));
let fonts: Promise<{ name: string; data: ArrayBuffer; weight: 400 | 800; style: "normal" }[]> | undefined;
const loadFonts = () =>
  (fonts ??= Promise.all(
    FONT_FILES.map(async ({ subset, weight }) => {
      const file = await readFile(join(process.cwd(), "public", "fonts", "og", `inter-${subset}-${weight}-normal.woff`));
      return { name: "Inter", data: file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer, weight, style: "normal" as const };
    }),
  ));

const BRAND = "linear-gradient(160deg, #6d4aff 0%, #a855f7 55%, #d946ef 100%)";

export async function GET(request: Request, { params }: RouteContext<"/[locale]/iq-test/[token]/story">) {
  const { token } = await params;
  const test = await guestTestByToken(token);
  if (!test?.paidAt) return new Response("Not found", { status: 404 });

  const og = new URL(request.url).searchParams.get("format") === "og";
  const [t, tenant, origin] = await Promise.all([getTranslations({ locale: "uz", namespace: "guestIq.share" }), getCurrentTenant(), siteOrigin()]);
  const result = guestCertificate(test);
  const link = guestShareUrl(origin, test.code);
  const qr = `data:image/svg+xml;utf8,${encodeURIComponent(await QRCode.toString(link, { type: "svg", margin: 1, errorCorrectionLevel: "M" }))}`;
  const shown = link.replace(/^https?:\/\//, "");
  const size = og ? { width: 1200, height: 630 } : { width: 1080, height: 1920 };
  // One unit = 1px on the story; the wide preview is smaller.
  const u = (px: number) => Math.round(px * (og ? 0.55 : 1));

  const score = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "#ffffff", borderRadius: u(64), padding: `${u(56)}px ${u(72)}px`, color: "#14122b" }}>
      <div style={{ display: "flex", fontSize: u(54), fontWeight: 800, textAlign: "center" }}>{result.name}</div>
      <div style={{ display: "flex", fontSize: u(34), color: "#6b6883", marginTop: u(12) }}>{t("imageLabel")}</div>
      <div style={{ display: "flex", fontSize: u(300), fontWeight: 800, lineHeight: 1, color: "#6d4aff", marginTop: u(8) }}>{result.iq}</div>
      <div style={{ display: "flex", fontSize: u(38), fontWeight: 800, marginTop: u(16) }}>{t("imagePercentile", { percentile: result.percentile })}</div>
    </div>
  );
  const invite = (
    <div style={{ display: "flex", flexDirection: og ? "column" : "row", alignItems: "center", gap: u(40) }}>
      {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- rendered to a PNG by satori, not to the DOM */}
      <img src={qr} width={u(og ? 400 : 260)} height={u(og ? 400 : 260)} style={{ borderRadius: u(28), background: "#ffffff" }} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: og ? "center" : "flex-start" }}>
        <div style={{ display: "flex", fontSize: u(og ? 52 : 58), fontWeight: 800 }}>{t("imageInvite")}</div>
        <div style={{ display: "flex", fontSize: u(og ? 34 : 36), marginTop: u(12), opacity: 0.92 }}>{shown}</div>
      </div>
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: og ? "row" : "column",
          alignItems: "center",
          justifyContent: "space-between",
          background: BRAND,
          color: "#ffffff",
          fontFamily: "Inter",
          padding: og ? "48px 64px" : "140px 80px 150px",
        }}
      >
        {!og && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ display: "flex", fontSize: 64, fontWeight: 800, letterSpacing: 6 }}>{tenant.name.toUpperCase()}</div>
            <div style={{ display: "flex", fontSize: 40, marginTop: 10, opacity: 0.9 }}>{t("imageTitle")}</div>
          </div>
        )}
        {score}
        {invite}
      </div>
    ),
    { ...size, fonts: await loadFonts(), headers: { "Cache-Control": "public, max-age=300" } },
  );
}
