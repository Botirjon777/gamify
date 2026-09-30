import { Brain, Zap } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Avatar } from "@/components/avatar";
import { PlanBadge } from "@/components/plan-badge";
import type { PublicUser } from "../queries";

/** A user line: avatar, name, plan, clan tag, level/IQ — plus an action slot on the right. */
export async function UserRow({ user, extra, action }: { user: PublicUser; extra?: string; action?: React.ReactNode }) {
  const t = await getTranslations("friends");
  return (
    <li className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
      <Link href={`/u/${user.username}`}>
        <Avatar user={user} className="size-11" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/u/${user.username}`} className="flex flex-wrap items-center gap-1.5 font-semibold hover:text-brand">
          <span className="truncate">{user.username}</span>
          {user.clanTag && <span className="rounded-md bg-grad-dark px-1.5 py-0.5 text-[10px] font-bold text-white">[{user.clanTag}]</span>}
          <PlanBadge plan={user.plan} />
        </Link>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            <Zap className="size-3.5 text-xp" /> {t("level", { level: user.level })}
          </span>
          {user.iq !== null && (
            <span className="inline-flex items-center gap-1">
              <Brain className="size-3.5 text-brand" /> IQ {user.iq}
            </span>
          )}
          {extra && <span className="font-semibold text-xp">{extra}</span>}
        </p>
      </div>
      {action}
    </li>
  );
}
