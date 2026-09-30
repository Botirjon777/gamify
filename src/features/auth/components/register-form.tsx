"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { register } from "../actions";
import type { FormState } from "../schemas";

export function RegisterForm({ referralCode }: { referralCode?: string }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState<FormState, FormData>(register, {});
  const err = (key?: string) => (key ? t(`errors.${key}`) : undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      {state.error && (
        <p role="alert" className="rounded-xl bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
          {err(state.error)}
        </p>
      )}
      <Field
        label={t("phone")}
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder={t("phonePlaceholder")}
        defaultValue={state.values?.phone ?? "+998 "}
        error={err(state.fieldErrors?.phone)}
        required
      />
      <Field
        label={t("username")}
        name="username"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        hint={t("usernameHint")}
        defaultValue={state.values?.username}
        error={err(state.fieldErrors?.username)}
        required
      />
      <Field
        label={t("password")}
        name="password"
        type="password"
        autoComplete="new-password"
        hint={t("passwordHint")}
        error={err(state.fieldErrors?.password)}
        minLength={8}
        required
      />
      <Field
        label={t("referral")}
        name="ref"
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        hint={t("referralHint")}
        defaultValue={state.values?.ref ?? referralCode}
        error={err(state.fieldErrors?.ref)}
      />
      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? t("pending") : t("submitRegister")}
      </Button>
    </form>
  );
}
