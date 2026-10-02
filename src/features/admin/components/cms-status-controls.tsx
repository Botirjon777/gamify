"use client";

import { useTranslations } from "next-intl";
import type { ContentStatus } from "@/generated/prisma/enums";
import { setCmsStatus } from "../cms-actions";
import { useCmsAction } from "./cms-ui";

const STATUSES: ContentStatus[] = ["PUBLISHED", "DRAFT", "ARCHIVED"];
const STYLE: Record<ContentStatus, string> = {
  PUBLISHED: "border-success/40 bg-success/10 text-success",
  DRAFT: "border-xp/40 bg-xp/10 text-xp",
  ARCHIVED: "border-danger/40 bg-danger/10 text-danger",
};

export function StatusBadge({ status }: { status: ContentStatus }) {
  const t = useTranslations("admin.cms");
  return <span className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-semibold ${STYLE[status]}`}>{t(`status.${status}`)}</span>;
}

/** Publish / draft / archive straight from a list row. */
export function StatusToggle({ id, status, kind }: { id: string; status: ContentStatus; kind: "track" | "exercise" | "iq" }) {
  const t = useTranslations("admin.cms");
  const { pending, run } = useCmsAction();
  return (
    <select
      value={status}
      disabled={pending}
      aria-label={t("statusLabel")}
      onChange={(e) => {
        const next = e.target.value;
        run(() => setCmsStatus(kind, id, next), t("statusSaved"));
      }}
      className={`h-8 cursor-pointer rounded-lg border px-2 text-xs font-bold outline-none transition disabled:opacity-60 ${STYLE[status]}`}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s} className="bg-surface text-foreground">
          {t(`status.${s}`)}
        </option>
      ))}
    </select>
  );
}

/** <option>s for a status <select> inside a form. */
export function StatusOptions() {
  const t = useTranslations("admin.cms");
  return STATUSES.map((s) => (
    <option key={s} value={s}>
      {t(`status.${s}`)}
    </option>
  ));
}
