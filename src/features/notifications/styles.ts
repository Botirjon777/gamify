import {
  Award,
  BadgeCheck,
  Ban,
  Gift,
  GraduationCap,
  Medal,
  PartyPopper,
  Shield,
  ShieldCheck,
  ShieldX,
  Swords,
  Trophy,
  UserCheck,
  UserPlus,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NotificationPayload = Record<string, string | number>;

/** Icon, colour and "open" target per notification type (shared by the list and the detail page). */
export const NOTIFICATION_STYLE: Record<string, { icon: LucideIcon; gradient: string; href: (d: NotificationPayload, me: string) => string }> = {
  FRIEND_REQUEST: { icon: UserPlus, gradient: "bg-grad-brand", href: () => "/friends?tab=requests" },
  FRIEND_ACCEPTED: { icon: UserCheck, gradient: "bg-grad-success", href: (d) => `/u/${d.username}` },
  CLAN_JOIN_REQUEST: { icon: Shield, gradient: "bg-grad-dark", href: (d) => `/clans/${d.clanSlug}` },
  CLAN_JOIN_APPROVED: { icon: ShieldCheck, gradient: "bg-grad-success", href: (d) => `/clans/${d.clanSlug}` },
  CLAN_JOIN_REJECTED: { icon: ShieldX, gradient: "bg-grad-streak", href: () => "/clans" },
  CLAN_WEEKLY_RESULT: { icon: Trophy, gradient: "bg-grad-gold", href: (d) => `/clans/${d.clanSlug}` },
  BADGE_EARNED: { icon: Award, gradient: "bg-grad-xp", href: (_d, me) => `/u/${me}` },
  LEVEL_UP: { icon: PartyPopper, gradient: "bg-grad-brand", href: (_d, me) => `/u/${me}` },
  REFERRAL_JOINED: { icon: Gift, gradient: "bg-grad-success", href: (d) => `/u/${d.username}` },
  REFERRAL_REWARD: { icon: Gift, gradient: "bg-grad-gold", href: (d) => `/u/${d.username}` },
  PAYMENT_SUBMITTED: { icon: Wallet, gradient: "bg-grad-xp", href: () => "/admin/payments" },
  PAYMENT_APPROVED: { icon: BadgeCheck, gradient: "bg-grad-success", href: () => "/plans" },
  PAYMENT_REJECTED: { icon: Ban, gradient: "bg-grad-streak", href: () => "/plans" },
  TRACK_COMPLETED: { icon: GraduationCap, gradient: "bg-grad-success", href: (d) => `/learn/${d.trackSlug}` },
  SEASON_RESULT: { icon: Medal, gradient: "bg-grad-gold", href: () => "/leaderboard?board=XP&period=season" },
  DUEL_INVITE: { icon: Swords, gradient: "bg-grad-streak", href: (d) => `/duels/${d.duelId}` },
  DUEL_DECLINED: { icon: Swords, gradient: "bg-grad-dark", href: (d) => `/duels/${d.duelId}` },
  DUEL_RESULT: { icon: Trophy, gradient: "bg-grad-gold", href: (d) => `/duels/${d.duelId}` },
};
