import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { exerciseDef } from "./content-schema";

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
