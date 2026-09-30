import { Gem, Zap } from "lucide-react";

/** Small PRO / DIAMOND pill next to usernames. FREE shows nothing. */
export function PlanBadge({ plan, className = "" }: { plan: "FREE" | "PRO" | "DIAMOND"; className?: string }) {
  if (plan === "FREE") return null;
  const diamond = plan === "DIAMOND";
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ${
        diamond ? "bg-grad-iq" : "bg-grad-brand"
      } ${className}`}
    >
      {diamond ? <Gem className="size-3" /> : <Zap className="size-3" />}
      {diamond ? "Diamond" : "Pro"}
    </span>
  );
}
