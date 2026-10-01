import { createAvatar, type Style } from "@dicebear/core";
import {
  adventurer,
  avataaars,
  bigSmile,
  bottts,
  funEmoji,
  lorelei,
  micah,
  notionists,
  personas,
  pixelArt,
  thumbs,
} from "@dicebear/collection";
import type { Gender, UserPlan } from "@/generated/prisma/enums";

type Options = Record<string, unknown>;
type GenderRules = { MALE: Options; FEMALE: Options };

/** Numbered variants helper: range("short", 1, 19) → short01…short19 */
const range = (prefix: string, from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => `${prefix}${String(from + i).padStart(2, "0")}`);

/**
 * Avatar styles. `gender` narrows the style's options so boys get short hair / facial hair and girls get
 * long hair / earrings. Styles without it (robots, emoji…) are the same for everyone.
 * Changing style / re-rolling unlocks at level 10; some styles also need a paid plan.
 */
export const AVATAR_STYLES = {
  adventurer: {
    style: adventurer,
    plan: "FREE",
    gender: {
      MALE: { hair: range("short", 1, 19), earringsProbability: 0, features: ["mustache", "birthmark", "freckles"], featuresProbability: 25 },
      FEMALE: { hair: range("long", 1, 26), earringsProbability: 45, features: ["blush", "birthmark", "freckles"], featuresProbability: 30 },
    },
  },
  avataaars: {
    style: avataaars,
    plan: "FREE",
    gender: {
      MALE: {
        top: ["shortCurly", "shortFlat", "shortRound", "shortWaved", "sides", "theCaesar", "theCaesarAndSidePart", "shavedSides", "frizzle", "shaggy", "shaggyMullet", "dreads01", "dreads02", "fro", "hat", "winterHat1", "winterHat02", "turban"],
        facialHairProbability: 35,
      },
      FEMALE: {
        top: ["bob", "bun", "curly", "curvy", "dreads", "frida", "froBand", "longButNotTooLong", "miaWallace", "straight01", "straight02", "straightAndStrand", "bigHair", "hijab", "winterHat03", "winterHat04"],
        facialHairProbability: 0,
      },
    },
  },
  personas: {
    style: personas,
    plan: "FREE",
    gender: {
      MALE: {
        hair: ["sideShave", "shortCombover", "shortComboverChops", "curlyHighTop", "buzzcut", "fade", "mohawk", "balding", "cap", "beanie"],
        facialHairProbability: 40,
      },
      FEMALE: {
        hair: ["long", "extraLong", "bobCut", "bobBangs", "curly", "curlyBun", "pigtails", "straightBun", "bunUndercut", "beanie"],
        facialHairProbability: 0,
      },
    },
  },
  bottts: { style: bottts, plan: "FREE" },
  funEmoji: { style: funEmoji, plan: "FREE" },
  thumbs: { style: thumbs, plan: "FREE" },
  micah: {
    style: micah,
    plan: "PRO",
    gender: {
      MALE: { hair: ["fonze", "mrT", "dougFunny", "mrClean", "dannyPhantom", "turban"], facialHairProbability: 30, earringsProbability: 0 },
      FEMALE: { hair: ["full", "pixie"], facialHairProbability: 0, earringsProbability: 50 },
    },
  },
  lorelei: {
    style: lorelei,
    plan: "PRO",
    gender: {
      MALE: { beardProbability: 35, earringsProbability: 0 },
      FEMALE: { beardProbability: 0, earringsProbability: 45 },
    },
  },
  notionists: {
    style: notionists,
    plan: "PRO",
    gender: {
      MALE: { beardProbability: 40 },
      FEMALE: { beardProbability: 0 },
    },
  },
  bigSmile: {
    style: bigSmile,
    plan: "DIAMOND",
    gender: {
      MALE: { hair: ["shortHair", "mohawk", "bowlCutHair", "shavedHead", "halfShavedHead", "curlyShortHair"] },
      FEMALE: { hair: ["wavyBob", "curlyBob", "straightHair", "braids", "bunHair", "froBun", "bangs"] },
    },
  },
  pixelArt: {
    style: pixelArt,
    plan: "DIAMOND",
    gender: {
      MALE: { hair: range("short", 1, 24), beardProbability: 25 },
      FEMALE: { hair: range("long", 1, 21), beardProbability: 0 },
    },
  },
} as const satisfies Record<string, { style: Style<object>; plan: UserPlan; gender?: GenderRules }>;

export type AvatarStyle = keyof typeof AVATAR_STYLES;

/** New accounts get one of these (picked from the seed) — so not everyone starts with the same look. */
export const DEFAULT_STYLES: AvatarStyle[] = ["adventurer", "avataaars", "personas"];

export function defaultStyleFor(seed: string): AvatarStyle {
  // FNV-1a: spreads similar usernames (ali1, ali2…) evenly across the styles.
  let h = 0x811c9dc5;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0;
  return DEFAULT_STYLES[h % DEFAULT_STYLES.length];
}

/** Wide pastel palette + gradients so backgrounds differ a lot between people. */
const BACKGROUNDS = ["b6e3f4", "c0aede", "d1d4f9", "ffd5dc", "ffdfbf", "c7f9cc", "fde68a", "a7f3d0", "fbcfe8", "bae6fd", "ddd6fe", "fed7aa"];

/** Style options for this style + gender (empty when the style has no gender rules or gender is unknown). */
export function genderOptions(style: string, gender?: Gender | null): Options {
  const def = AVATAR_STYLES[style as AvatarStyle] as { gender?: GenderRules } | undefined;
  return gender && def?.gender ? def.gender[gender] : {};
}

/** Rendering an SVG avatar is the slowest part of a leaderboard page — the same people show up everywhere. */
const memo = new Map<string, string>();
const MEMO_MAX = 3000;

/** Generated avatar (Reddit-style) from a seed, style and — when known — gender. */
export function avatarDataUri(seed: string, style: string = "adventurer", gender?: Gender | null) {
  const key = `${style}|${gender ?? ""}|${seed}`;
  const hit = memo.get(key);
  if (hit) return hit;

  const def = AVATAR_STYLES[style as AvatarStyle] ?? AVATAR_STYLES.adventurer;
  const uri = createAvatar(def.style as Style<object>, {
    seed,
    backgroundColor: BACKGROUNDS,
    backgroundType: ["solid", "gradientLinear"],
    ...genderOptions(style, gender),
  }).toDataUri();
  if (memo.size >= MEMO_MAX) memo.delete(memo.keys().next().value!);
  memo.set(key, uri);
  return uri;
}
