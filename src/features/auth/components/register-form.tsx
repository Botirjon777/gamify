"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useRedirectTo } from "@/components/use-redirect-to";
import { GenderPicker } from "@/features/profile/components/gender-picker";
import { register } from "../actions";
import type { FormState } from "../schemas";

export function RegisterForm({ referralCode }: { referralCode?: string }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState<FormState, FormData>(register, {});
  useRedirectTo(state.redirectTo);
  const err = (key?: string) => (key ? t(`errors.${key}`) : undefined);
  // Username drives the avatar preview in the gender cards.
  const [username, setUsername] = useState(state.values?.username ?? "");

  return (
    <form action={action} className="flex flex-col gap-4">
      {state.error && (
        <p role="alert" className="rounded-xl bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
          {err(state.error)}
        </p>
      )}
      <GenderPicker
        name="gender"
        seed={username.trim().toLowerCase() || "zukkolar"}
        defaultValue={state.values?.gender}
        label={t("gender")}
        hint={t("genderHint")}
        error={err(state.fieldErrors?.gender)}
      />
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
        value={username}
        onChange={(e) => setUsername(e.target.value)}
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
      <Button type="submit" disabled={pending || !!state.redirectTo} className="mt-2">
        {pending ? t("pending") : t("submitRegister")}
      </Button>
    </form>
  );
}
