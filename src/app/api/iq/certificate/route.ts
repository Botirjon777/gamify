import { getTranslations } from "next-intl/server";
import { getCurrentSession } from "@/lib/auth/session";
import { iqCertificateAccess } from "@/features/iq/certificate";
import { iqFromRating, iqPercentile } from "@/features/iq/rating";

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/**
 * The user's IQ certificate as a standalone printable page (the "Print / save as PDF" button opens the
 * browser's print dialog). Only for users who unlocked it — see iqCertificateAccess.
 */
export async function GET() {
  const current = await getCurrentSession();
  // Relative: behind the reverse proxy the request URL is the internal one.
  if (!current) return new Response(null, { status: 303, headers: { Location: "/login" } });
  const { user, tenant } = current;
  if (!(await iqCertificateAccess(user)).unlocked) return new Response("Forbidden", { status: 403 });
  if (!user.iqTestedAt) return new Response("Not found", { status: 404 });

  const t = await getTranslations({ locale: user.locale, namespace: "iq.certificate" });
  const iq = iqFromRating(user.iqRating);
  const date = user.iqTestedAt.toLocaleDateString("uz-UZ", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Tashkent" });
  // Everything interpolated below is escaped: the center name is set by its admins.
  const site = escapeHtml(tenant.name);
  const username = escapeHtml(user.username);

  const html = `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>${escapeHtml(t("title"))} — ${username}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1.5rem;
      background: #f6f5fb;
      color: #14122b;
      padding: 2rem;
    }
    .cert { width: 700px; max-width: 100%; background: #fff; border-radius: 2rem; box-shadow: 0 24px 64px -16px rgba(0,0,0,0.12); overflow: hidden; }
    .head { background: linear-gradient(135deg, #6d4aff 0%, #d946ef 100%); color: #fff; padding: 2.5rem; text-align: center; }
    .head .site { font-size: 1.1rem; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; opacity: 0.9; }
    .head h1 { font-size: 1.6rem; font-weight: 600; margin-top: 0.5rem; }
    .body { padding: 2rem 2.5rem; text-align: center; }
    .username { font-size: 1.4rem; font-weight: 800; }
    .score { font-size: 6rem; font-weight: 800; color: #6d4aff; line-height: 1; margin: 1rem 0; }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-top: 1.5rem; }
    .stat { background: #f6f5fb; border-radius: 1rem; padding: 1rem; }
    .label { font-size: 0.75rem; color: #6b6883; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
    .value { font-size: 1.2rem; font-weight: 800; margin-top: 0.25rem; }
    .foot { padding: 0 2.5rem 2rem; text-align: center; font-size: 0.8rem; color: #6b6883; line-height: 1.6; }
    button { font: inherit; font-weight: 700; color: #fff; background: #6d4aff; border: 0; border-radius: 0.75rem; padding: 0.75rem 1.5rem; cursor: pointer; }
    @media print {
      body { background: #fff; padding: 0; }
      .cert { box-shadow: none; }
      .head, .stat { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      button { display: none; }
    }
  </style>
</head>
<body>
  <div class="cert">
    <div class="head">
      <div class="site">${site}</div>
      <h1>${escapeHtml(t("title"))}</h1>
    </div>
    <div class="body">
      <p class="username">@${username}</p>
      <div class="score">${iq}</div>
      <div class="stats">
        <div class="stat"><div class="label">${escapeHtml(t("percentile"))}</div><div class="value">${escapeHtml(t("percentileValue", { percentile: iqPercentile(iq) }))}</div></div>
        <div class="stat"><div class="label">${escapeHtml(t("date"))}</div><div class="value">${escapeHtml(date)}</div></div>
        <div class="stat"><div class="label">${escapeHtml(t("level"))}</div><div class="value">${user.level}</div></div>
      </div>
    </div>
    <p class="foot">${site} · ${new Date().getFullYear()}<br />${escapeHtml(t("disclaimer"))}</p>
  </div>
  <button type="button" onclick="window.print()">${escapeHtml(t("print"))}</button>
</body>
</html>`;

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" } });
}
