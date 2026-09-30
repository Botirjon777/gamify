import {
  Atom,
  Braces,
  Brain,
  BrainCircuit,
  Castle,
  Crown,
  Flame,
  FlameKindling,
  Footprints,
  Gem,
  GraduationCap,
  Handshake,
  HelpCircle,
  Megaphone,
  Rocket,
  Shield,
  Sparkles,
  Star,
  Swords,
  Target,
  Trophy,
  User,
  UserPlus,
  Users,
  Zap,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

/**
 * Icons referenced by name from data (badges, clan emblems, content tracks).
 * Only these are bundled — add new ones here.
 */
const ICONS: Record<string, LucideIcon> = {
  atom: Atom,
  braces: Braces,
  brain: Brain,
  "brain-circuit": BrainCircuit,
  castle: Castle,
  crown: Crown,
  flame: Flame,
  "flame-kindling": FlameKindling,
  footprints: Footprints,
  gem: Gem,
  "graduation-cap": GraduationCap,
  handshake: Handshake,
  megaphone: Megaphone,
  rocket: Rocket,
  shield: Shield,
  sparkles: Sparkles,
  star: Star,
  swords: Swords,
  target: Target,
  trophy: Trophy,
  user: User,
  "user-plus": UserPlus,
  users: Users,
  zap: Zap,
};

/** Emblems a clan leader can pick. */
export const CLAN_EMBLEMS = ["shield", "swords", "castle", "crown", "flame", "rocket", "atom", "brain", "gem", "zap"] as const;

export function Icon({ name, ...props }: { name: string } & LucideProps) {
  const Component = ICONS[name] ?? HelpCircle;
  return <Component aria-hidden {...props} />;
}

/** Gradient backgrounds usable by key (badge / clan colors). */
export const GRADIENTS = {
  brand: "bg-grad-brand",
  xp: "bg-grad-xp",
  streak: "bg-grad-streak",
  iq: "bg-grad-iq",
  success: "bg-grad-success",
  gold: "bg-grad-gold",
  dark: "bg-grad-dark",
} as const;
export type GradientKey = keyof typeof GRADIENTS;
export const CLAN_COLORS = Object.keys(GRADIENTS) as GradientKey[];

/** A rounded gradient tile with a white icon — used for badges, stats and emblems. */
export function IconTile({
  name,
  gradient = "brand",
  size = "md",
  className = "",
}: {
  name: string;
  gradient?: GradientKey;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const box = { sm: "size-8 rounded-lg", md: "size-10 rounded-xl", lg: "size-14 rounded-2xl", xl: "size-20 rounded-3xl" }[size];
  const icon = { sm: "size-4", md: "size-5", lg: "size-7", xl: "size-10" }[size];
  return (
    <span className={`grid shrink-0 place-items-center text-white shadow-lg shadow-black/10 ${box} ${GRADIENTS[gradient]} ${className}`}>
      <Icon name={name} className={icon} strokeWidth={2.2} />
    </span>
  );
}
