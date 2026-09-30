"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useRedirectTo } from "@/components/use-redirect-to";
import { login } from "../actions";
import type { FormState } from "../schemas";

export function LoginForm() {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState<FormState, FormData>(login, {});
  useRedirectTo(state.redirectTo);
  const err = (key?: string) => (key ? t(`errors.${key}`) : undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      {state.error && (
        <p role="alert" className="rounded-xl bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
          {err(state.error)}
        </p>
      )}
      <Field
        label={t("identifier")}
        name="identifier"
        autoComplete="username"
        defaultValue={state.values?.identifier}
        error={err(state.fieldErrors?.identifier)}
        required
      />
      <Field
        label={t("password")}
        name="password"
        type="password"
        autoComplete="current-password"
        error={err(state.fieldErrors?.password)}
        required
      />
      <Button type="submit" disabled={pending || !!state.redirectTo} className="mt-2">
        {pending ? t("pending") : t("submitLogin")}
      </Button>
    </form>
  );
}
