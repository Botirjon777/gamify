"use client";

import { useState, useTransition } from "react";
import { Plus, Shuffle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { normalizePromoCode } from "@/features/payments/promo-rules";
import { createPromo, setPromoActive } from "../promo-actions";

const input = "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-brand";
/** No 0/O, 1/I/L — easy to read aloud and type on a phone. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-semibold">
      <span>{label}</span>
      {children}
      {hint && <span className="text-xs font-normal text-muted">{hint}</span>}
    </label>
  );
}

/** New promo code. Empty "uses" / "last day" = no limit. */
export function PromoForm() {
  const t = useTranslations("admin.promos");
  const te = useTranslations("admin.errors");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [code, setCode] = useState("");
  const [percent, setPercent] = useState("20");
  const [plan, setPlan] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [lastDay, setLastDay] = useState("");
  const [note, setNote] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const result = await createPromo({
        code,
        percent: Number(percent),
        plan: plan === "PRO" || plan === "DIAMOND" ? plan : null,
        maxUses: maxUses ? Number(maxUses) : null,
        lastDay: lastDay || null,
        note,
      }).catch(() => ({ ok: false as const, error: "invalid" }));
      if (!result.ok) return void toast.error(te(result.error));
      toast.success(t("created", { code: normalizePromoCode(code) }));
      setCode("");
      setNote("");
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      <div className="lg:col-span-2">
        <Field label={t("code")} hint={t("codeHint")}>
          <div className="flex gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required minLength={3} maxLength={24} spellCheck={false} className={`${input} font-mono uppercase`} />
            <button
              type="button"
              aria-label={t("random")}
              title={t("random")}
              onClick={() => setCode(Array.from(crypto.getRandomValues(new Uint8Array(8)), (n) => ALPHABET[n % ALPHABET.length]).join(""))}
              className="grid size-10 shrink-0 place-items-center rounded-xl border border-border text-muted hover:border-brand/40 hover:text-foreground"
            >
              <Shuffle className="size-4" />
            </button>
          </div>
        </Field>
      </div>
      <Field label={t("percent")}>
        <input type="number" min={1} max={100} value={percent} onChange={(e) => setPercent(e.target.value)} required className={input} />
      </Field>
      <Field label={t("plan")}>
        <select value={plan} onChange={(e) => setPlan(e.target.value)} className={input}>
          <option value="">{t("anyPlan")}</option>
          <option value="PRO">Pro</option>
          <option value="DIAMOND">Diamond</option>
        </select>
      </Field>
      <Field label={t("maxUses")}>
        <input type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder={t("unlimited")} className={input} />
      </Field>
      <Field label={t("lastDay")}>
        <input type="date" value={lastDay} onChange={(e) => setLastDay(e.target.value)} className={input} />
      </Field>
      <div className="sm:col-span-2 lg:col-span-5">
        <Field label={t("note")}>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder={t("notePlaceholder")} className={input} />
        </Field>
      </div>
      <div className="flex items-end">
        <Button type="submit" disabled={pending} className="h-10 w-full">
          <Plus className="size-4" /> {t("create")}
        </Button>
      </div>
    </form>
  );
}

/** On / off switch in the list. */
export function PromoToggle({ id, active }: { id: string; active: boolean }) {
  const t = useTranslations("admin.promos");
  const te = useTranslations("admin.errors");
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={t("active")}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await setPromoActive(id, !active).catch(() => ({ ok: false as const, error: "invalid" }));
          if (!result.ok) return void toast.error(te(result.error));
          router.refresh();
        })
      }
      className={`relative h-6 w-11 rounded-full transition disabled:opacity-60 ${active ? "bg-success" : "bg-border"}`}
    >
      <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${active ? "left-5.5" : "left-0.5"}`} />
    </button>
  );
}
