"use client";

import { useActionState, useCallback, useState } from "react";
import { Check, Copy, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { copyText } from "@/lib/clipboard";
import { useRouter } from "@/i18n/navigation";
import { Button, buttonClass } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useRedirectTo } from "@/components/use-redirect-to";
import { playSound } from "@/lib/sound";
import { answerGuestIq, startGuestIq, type GuestIqStep, type GuestStartState } from "../guest-actions";
import type { IqQuestion } from "../types";
import { IqQuestionView } from "./iq-test";

/** Before the test: who is taking it. `refCode` comes from a share link (/iq-test?r=…). */
export function GuestIqForm({ refCode }: { refCode?: string }) {
  const t = useTranslations("guestIq");
  const [state, action, pending] = useActionState<GuestStartState, FormData>(startGuestIq, {});
  useRedirectTo(state.redirectTo);
  const err = (key?: string) => (key ? t(`errors.${key}`) : undefined);

  return (
    <form action={action} className="flex flex-col gap-4 text-left">
      {state.error && (
        <p role="alert" className="rounded-xl bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
          {err(state.error)}
        </p>
      )}
      <input type="hidden" name="ref" value={state.values?.ref ?? refCode ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("firstName")} name="firstName" autoComplete="given-name" defaultValue={state.values?.firstName} error={err(state.fieldErrors?.firstName)} required maxLength={40} />
        <Field label={t("lastName")} name="lastName" autoComplete="family-name" defaultValue={state.values?.lastName} error={err(state.fieldErrors?.lastName)} required maxLength={40} />
      </div>
      <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
        <Field label={t("age")} name="age" type="number" inputMode="numeric" min={6} max={99} defaultValue={state.values?.age} error={err(state.fieldErrors?.age)} required />
        <Field
          label={t("phone")}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+998 90 123 45 67"
          defaultValue={state.values?.phone ?? "+998 "}
          error={err(state.fieldErrors?.phone)}
          required
        />
      </div>
      <Button type="submit" disabled={pending || !!state.redirectTo} className="mt-2 h-12 text-base">
        {pending ? t("starting") : t("start")}
      </Button>
    </form>
  );
}

/** The questions, one at a time. When the last one is answered the page re-renders into the result screen. */
export function GuestIqRunner({ token, initial }: { token: string; initial: IqQuestion }) {
  const router = useRouter();
  const [question, setQuestion] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  /** Returns false when the request failed (the person may answer again). */
  const answer = useCallback(
    async (choice: number | null) => {
      setBusy(true);
      setError(false);
      let step: GuestIqStep;
      try {
        step = await answerGuestIq(token, question.itemId, choice);
      } catch {
        setError(true);
        setBusy(false);
        return false;
      }
      if (step.status === "FINISHED") {
        playSound("complete");
        router.refresh();
        return true; // stays "busy" until the result screen replaces this component
      }
      setQuestion(step.question);
      setBusy(false);
      return true;
    },
    [token, question.itemId, router],
  );

  return <IqQuestionView key={question.itemId} question={question} busy={busy} error={error} onAnswer={answer} />;
}

/** A value with a copy button (card number, code, link). */
export function CopyField({ value, copyValue, label, mono = true }: { value: string; copyValue?: string; label: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={async () => {
        if (!(await copyText(copyValue ?? value))) return;
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-background px-3.5 py-2.5 text-left transition hover:border-brand/40"
    >
      <span className={`min-w-0 truncate font-bold ${mono ? "font-mono tracking-wider" : ""}`}>{value}</span>
      {copied ? <Check className="size-4 shrink-0 text-success" /> : <Copy className="size-4 shrink-0 text-muted" />}
    </button>
  );
}

/** "Send the receipt in Telegram": opens the chat with the message (and the code) already typed. */
export function TelegramButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener" className={buttonClass("primary", "h-12 w-full text-base")}>
      <Send className="size-5" /> {children}
    </a>
  );
}
