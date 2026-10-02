"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Pencil, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { copyText } from "@/lib/clipboard";
import { useRouter } from "@/i18n/navigation";
import { Button, buttonClass } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { savePartner, setPartnerActive } from "../partner-actions";
import { slugify } from "./cms-ui";

const input = "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-brand";

export interface PartnerData {
  id: string;
  code: string;
  name: string;
  contact: string;
  note: string;
}

/** New partner, or edit one (`partner` given; `onDone` closes the editor). `origin`: site address shown in front of the code. */
export function PartnerForm({ partner, origin, onDone }: { partner?: PartnerData; origin: string; onDone?: () => void }) {
  const t = useTranslations("admin.partners");
  const te = useTranslations("admin.errors");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState(partner?.name ?? "");
  const [code, setCode] = useState(partner?.code ?? "");
  const [contact, setContact] = useState(partner?.contact ?? "");
  const [note, setNote] = useState(partner?.note ?? "");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const result = await savePartner({ code, name, contact, note }, partner?.id).catch(() => ({ ok: false as const, error: "invalid" }));
      if (!result.ok) return void toast.error(te(result.error));
      toast.success(partner ? t("saved") : t("created", { name }));
      if (!partner) {
        setName("");
        setCode("");
        setContact("");
        setNote("");
      }
      onDone?.();
      router.refresh();
    });
  };
  const label = "flex flex-col gap-1 text-sm font-semibold";

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <label className={label}>
        <span>{t("name")}</span>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            // A new partner's code follows the name until it is edited by hand.
            if (!partner && code === slugify(name)) setCode(slugify(e.target.value));
          }}
          required
          minLength={2}
          maxLength={80}
          className={input}
        />
      </label>
      <label className={label}>
        <span>{t("code")}</span>
        <div className="flex items-center gap-1.5">
          <span className="hidden shrink-0 text-xs font-normal text-muted sm:inline">{origin.replace(/^https?:\/\//, "")}/p/</span>
          <input value={code} onChange={(e) => setCode(e.target.value.toLowerCase())} required minLength={2} maxLength={40} pattern="[a-z0-9\-]+" spellCheck={false} className={`${input} font-mono`} />
        </div>
        {partner && <span className="text-xs font-normal text-muted">{t("codeChangeHint")}</span>}
      </label>
      <label className={label}>
        <span>{t("contact")}</span>
        <input value={contact} onChange={(e) => setContact(e.target.value)} maxLength={120} placeholder={t("contactPlaceholder")} className={input} />
      </label>
      <label className={label}>
        <span>{t("note")}</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} className={input} />
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" disabled={pending} className="h-10">
          {!partner && <Plus className="size-4" />} {partner ? t("save") : t("create")}
        </Button>
        {onDone && (
          <button type="button" onClick={onDone} disabled={pending} className={buttonClass("secondary", "h-10")}>
            {t("cancel")}
          </button>
        )}
      </div>
    </form>
  );
}

/** Row controls: copy the link, edit in place, switch on / off. */
export function PartnerRowControls({ partner, active, origin }: { partner: PartnerData; active: boolean; origin: string }) {
  const t = useTranslations("admin.partners");
  const te = useTranslations("admin.errors");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const link = `${origin}/p/${partner.code}`;
  const iconButton = "grid size-9 place-items-center rounded-lg border border-border text-muted hover:border-brand/40 hover:text-foreground";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg bg-background px-2.5 py-2 text-xs">{link}</code>
        <button
          type="button"
          aria-label={t("copy")}
          title={t("copy")}
          className={iconButton}
          onClick={async () => {
            if (!(await copyText(link))) return;
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
        </button>
        <button type="button" aria-label={t("edit")} title={t("edit")} className={iconButton} onClick={() => setEditing(!editing)}>
          <Pencil className="size-4" />
        </button>
        <button
          type="button"
          role="switch"
          aria-checked={active}
          aria-label={t("active")}
          title={t("active")}
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await setPartnerActive(partner.id, !active).catch(() => ({ ok: false as const, error: "invalid" }));
              if (!result.ok) return void toast.error(te(result.error));
              router.refresh();
            })
          }
          className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-60 ${active ? "bg-success" : "bg-border"}`}
        >
          <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${active ? "left-5.5" : "left-0.5"}`} />
        </button>
      </div>
      {editing && <PartnerForm partner={partner} origin={origin} onDone={() => setEditing(false)} />}
    </div>
  );
}
