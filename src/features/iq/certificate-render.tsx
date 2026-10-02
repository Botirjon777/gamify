import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { PDFDocument } from "pdf-lib";
import QRCode from "qrcode";
import { certificateFileName, contentDisposition, nameStyle, typeset } from "./certificate-text";

/**
 * The IQ certificate: one A4 landscape picture, drawn over the artwork in public/certificate/background.png,
 * and the same picture as a one-page PDF. Used for the test without registration and for signed-in users.
 *
 * Layout numbers are the template's own, in px at 96 dpi (page 1123 × 794); the picture is rendered at twice that.
 */
export interface CertificateData {
  name: string;
  iq: number;
  percentile: number;
  /** "2-oktabr, 2026-yil" */
  date: string;
  /** What identifies the certificate: "№ ABC123" for a guest test, "@username" for a user. */
  number: string;
  /** Whose test it is: "Zukkolar", or a study centre's name. */
  site: string;
  /** The page that confirms the certificate; it is what the QR code opens. */
  verifyUrl: string;
  text: {
    title: string;
    subtitle: string;
    presented: string;
    /** May contain line breaks. */
    body: string;
    dateLabel: string;
    numberLabel: string;
    scan: string;
    disclaimer: string;
  };
}

const PAGE = { width: 1123, height: 794 };
const SCALE = 2;
const INK = "#372537";
const GOLD = "#A27430";

type Font = { name: string; data: ArrayBuffer; weight: 400 | 700 | 800; style: "normal" };
const file = async (...path: string[]) => {
  const buffer = await readFile(join(process.cwd(), "public", ...path));
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
};

let assets: Promise<{ fonts: Font[]; background: string }> | undefined;
/**
 * Fonts and artwork, read once. The template's faces first; then PT Serif for names in Cyrillic, which they lack;
 * Inter last, for anything else.
 */
const loadAssets = () =>
  (assets ??= (async () => {
    const [script, serif, serifBold, names, background, ...inter] = await Promise.all([
      file("fonts", "certificate", "Parisienne-Regular.ttf"),
      file("fonts", "certificate", "texgyretermes-regular.otf"),
      file("fonts", "certificate", "texgyretermes-bold.otf"),
      file("fonts", "certificate", "PTSerif-BoldItalic.ttf"),
      file("certificate", "background.png"),
      ...(["latin-ext", "cyrillic"] as const).flatMap((subset) => ([800, 400] as const).map((weight) => file("fonts", "og", `inter-${subset}-${weight}-normal.woff`).then((data) => ({ name: "Inter", data, weight, style: "normal" as const })))),
    ]);
    return {
      fonts: [
        { name: "Script", data: script, weight: 400, style: "normal" },
        { name: "Serif", data: serif, weight: 400, style: "normal" },
        { name: "Serif", data: serifBold, weight: 700, style: "normal" },
        { name: "Names", data: names, weight: 700, style: "normal" },
        ...inter,
      ] satisfies Font[],
      background: `data:image/png;base64,${Buffer.from(background).toString("base64")}`,
    };
  })());

/** A box placed by the template's coordinates. */
function Box({ x, y, w, h, children, style }: { x: number; y: number; w: number; h?: number; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{ position: "absolute", left: x * SCALE, top: y * SCALE, width: w * SCALE, ...(h && { height: h * SCALE }), display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", ...style }}
    >
      {children}
    </div>
  );
}

const px = (n: number) => Math.round(n * SCALE);

export async function certificatePng(data: CertificateData): Promise<ArrayBuffer> {
  const { fonts, background } = await loadAssets();
  const qr = `data:image/svg+xml;utf8,${encodeURIComponent(await QRCode.toString(data.verifyUrl, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: INK, light: "#ffffff" } }))}`;
  const { text } = data;
  const name = typeset(data.name);
  const named = nameStyle(name);
  /** A value above a thin line with its label under it (where the template has its signatures). */
  const slot = (x: number, value: string, label: string) => (
    <Box x={x} y={626} w={204}>
      <div style={{ display: "flex", fontSize: px(21), color: INK }}>{typeset(value)}</div>
      <div style={{ display: "flex", width: "100%", height: px(1), background: GOLD, marginTop: px(6) }} />
      <div style={{ display: "flex", fontSize: px(11.5), letterSpacing: px(1.5), color: GOLD, marginTop: px(6) }}>{typeset(label).toUpperCase()}</div>
    </Box>
  );

  const image = new ImageResponse(
    (
      <div style={{ position: "relative", display: "flex", width: "100%", height: "100%", background: "#ffffff", fontFamily: "Serif", color: INK }}>
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- rendered to a PNG by satori, not to the DOM */}
        <img src={background} width={PAGE.width * SCALE} height={PAGE.height * SCALE} style={{ position: "absolute", left: 0, top: 0 }} />

        <Box x={261} y={70} w={600}>
          <div style={{ display: "flex", fontSize: px(15), letterSpacing: px(6), color: GOLD }}>{typeset(data.site).toUpperCase()}</div>
          <div style={{ display: "flex", fontSize: px(72), fontWeight: 700, letterSpacing: px(5), lineHeight: 1.1, marginTop: px(4) }}>{typeset(text.title).toUpperCase()}</div>
          <div style={{ display: "flex", fontSize: px(27), letterSpacing: px(7), marginTop: px(2) }}>{typeset(text.subtitle).toUpperCase()}</div>
        </Box>

        <Box x={261} y={266} w={600}>
          <div style={{ display: "flex", fontSize: px(18), letterSpacing: px(2.5) }}>{typeset(text.presented).toUpperCase()}</div>
        </Box>

        {/* The name sits on the divider line of the artwork (y = 462). */}
        <Box x={177} y={294} w={768} h={156} style={{ justifyContent: "flex-end" }}>
          <div style={{ display: "flex", color: GOLD, lineHeight: 1.25, whiteSpace: "nowrap", ...named, fontSize: px(named.fontSize) }}>{name}</div>
        </Box>

        <Box x={229} y={490} w={664}>
          <div style={{ display: "flex", fontSize: px(19), lineHeight: 1.45, whiteSpace: "pre-wrap", justifyContent: "center", textAlign: "center" }}>{typeset(text.body)}</div>
        </Box>

        {/* The score, on the ribbon. */}
        <Box x={896} y={50} w={124} h={122}>
          <div style={{ display: "flex", fontSize: px(20), fontWeight: 700, letterSpacing: px(4), color: "#ffffff" }}>IQ</div>
          <div style={{ display: "flex", fontSize: px(58), fontWeight: 700, lineHeight: 1, color: "#ffffff", marginTop: px(2) }}>{data.iq}</div>
        </Box>

        {slot(232, data.date, text.dateLabel)}
        {slot(686, data.number, text.numberLabel)}

        <Box x={501} y={578} w={120}>
          {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- as above */}
          <img src={qr} width={px(96)} height={px(96)} />
          <div style={{ display: "flex", fontSize: px(10.5), color: INK, marginTop: px(5), whiteSpace: "nowrap" }}>{typeset(text.scan)}</div>
          <div style={{ display: "flex", fontSize: px(10.5), fontWeight: 700, color: INK, whiteSpace: "nowrap" }}>{data.verifyUrl.replace(/^https?:\/\//, "")}</div>
        </Box>

        <Box x={261} y={746} w={600}>
          <div style={{ display: "flex", fontSize: px(10.5), color: "#857a86", whiteSpace: "nowrap" }}>{typeset(text.disclaimer)}</div>
        </Box>
      </div>
    ),
    { width: PAGE.width * SCALE, height: PAGE.height * SCALE, fonts },
  );
  return image.arrayBuffer();
}

/** The picture on one A4 landscape page. */
export async function certificatePdf(data: CertificateData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${data.text.title} — ${data.name}`);
  pdf.setAuthor(data.site);
  pdf.setSubject(`${data.text.subtitle}: ${data.iq}`);
  pdf.setKeywords([data.number, data.verifyUrl]);
  const A4 = { width: 841.89, height: 595.28 };
  const page = pdf.addPage([A4.width, A4.height]);
  page.drawImage(await pdf.embedPng(await certificatePng(data)), { x: 0, y: 0, ...A4 });
  return pdf.save();
}

/**
 * The certificate as a response: `?format=pdf` → the PDF (with `&download=1` saved as a file), otherwise the picture.
 * Personal, so it is cached only by the person's own browser.
 */
export async function certificateResponse(request: Request, data: CertificateData): Promise<Response> {
  const query = new URL(request.url).searchParams;
  const pdf = query.get("format") === "pdf";
  const name = `${certificateFileName(data)}.${pdf ? "pdf" : "png"}`;
  const body = pdf ? await certificatePdf(data) : await certificatePng(data);
  return new Response(body as BodyInit, {
    headers: {
      "Content-Type": pdf ? "application/pdf" : "image/png",
      "Content-Disposition": contentDisposition(name, query.has("download")),
      "Cache-Control": "private, max-age=300",
      "X-Robots-Tag": "noindex",
    },
  });
}
