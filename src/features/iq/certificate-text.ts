/** Text rules of the IQ certificate — pure, so they can be tested without rendering anything. */

/** The certificate's fonts have no ʻ and ʼ (Uzbek oʻ, gʻ, tutuq); their curly quotes are the same shapes. */
export const typeset = (text: string) => text.replace(/ʻ/g, "‘").replace(/ʼ/g, "’");

/**
 * The name is set as large as fits on one line (760 px wide in the template): in the script face when it is
 * written in Latin letters, otherwise in a bold italic serif, which is wider.
 */
export function nameStyle(name: string) {
  const latin = /^[\p{Script=Latin}\s'‘’.-]+$/u.test(name);
  const perChar = latin ? 0.4 : 0.6;
  return { fontFamily: latin ? "Script" : "Names", fontWeight: latin ? 400 : 700, fontSize: Math.round(Math.min(latin ? 112 : 68, 760 / (perChar * Math.max(name.length, 6)))) } as const;
}

/** "Zukkolar-IQ-sertifikat-Ali-Valiyev": letters and digits of any alphabet, words joined by hyphens. */
export const certificateFileName = (data: { site: string; name: string }) =>
  [data.site, "IQ-sertifikat", data.name]
    .join(" ")
    .normalize("NFKC")
    .replace(/[ʻʼ‘’'`]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

/** A Content-Disposition value: header text is ASCII, the real name goes in filename* (RFC 5987). */
export const contentDisposition = (name: string, download: boolean) =>
  `${download ? "attachment" : "inline"}; filename="${name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(name)}`;
