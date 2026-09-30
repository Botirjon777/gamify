"use client";

import { useState, useTransition } from "react";
import { Check, Clock, UserCheck, UserMinus, UserPlus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { acceptFriendRequest, removeFriendship, sendFriendRequest, type FriendActionResult } from "../actions";
import type { Relation } from "../queries";

const small = "inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition disabled:opacity-60";

export function FriendButton({ userId, relation, requestId }: { userId: string; relation: Relation; requestId?: string }) {
  const t = useTranslations("friends");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<FriendActionResult>) =>
    start(async () => {
      const result = await fn();
      setError(result.ok ? null : t(`errors.${result.error}`));
    });

  if (relation === "self") return null;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {relation === "none" && (
          <button className={`${small} bg-grad-brand text-white shadow-md shadow-brand/20`} disabled={pending} onClick={() => run(() => sendFriendRequest(userId))}>
            <UserPlus className="size-4" /> {t("add")}
          </button>
        )}
        {relation === "outgoing" && requestId && (
          <button className={`${small} border border-border bg-surface text-muted`} disabled={pending} onClick={() => run(() => removeFriendship(requestId))}>
            <Clock className="size-4" /> {t("sent")} · {t("cancel")}
          </button>
        )}
        {relation === "incoming" && requestId && (
          <>
            <button className={`${small} bg-grad-success text-white`} disabled={pending} onClick={() => run(() => acceptFriendRequest(requestId))}>
              <Check className="size-4" /> {t("accept")}
            </button>
            <button className={`${small} border border-border bg-surface text-muted`} disabled={pending} onClick={() => run(() => removeFriendship(requestId))}>
              <X className="size-4" /> {t("decline")}
            </button>
          </>
        )}
        {relation === "friends" && requestId && (
          <>
            <span className={`${small} bg-success/10 text-success`}>
              <UserCheck className="size-4" /> {t("isFriend")}
            </span>
            <button
              className={`${small} border border-border bg-surface text-muted hover:text-danger`}
              title={t("remove")}
              aria-label={t("remove")}
              disabled={pending}
              onClick={() => run(() => removeFriendship(requestId))}
            >
              <UserMinus className="size-4" />
            </button>
          </>
        )}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
