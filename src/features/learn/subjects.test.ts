import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CATEGORIES } from "./categories";
import { normalizeInterests, subjectFromSlug, subjectOfCategory, subjectSlug, SUBJECT_CATEGORIES, SUBJECTS, TRACK_GROUPS } from "./subjects";

describe("subjects", () => {
  it("every category belongs to exactly one subject", () => {
    const all = SUBJECTS.flatMap((s) => SUBJECT_CATEGORIES[s]);
    expect([...all].sort()).toEqual([...CATEGORIES].sort());
    expect(subjectOfCategory("FRONTEND")).toBe("PROGRAMMING");
  });

  it("groups are a subject's categories, or the subject itself", () => {
    expect(TRACK_GROUPS).toContainEqual({ subject: "PROGRAMMING", category: "BACKEND" });
    expect(TRACK_GROUPS).toContainEqual({ subject: "CHESS", category: null });
    expect(TRACK_GROUPS).not.toContainEqual({ subject: "PROGRAMMING", category: null });
  });

  it("slugs round-trip", () => {
    for (const s of SUBJECTS) expect(subjectFromSlug(subjectSlug(s))).toBe(s);
    expect(subjectFromSlug("history")).toBeNull();
  });

  it("normalizes interests: known subjects only, no duplicates, catalog order", () => {
    expect(normalizeInterests(["CHESS", "MATH", "CHESS", "HISTORY"])).toEqual(["MATH", "CHESS"]);
    expect(normalizeInterests([])).toEqual([]);
  });

  it("has a title and a text for every subject in the messages", () => {
    const messages = JSON.parse(readFileSync(join(process.cwd(), "messages/uz.json"), "utf8"));
    for (const s of SUBJECTS) {
      expect(messages.learn.subjects[s]?.title, s).toBeTruthy();
      expect(messages.learn.subjects[s]?.text, s).toBeTruthy();
    }
  });
});
