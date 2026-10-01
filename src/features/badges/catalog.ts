/** Badge definitions. Titles/descriptions live in messages (badges.<key>.title / .text). */

export interface BadgeStats {
  level: number;
  longestStreak: number;
  solved: number;
  masteredSkills: number;
  iqTested: boolean;
  iq: number | null;
  friends: number;
  inClan: boolean;
  clanLeader: boolean;
  referralsRewarded: number;
  paid: "FREE" | "PRO" | "DIAMOND";
}

export type BadgeGradient = "brand" | "xp" | "streak" | "iq" | "success" | "gold" | "dark";

export interface BadgeDef {
  key: string;
  /** lucide-react icon name, rendered by <Icon name=…> */
  icon: string;
  gradient: BadgeGradient;
  xp: number;
  /** null → awarded by an event, not by a stats check (e.g. clan champion). */
  earned: ((s: BadgeStats) => boolean) | null;
  /** [current, target] for the progress bar on the badges page (counting badges only). */
  progress?: (s: BadgeStats) => [number, number];
}

export const BADGES: BadgeDef[] = [
  { key: "first_step", icon: "footprints", gradient: "success", xp: 10, earned: (s) => s.solved >= 1 },
  { key: "solver_50", icon: "target", gradient: "brand", xp: 50, earned: (s) => s.solved >= 50, progress: (s) => [s.solved, 50] },
  { key: "solver_200", icon: "swords", gradient: "dark", xp: 150, earned: (s) => s.solved >= 200, progress: (s) => [s.solved, 200] },
  { key: "streak_3", icon: "flame", gradient: "streak", xp: 15, earned: (s) => s.longestStreak >= 3, progress: (s) => [s.longestStreak, 3] },
  { key: "streak_7", icon: "flame", gradient: "streak", xp: 40, earned: (s) => s.longestStreak >= 7, progress: (s) => [s.longestStreak, 7] },
  { key: "streak_30", icon: "flame-kindling", gradient: "gold", xp: 200, earned: (s) => s.longestStreak >= 30, progress: (s) => [s.longestStreak, 30] },
  { key: "level_5", icon: "star", gradient: "xp", xp: 25, earned: (s) => s.level >= 5, progress: (s) => [s.level, 5] },
  { key: "level_10", icon: "sparkles", gradient: "gold", xp: 100, earned: (s) => s.level >= 10, progress: (s) => [s.level, 10] },
  { key: "level_20", icon: "crown", gradient: "gold", xp: 300, earned: (s) => s.level >= 20, progress: (s) => [s.level, 20] },
  { key: "skill_master", icon: "graduation-cap", gradient: "success", xp: 50, earned: (s) => s.masteredSkills >= 1 },
  { key: "iq_tested", icon: "brain", gradient: "iq", xp: 20, earned: (s) => s.iqTested },
  { key: "iq_130", icon: "brain-circuit", gradient: "iq", xp: 100, earned: (s) => (s.iq ?? 0) >= 130 },
  { key: "first_friend", icon: "handshake", gradient: "brand", xp: 15, earned: (s) => s.friends >= 1 },
  { key: "friends_10", icon: "users", gradient: "brand", xp: 60, earned: (s) => s.friends >= 10, progress: (s) => [s.friends, 10] },
  { key: "clan_member", icon: "shield", gradient: "dark", xp: 20, earned: (s) => s.inClan },
  { key: "clan_founder", icon: "castle", gradient: "dark", xp: 40, earned: (s) => s.clanLeader },
  { key: "recruiter", icon: "user-plus", gradient: "success", xp: 50, earned: (s) => s.referralsRewarded >= 1 },
  { key: "ambassador", icon: "megaphone", gradient: "gold", xp: 200, earned: (s) => s.referralsRewarded >= 5, progress: (s) => [s.referralsRewarded, 5] },
  { key: "pro", icon: "zap", gradient: "brand", xp: 0, earned: (s) => s.paid !== "FREE" },
  { key: "diamond", icon: "gem", gradient: "iq", xp: 0, earned: (s) => s.paid === "DIAMOND" },
  { key: "clan_champion", icon: "trophy", gradient: "gold", xp: 0, earned: null },
];

export const BADGE_BY_KEY = new Map(BADGES.map((b) => [b.key, b]));

/** Level at which profile picture customization unlocks. */
export const AVATAR_UNLOCK_LEVEL = 10;
