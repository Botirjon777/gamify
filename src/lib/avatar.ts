import { createAvatar } from "@dicebear/core";
import { adventurer } from "@dicebear/collection";

/** Reddit-style generated avatar from a seed. Later: avatarConfig for unlockable parts. */
export function avatarDataUri(seed: string) {
  return createAvatar(adventurer, { seed, backgroundColor: ["b6e3f4", "c0aede", "d1d4f9", "ffd5dc", "ffdfbf"] }).toDataUri();
}
