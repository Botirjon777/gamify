"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useRedirectTo } from "@/components/use-redirect-to";
import { CLAN_COLORS, CLAN_EMBLEMS, GRADIENTS, IconTile, type GradientKey } from "@/components/icon";
import { createClan, type ClanFormState } from "../actions";

export function CreateClanForm() {
  const t = useTranslations("clans");
  const [state, action, pending] = useActionState<ClanFormState, FormData>(createClan, {});
  useRedirectTo(state.redirectTo);
  const [emblem, setEmblem] = useState<string>(state.values?.emblem ?? "shield");
  const [color, setColor] = useState<GradientKey>((state.values?.color as GradientKey) ?? "brand");
  const [name, setName] = useState(state.values?.name ?? "");
  const [tag, setTag] = useState(state.values?.tag ?? "");
  const err = (key?: string) => (key ? t(`errors.${key}`) : undefined);

  return (
    <form action={action} className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-5">
        {state.error && <p className="rounded-xl bg-danger/10 px-3.5 py-2.5 text-sm text-danger">{err(state.error)}</p>}
        <Field label={t("form.name")} name="name" placeholder={t("form.namePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} error={err(state.fieldErrors?.name)} required />
        <Field
          label={t("form.tag")}
          name="tag"
          hint={t("form.tagHint")}
          value={tag}
          maxLength={5}
          onChange={(e) => setTag(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
          error={err(state.fieldErrors?.tag)}
          required
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">{t("form.description")}</span>
          <textarea
            name="description"
            maxLength={200}
            rows={3}
            defaultValue={state.values?.description}
            placeholder={t("form.descriptionPlaceholder")}
            className="rounded-xl border border-border bg-surface px-3.5 py-2.5 text-base outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15"
          />
        </label>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">{t("form.emblem")}</legend>
          <input type="hidden" name="emblem" value={emblem} />
          <div className="flex flex-wrap gap-2">
            {CLAN_EMBLEMS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmblem(e)}
                aria-pressed={emblem === e}
                className={`rounded-2xl p-1 transition ${emblem === e ? "ring-2 ring-brand ring-offset-2" : "opacity-70 hover:opacity-100"}`}
              >
                <IconTile name={e} gradient={color} size="md" />
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">{t("form.color")}</legend>
          <input type="hidden" name="color" value={color} />
          <div className="flex flex-wrap gap-2">
            {CLAN_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-pressed={color === c}
                aria-label={c}
                className={`size-10 rounded-full ${GRADIENTS[c]} transition ${color === c ? "ring-2 ring-brand ring-offset-2" : ""}`}
              />
            ))}
          </div>
        </fieldset>

        <Button type="submit" disabled={pending || !!state.redirectTo} className="h-12 w-full sm:w-fit sm:px-10">
          {t("form.submit")}
        </Button>
      </div>

      {/* Live preview */}
      <div className="h-fit rounded-3xl border border-border bg-surface p-6 text-center lg:sticky lg:top-24">
        <IconTile name={emblem} gradient={color} size="xl" className="mx-auto" />
        <p className="mt-4 font-display text-xl font-bold">{name || t("form.namePlaceholder")}</p>
        <p className="mt-1 text-sm font-bold text-muted">[{tag || "TAG"}]</p>
      </div>
    </form>
  );
}
