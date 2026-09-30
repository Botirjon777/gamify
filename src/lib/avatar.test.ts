import { describe, expect, it } from "vitest";
import { AVATAR_STYLES, avatarDataUri, defaultStyleFor, DEFAULT_STYLES, genderOptions, type AvatarStyle } from "./avatar";

type Schema = { properties: Record<string, { items?: { enum?: string[] } }> };

describe("avatar gender rules", () => {
  for (const [name, def] of Object.entries(AVATAR_STYLES)) {
    const rules = (def as { gender?: Record<string, Record<string, unknown>> }).gender;
    if (!rules) continue;
    const props = (def.style as unknown as { schema: Schema }).schema.properties;

    it(`${name}: every option value exists in the style's schema`, () => {
      for (const [gender, opts] of Object.entries(rules)) {
        for (const [key, value] of Object.entries(opts)) {
          expect(props[key], `${name}.${gender}.${key} is not an option`).toBeDefined();
          if (Array.isArray(value)) {
            const allowed = props[key].items?.enum ?? [];
            for (const v of value) expect(allowed, `${name}.${gender}.${key}: "${v}"`).toContain(v);
          }
        }
      }
    });
  }

  it("boys never get long hair or earrings, girls never get facial hair (adventurer)", () => {
    const m = genderOptions("adventurer", "MALE") as { hair: string[]; earringsProbability: number };
    const f = genderOptions("adventurer", "FEMALE") as { hair: string[]; features: string[] };
    expect(m.hair.every((h) => h.startsWith("short"))).toBe(true);
    expect(m.earringsProbability).toBe(0);
    expect(f.hair.every((h) => h.startsWith("long"))).toBe(true);
    expect(f.features).not.toContain("mustache");
  });

  it("unknown gender → no restrictions", () => {
    expect(genderOptions("adventurer", null)).toEqual({});
    expect(genderOptions("bottts", "MALE")).toEqual({});
  });

  it("renders every style for both genders", () => {
    for (const style of Object.keys(AVATAR_STYLES) as AvatarStyle[]) {
      for (const g of ["MALE", "FEMALE", null] as const) {
        expect(avatarDataUri("seed-" + style, style, g)).toMatch(/^data:image\/svg\+xml/);
      }
    }
  });

  it("different people get different looks", () => {
    const uris = new Set(Array.from({ length: 30 }, (_, i) => avatarDataUri(`user${i}`, defaultStyleFor(`user${i}`), "MALE")));
    expect(uris.size).toBe(30);
    const styles = new Set(Array.from({ length: 30 }, (_, i) => defaultStyleFor(`user${i}`)));
    expect(styles.size).toBe(DEFAULT_STYLES.length);
  });
});
