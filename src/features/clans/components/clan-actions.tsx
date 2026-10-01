"use client";

import { useState, useTransition } from "react";
import { Check, Clock, LogOut, ShieldMinus, ShieldPlus, UserX, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { cancelJoinRequest, decideJoinRequest, kickMember, leaveClan, requestToJoin, setOfficer, type ClanActionResult } from "../actions";

const btn = "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-semibold transition disabled:opacity-60";
const small = "inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold transition disabled:opacity-60";

function useAction() {
  const t = useTranslations("clans");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<ClanActionResult>, after?: () => void) =>
    start(async () => {
      const result = await fn();
      if (result.ok) {
        setError(null);
        after?.();
      } else setError(t(`errors.${result.error}`));
    });
  return { pending, error, run };
}

/** Join request (with optional message) / pending state / cancel. */
export function JoinClan({ clanId, pending: requestPending, full }: { clanId: string; pending: boolean; full: boolean }) {
  const t = useTranslations("clans");
  const { pending, error, run } = useAction();
  const [message, setMessage] = useState("");

  if (requestPending) {
    return (
      <div className="flex flex-col gap-2 sm:items-end">
        <span className="inline-flex items-center gap-2 rounded-xl bg-white/20 px-3 py-2 text-sm font-semibold">
          <Clock className="size-4" /> {t("requestSent")}
        </span>
        <ConfirmButton
          className={`${btn} bg-white/15 hover:bg-white/25`}
          disabled={pending}
          title={t("cancelRequestConfirm")}
          confirmLabel={t("cancelRequest")}
          onConfirm={async () => {
            const result = await cancelJoinRequest(clanId);
            return result.ok ? null : t(`errors.${result.error}`);
          }}
        >
          <X className="size-4" /> {t("cancelRequest")}
        </ConfirmButton>
        {error && <p className="text-xs">{error}</p>}
      </div>
    );
  }

  if (full) return <span className="rounded-xl bg-white/20 px-3 py-2 text-sm font-semibold">{t("full")}</span>;

  return (
    <div className="flex w-full flex-col gap-2 sm:w-80">
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={200}
        placeholder={t("joinMessagePlaceholder")}
        aria-label={t("joinMessage")}
        className="h-10 rounded-xl border border-white/30 bg-white/15 px-3 text-sm text-white placeholder:text-white/60 outline-none focus:bg-white/25"
      />
      <button className={`${btn} bg-white text-foreground hover:bg-white/90`} disabled={pending} onClick={() => run(() => requestToJoin(clanId, message))}>
        {t("join")}
      </button>
      <p className="text-xs text-white/75">{t("approvalNote")}</p>
      {error && <p className="text-xs font-semibold">{error}</p>}
    </div>
  );
}

export function LeaveClan({ isLeader }: { isLeader: boolean }) {
  const t = useTranslations("clans");
  const router = useRouter();
  return (
    <ConfirmButton
      className={`${btn} bg-white/15 hover:bg-white/25`}
      title={t("leaveConfirmTitle")}
      text={isLeader ? t("leaveConfirmLeader") : t("leaveConfirmText")}
      confirmLabel={t("leave")}
      icon={<LogOut className="size-6" />}
      onConfirm={async () => {
        const result = await leaveClan();
        if (!result.ok) return t(`errors.${result.error}`);
        router.push("/clans");
      }}
    >
      <LogOut className="size-4" /> {t("leave")}
    </ConfirmButton>
  );
}

export function RequestDecision({ requestId }: { requestId: string }) {
  const t = useTranslations("clans");
  const { pending, error, run } = useAction();
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button className={`${small} bg-grad-success text-white`} disabled={pending} onClick={() => run(() => decideJoinRequest(requestId, true))}>
          <Check className="size-3.5" /> {t("approve")}
        </button>
        <button className={`${small} border border-border bg-surface text-muted`} disabled={pending} onClick={() => run(() => decideJoinRequest(requestId, false))}>
          <X className="size-3.5" /> {t("reject")}
        </button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export function MemberControls({
  userId,
  username,
  canKick,
  canPromote,
  isOfficer,
}: {
  userId: string;
  username: string;
  canKick: boolean;
  canPromote: boolean;
  isOfficer: boolean;
}) {
  const t = useTranslations("clans");
  const { pending, run } = useAction();
  const fail = (r: ClanActionResult) => (r.ok ? null : t(`errors.${r.error}`));
  return (
    <div className="flex gap-1">
      {canPromote && !isOfficer && (
        <button
          className={`${small} text-muted hover:bg-background hover:text-foreground`}
          title={t("makeOfficer")}
          aria-label={t("makeOfficer")}
          disabled={pending}
          onClick={() => run(() => setOfficer(userId, true))}
        >
          <ShieldPlus className="size-4" />
        </button>
      )}
      {canPromote && isOfficer && (
        <ConfirmButton
          className={`${small} text-muted hover:bg-background hover:text-foreground`}
          label={t("removeOfficer")}
          title={t("removeOfficerConfirm", { username })}
          confirmLabel={t("removeOfficer")}
          icon={<ShieldMinus className="size-6" />}
          onConfirm={async () => fail(await setOfficer(userId, false))}
        >
          <ShieldMinus className="size-4" />
        </ConfirmButton>
      )}
      {canKick && (
        <ConfirmButton
          className={`${small} text-muted hover:bg-danger/10 hover:text-danger`}
          label={t("kick")}
          title={t("kickConfirmTitle", { username })}
          text={t("kickConfirmText")}
          confirmLabel={t("kick")}
          icon={<UserX className="size-6" />}
          onConfirm={async () => fail(await kickMember(userId))}
        >
          <UserX className="size-4" />
        </ConfirmButton>
      )}
    </div>
  );
}
