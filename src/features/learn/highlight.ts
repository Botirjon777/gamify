import "server-only";
import { createHighlighter, type Highlighter } from "shiki";
import { LANGS, type CodeLang } from "./content-schema";

let highlighter: Promise<Highlighter> | undefined;

function getHighlighter() {
  highlighter ??= createHighlighter({ themes: ["github-dark"], langs: [...LANGS] });
  return highlighter;
}

/** Code → highlighted HTML (<pre><code>…). Safe to render: shiki escapes the source. */
export async function highlight(code: string, lang: CodeLang): Promise<string> {
  return (await getHighlighter()).codeToHtml(code, { lang, theme: "github-dark" });
}
