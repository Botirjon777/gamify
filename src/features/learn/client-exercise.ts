import "server-only";
import { randomUUID } from "node:crypto";
import type { Exercise } from "@/generated/prisma/client";
import { localized, type LocalizedText } from "@/i18n/content";
import { BLANK, type PrivateAnswer, type PublicContent } from "./content-schema";
import { highlight } from "./highlight";
import type { ClientExercise } from "./types";

/** What the browser gets for an exercise (drill and duels) — never the answer. */
export async function toClientExercise(exercise: Exercise, locale: string): Promise<ClientExercise> {
  const content = exercise.content as PublicContent;
  const base = {
    id: exercise.id,
    difficulty: exercise.difficulty,
    xp: exercise.xp,
    prompt: localized(content.prompt, locale),
    lang: content.lang,
  };

  switch (content.type) {
    case "CHOICE":
      return {
        ...base,
        type: "CHOICE",
        codeHtml: content.code ? await highlight(content.code, content.lang) : undefined,
        options: content.options.map((o: LocalizedText) => localized(o, locale)),
      };
    case "OUTPUT":
      return { ...base, type: "OUTPUT", codeHtml: await highlight(content.code, content.lang) };
    case "FILL":
      return { ...base, type: "FILL", parts: content.code.split(BLANK) };
    case "ORDER": {
      // Never show the lines already in the correct order.
      const correctOrder = (exercise.answer as Extract<PrivateAnswer, { type: "ORDER" }>).lines.join("\n");
      let lines = shuffle(content.lines);
      for (let i = 0; i < 10 && lines.join("\n") === correctOrder; i++) lines = shuffle(content.lines);
      return { ...base, type: "ORDER", lines: lines.map((text) => ({ key: randomUUID(), text })) };
    }
  }
}

export function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
