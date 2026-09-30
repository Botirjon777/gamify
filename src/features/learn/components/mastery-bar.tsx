import { masteryLevel, type MasteryLevel } from "../mastery";

const colors: Record<MasteryLevel, string> = {
  new: "bg-border",
  learning: "bg-grad-xp",
  good: "bg-grad-brand",
  mastered: "bg-grad-success",
};

export function MasteryBar({ score, attempts, className = "" }: { score: number; attempts: number; className?: string }) {
  const level = masteryLevel(score, attempts);
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-background ${className}`}>
      <div className={`h-full rounded-full ${colors[level]}`} style={{ width: `${Math.max(score, 0)}%` }} />
    </div>
  );
}
