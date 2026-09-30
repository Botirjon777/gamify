import { CircleCheck, CircleX, Clock } from "lucide-react";

/** Status with icon + text, never color alone. */
export function PaymentStatusPill({ status, label }: { status: "PENDING" | "APPROVED" | "REJECTED"; label?: string }) {
  const look = {
    PENDING: { icon: Clock, cls: "bg-xp/15 text-[#a86a00]" },
    APPROVED: { icon: CircleCheck, cls: "bg-success/10 text-success" },
    REJECTED: { icon: CircleX, cls: "bg-danger/10 text-danger" },
  }[status];
  const Icon = look.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${look.cls}`}>
      <Icon className="size-3.5" /> {label ?? status}
    </span>
  );
}
