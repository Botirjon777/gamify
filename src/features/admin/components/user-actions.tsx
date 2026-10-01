"use client";

import { useState, useTransition } from "react";
import { Ban, Check, KeyRound, LogOut, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { adjustXp, resetPassword, revokeUserSessions, setBlocked, setUserPlan, type AdminResult } from "../actions";

const btn = "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:opacity-60";
const input = "h-10 rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/15";

function useAdminAction() {
  const t = useTranslations("admin");
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const run = <T,>(fn: () => Promise<AdminResult<T>>, onOk?: (r: T) => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        setMessage({ ok: true, text: t("user.done") });
        onOk?.(r as T);
      } else setMessage({ ok: false, text: t(`errors.${r.error}`) });
    });
  const feedback = message && (
    <p className={`text-sm font-semibold ${message.ok ? "text-success" : "text-danger"}`}>{message.text}</p>
  );
  return { pending, run, feedback };
}

export function PlanControl({ userId, plan }: { userId: string; plan: string }) {
  const t = useTranslations("admin.user");
  const { pending, run, feedback } = useAdminAction();
  const [value, setValue] = useState(plan);
  const [days, setDays] = useState(30);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <select value={value} onChange={(e) => setValue(e.target.value)} className={input} aria-label={t("plan")}>
          <option value="FREE">Free</option>
          <option value="PRO">Pro</option>
          <option value="DIAMOND">Diamond</option>
        </select>
        {value !== "FREE" && (
          <label className="flex items-center gap-2 text-sm">
            <input type="number" min={1} max={3650} value={days} onChange={(e) => setDays(Number(e.target.value))} className={`${input} w-24`} />
            {t("days")}
          </label>
        )}
        <button className={`${btn} bg-grad-brand text-white`} disabled={pending} onClick={() => run(() => setUserPlan(userId, value, days))}>
          <Check className="size-4" /> {t("apply")}
        </button>
      </div>
      {feedback}
    </div>
  );
}

export function AccountControls({ userId, blocked, canModerate }: { userId: string; blocked: boolean; canModerate: boolean }) {
  const t = useTranslations("admin.user");
  const { pending, run, feedback } = useAdminAction();
  const [temp, setTemp] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {canModerate && blocked && (
          <button className={`${btn} border border-border bg-surface`} disabled={pending} onClick={() => run(() => setBlocked(userId, false))}>
            <ShieldCheck className="size-4" /> {t("unblock")}
          </button>
        )}
        {canModerate && !blocked && (
          <ConfirmButton
            className={`${btn} border border-danger/30 text-danger hover:bg-danger/10`}
            disabled={pending}
            title={t("blockConfirm")}
            confirmLabel={t("block")}
            icon={<Ban className="size-6" />}
            onConfirm={async () => run(() => setBlocked(userId, true))}
          >
            <Ban className="size-4" /> {t("block")}
          </ConfirmButton>
        )}
        <ConfirmButton
          className={`${btn} border border-border bg-surface`}
          disabled={pending}
          title={t("resetConfirm")}
          confirmLabel={t("resetPassword")}
          icon={<KeyRound className="size-6" />}
          onConfirm={async () => run(() => resetPassword(userId), (r) => setTemp(r.tempPassword))}
        >
          <KeyRound className="size-4" /> {t("resetPassword")}
        </ConfirmButton>
        <button className={`${btn} border border-border bg-surface`} disabled={pending} onClick={() => run(() => revokeUserSessions(userId))}>
          <LogOut className="size-4" /> {t("revokeSessions")}
        </button>
      </div>
      {temp && (
        <div className="rounded-xl bg-xp/10 p-3 text-sm">
          {t("tempPassword")} <code className="ml-1 select-all rounded bg-surface px-2 py-1 font-mono text-base font-bold">{temp}</code>
        </div>
      )}
      {feedback}
    </div>
  );
}

export function XpControl({ userId }: { userId: string }) {
  const t = useTranslations("admin.user");
  const { pending, run, feedback } = useAdminAction();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" placeholder={t("xpAmount")} className={`${input} w-52`} />
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("xpReason")} className={`${input} min-w-0 flex-1`} />
        <button
          className={`${btn} bg-grad-xp text-white`}
          disabled={pending || !amount || !reason}
          onClick={() => run(() => adjustXp(userId, Number(amount), reason), () => (setAmount(""), setReason("")))}
        >
          <Check className="size-4" /> {t("apply")}
        </button>
      </div>
      {feedback}
    </div>
  );
}
