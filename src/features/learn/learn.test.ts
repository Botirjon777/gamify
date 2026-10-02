import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { checkAnswer, normalize, normalizeText } from "./check";
import { skillFile, toDbExercise, type PrivateAnswer, type Submission } from "./content-schema";
import { nextMastery, reviewIntervalDays } from "./mastery";
import { pickNext } from "./picker";

describe("normalize", () => {
  it("ignores whitespace and one pair of surrounding quotes", () => {
    expect(normalize(" [1, 2,  3] ")).toBe("[1,2,3]");
    expect(normalize('"Salom, Ali!"')).toBe("Salom,Ali!");
    expect(normalize("'x'")).toBe("x");
  });
  it("is case-sensitive", () => {
    expect(normalize("True")).not.toBe(normalize("true"));
  });
});

describe("normalizeText", () => {
  it("lower-cases and unifies apostrophes on top of normalize", () => {
    expect(normalizeText(" Oʻzbek ")).toBe(normalizeText("o'zbek"));
    expect(normalizeText("Maʼno")).toBe("ma'no");
  });
});

describe("checkAnswer", () => {
  it("CHOICE", () => {
    const answer: PrivateAnswer = { type: "CHOICE", index: 2 };
    expect(checkAnswer(answer, { type: "CHOICE", index: 2 }).correct).toBe(true);
    expect(checkAnswer(answer, { type: "CHOICE", index: 1 }).correct).toBe(false);
  });
  it("OUTPUT accepts any listed answer", () => {
    const answer: PrivateAnswer = { type: "OUTPUT", accepted: ["render, effect", "render effect"] };
    expect(checkAnswer(answer, { type: "OUTPUT", text: "render,effect" }).correct).toBe(true);
    expect(checkAnswer(answer, { type: "OUTPUT", text: "render  effect" }).correct).toBe(true);
    expect(checkAnswer(answer, { type: "OUTPUT", text: "effect, render" }).correct).toBe(false);
  });
  it("FILL needs every blank right", () => {
    const answer: PrivateAnswer = { type: "FILL", blanks: [["useState"], ["setCount"]] };
    expect(checkAnswer(answer, { type: "FILL", blanks: ["useState", " setCount "] }).correct).toBe(true);
    expect(checkAnswer(answer, { type: "FILL", blanks: ["useState", "setcount"] }).correct).toBe(false);
    expect(checkAnswer(answer, { type: "FILL", blanks: ["useState"] }).correct).toBe(false);
  });
  it("ORDER treats identical lines as interchangeable", () => {
    const answer: PrivateAnswer = { type: "ORDER", lines: ["a {", "}", "b {", "}"] };
    expect(checkAnswer(answer, { type: "ORDER", lines: ["a {", "}", "b {", "}"] }).correct).toBe(true);
    expect(checkAnswer(answer, { type: "ORDER", lines: ["b {", "}", "a {", "}"] }).correct).toBe(false);
  });
  it("prose answers ignore letter case and the kind of apostrophe; code answers don't", () => {
    const answer: PrivateAnswer = { type: "FILL", blanks: [["hujum"], ["yoʻqolib"]] };
    const typed: Submission = { type: "FILL", blanks: ["Hujum", "yo'qolib "] };
    expect(checkAnswer(answer, typed, true).correct).toBe(true);
    expect(checkAnswer(answer, typed).correct).toBe(false);
    expect(checkAnswer({ type: "OUTPUT", accepted: ["Durrang"] }, { type: "OUTPUT", text: "durrang" }, true).correct).toBe(true);
  });
  it("rejects a submission of the wrong type", () => {
    expect(checkAnswer({ type: "CHOICE", index: 0 }, { type: "OUTPUT", text: "0" }).correct).toBe(false);
  });
});

describe("mastery", () => {
  it("rises on correct, falls on wrong, stays in 0–100", () => {
    expect(nextMastery(0, true, 1)).toBeGreaterThan(0);
    expect(nextMastery(50, false, 1)).toBeLessThan(50);
    expect(nextMastery(99.9, true, 3)).toBeLessThanOrEqual(100);
    expect(nextMastery(0, false, 3)).toBe(0);
  });
  it("harder exercises move mastery more", () => {
    expect(nextMastery(40, true, 3)).toBeGreaterThan(nextMastery(40, true, 1));
  });
  it("review interval grows with mastery", () => {
    expect(reviewIntervalDays(10)).toBeLessThan(reviewIntervalDays(95));
  });
});

describe("pickNext", () => {
  const pool = [
    { id: "a", difficulty: 1 },
    { id: "b", difficulty: 1 },
    { id: "c", difficulty: 3 },
  ];
  const noJitter = () => 0;

  it("prefers unseen exercises near the target difficulty", () => {
    const picked = pickNext(pool, { lastResult: new Map([["a", true]]) }, 0, [], noJitter);
    expect(picked?.id).toBe("b");
  });
  it("avoids recently shown exercises", () => {
    const picked = pickNext(pool, { lastResult: new Map() }, 0, ["a", "b"], noJitter);
    expect(picked?.id).toBe("c");
  });
  it("still returns something when everything was recent", () => {
    expect(pickNext([{ id: "a", difficulty: 1 }], { lastResult: new Map() }, 0, ["a"])).not.toBeNull();
  });
});

/** Every exercise in /content must accept its own correct answer — catches typos in answers. */
describe("content answers are self-consistent", () => {
  const root = join(process.cwd(), "content");
  const files = readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(root, d.name, "track.yaml")))
    .flatMap((d) =>
      readdirSync(join(root, d.name))
        .filter((f) => f.endsWith(".yaml") && f !== "track.yaml")
        .map((f) => join(root, d.name, f)),
    )
    .filter(existsSync);

  for (const file of files) {
    const { exercises } = skillFile.parse(parse(readFileSync(file, "utf8")));
    for (const def of exercises) {
      it(def.id, () => {
        const db = toDbExercise(def);
        const answer = db.answer as PrivateAnswer;
        const submission: Submission =
          answer.type === "CHOICE"
            ? { type: "CHOICE", index: answer.index }
            : answer.type === "OUTPUT"
              ? { type: "OUTPUT", text: answer.accepted[0] }
              : answer.type === "FILL"
                ? { type: "FILL", blanks: answer.blanks.map((b) => b[0]) }
                : { type: "ORDER", lines: answer.lines };
        expect(checkAnswer(answer, submission).correct).toBe(true);
        // The public part must never contain the answer for CHOICE/FILL/OUTPUT.
        expect(JSON.stringify(db.content)).not.toContain('"answer"');
      });
    }
  }
});
