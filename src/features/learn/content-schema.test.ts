import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { exerciseDef, toDbExercise, trackFile } from "./content-schema";
import { toFileExercise } from "./content-export";

describe("track file", () => {
  const track = (extra: Record<string, unknown>) =>
    trackFile.safeParse({ slug: "demo", title: "Demo", modules: [{ slug: "m", title: "M", skills: [{ slug: "s-1", title: "S" }] }], ...extra });

  it("needs one of the subject's categories when the subject has them", () => {
    expect(track({ subject: "PROGRAMMING", category: "FRONTEND" }).success).toBe(true);
    expect(track({ subject: "PROGRAMMING" }).success).toBe(false);
  });

  it("has no category in subjects without categories", () => {
    expect(track({ subject: "MATH" }).success).toBe(true);
    expect(track({ subject: "MATH", category: "FRONTEND" }).success).toBe(false);
  });

  it("requires a known subject", () => {
    expect(track({ category: "FRONTEND" }).success).toBe(false);
    expect(track({ subject: "HISTORY" }).success).toBe(false);
  });

  it("rejects slugs taken by the /learn/c and /learn/s pages", () => {
    expect(track({ subject: "MATH", slug: "c" }).success).toBe(false);
    expect(track({ subject: "MATH", slug: "s" }).success).toBe(false);
  });
});

describe("content schema", () => {
  it("rejects an option that YAML turned into a map (unquoted 'a: b')", () => {
    const yaml = `
id: demo-001
type: choice
prompt: Savol
options:
  - unknown xavfsiz: tekshiruv kerak
  - boshqa
answer: 0
`;
    expect(exerciseDef.safeParse(parse(yaml)).success).toBe(false);
  });

  it("accepts plain strings and language-keyed text", () => {
    const def = { id: "demo-002", type: "choice", prompt: { uz: "Savol", ru: "Вопрос" }, options: ["a", "b"], answer: 1 };
    expect(exerciseDef.safeParse(def).success).toBe(true);
  });

  it("fill word bank: stored with the right words mixed in; a distractor can't be an accepted answer", () => {
    const fill = { id: "demo-003", type: "fill", lang: "text", prompt: "Toʻldiring", code: "___ va ___", answer: ["shoh", ["mat", "mot"]] };
    const ok = exerciseDef.parse({ ...fill, bank: ["pat", "vazir"] });
    const content = toDbExercise(ok).content as { bank?: string[] };
    expect(content.bank).toEqual(["mat", "pat", "shoh", "vazir"]);
    expect(JSON.stringify(content)).not.toContain("mot");
    expect(exerciseDef.safeParse({ ...fill, bank: ["mot"] }).success).toBe(false);
    expect((toDbExercise(exerciseDef.parse(fill)).content as { bank?: string[] }).bank).toBeUndefined();
  });

  it("export keeps what the defaults would lose: custom xp, draft status, several accepted answers, the word bank", () => {
    const def = exerciseDef.parse({
      id: "demo-004",
      type: "fill",
      lang: "text",
      difficulty: 2,
      xp: 25,
      status: "DRAFT",
      prompt: { uz: "Toʻldiring", ru: "Заполните" },
      code: "___ va ___",
      answer: ["shoh", ["mat", "mot"]],
      bank: ["pat"],
    });
    expect(toFileExercise(toDbExercise(def))).toEqual({
      id: "demo-004",
      type: "fill",
      difficulty: 2,
      xp: 25,
      status: "DRAFT",
      lang: "text",
      prompt: { uz: "Toʻldiring", ru: "Заполните" },
      code: "___ va ___",
      answer: ["shoh", ["mat", "mot"]],
      bank: ["pat"],
    });
    // defaults are left out of the file
    const plain = toFileExercise(toDbExercise(exerciseDef.parse({ id: "demo-005", type: "choice", prompt: "Savol", options: ["a", "b"], answer: 0 })));
    expect(plain).toEqual({ id: "demo-005", type: "choice", difficulty: 1, lang: "jsx", prompt: "Savol", options: ["a", "b"], answer: 0 });
  });
});
