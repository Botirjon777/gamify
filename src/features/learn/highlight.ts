import "server-only";
import { createHighlighter, type Highlighter } from "shiki";
import { LANGS, type CodeLang } from "./content-schema";

let highlighter: Promise<Highlighter> | undefined;

function getHighlighter() {
  highlighter ??= createHighlighter({ themes: ["github-dark"], langs: LANGS.filter((l) => l !== "text") });
  return highlighter;
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Code → highlighted HTML (<pre><code>…). Safe to render: shiki escapes the source; plain text is escaped here. */
export async function highlight(code: string, lang: CodeLang): Promise<string> {
  if (lang === "text") return `<pre><code>${escapeHtml(code)}</code></pre>`;
  return (await getHighlighter()).codeToHtml(code, { lang, theme: "github-dark" });
}
