import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { exerciseDef, trackFile } from "./content-schema";

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
});
