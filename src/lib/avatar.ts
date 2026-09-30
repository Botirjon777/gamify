import { createAvatar, type Style } from "@dicebear/core";
import { adventurer, avataaars, bigSmile, bottts, funEmoji, lorelei, micah, notionists, pixelArt, thumbs } from "@dicebear/collection";
import type { UserPlan } from "@/generated/prisma/enums";

/** Avatar styles. Changing style / re-rolling unlocks at level 10; some styles also need a paid plan. */
export const AVATAR_STYLES = {
  adventurer: { style: adventurer, plan: "FREE" },
  avataaars: { style: avataaars, plan: "FREE" },
  bottts: { style: bottts, plan: "FREE" },
  funEmoji: { style: funEmoji, plan: "FREE" },
  thumbs: { style: thumbs, plan: "FREE" },
  micah: { style: micah, plan: "PRO" },
  lorelei: { style: lorelei, plan: "PRO" },
  notionists: { style: notionists, plan: "PRO" },
  bigSmile: { style: bigSmile, plan: "DIAMOND" },
  pixelArt: { style: pixelArt, plan: "DIAMOND" },
} as const satisfies Record<string, { style: Style<object>; plan: UserPlan }>;

export type AvatarStyle = keyof typeof AVATAR_STYLES;

const BACKGROUNDS = ["b6e3f4", "c0aede", "d1d4f9", "ffd5dc", "ffdfbf"];

/** Reddit-style generated avatar from a seed. */
export function avatarDataUri(seed: string, style: string = "adventurer") {
  const def = AVATAR_STYLES[style as AvatarStyle] ?? AVATAR_STYLES.adventurer;
  return createAvatar(def.style as Style<object>, { seed, backgroundColor: BACKGROUNDS }).toDataUri();
}
