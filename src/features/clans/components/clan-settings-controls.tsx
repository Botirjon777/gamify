"use client";

import { useState } from "react";
import { Crown, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { deleteClan, transferLeadership } from "../actions";

const selectClass =
  "h-11 min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 text-sm font-semibold outline-none focus:border-brand focus:ring-4 focus:ring-brand/15";

/** Pick a member and hand over leadership (asks first). */
export function TransferLeadership({ clanId, slug, members }: { clanId: string; slug: string; members: { id: string; username: string }[] }) {
  const t = useTranslations("clans");
  const router = useRouter();
  const [to, setTo] = useState(members[0]?.id ?? "");
  const target = members.find((m) => m.id === to);

  if (!members.length) return <p className="text-sm text-muted">{t("settings.noMembers")}</p>;
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <select aria-label={t("settings.newLeader")} value={to} onChange={(e) => setTo(e.target.value)} className={selectClass}>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.username}
          </option>
        ))}
      </select>
      <ConfirmButton
        className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-border px-4 text-sm font-semibold transition hover:border-brand/40"
        title={t("settings.transferConfirm", { username: target?.username ?? "" })}
        text={t("settings.transferText")}
        confirmLabel={t("settings.transfer")}
        icon={<Crown className="size-6" />}
        onConfirm={async () => {
          const r = await transferLeadership(clanId, to);
          if (!r.ok) return t(`errors.${r.error}`);
          router.push(`/clans/${slug}`);
        }}
      >
        <Crown className="size-4" /> {t("settings.transfer")}
      </ConfirmButton>
    </div>
  );
}

/** Delete for good — type the clan name to unlock the button. */
export function DeleteClan({ clanId, name }: { clanId: string; name: string }) {
  const t = useTranslations("clans");
  const router = useRouter();
  return (
    <ConfirmButton
      className="inline-flex h-11 w-fit items-center gap-1.5 rounded-xl border border-danger/30 px-4 text-sm font-semibold text-danger transition hover:bg-danger/10"
      title={t("settings.deleteConfirm", { name })}
      text={t("settings.deleteText")}
      requireText={name}
      requireLabel={t("settings.typeName", { name })}
      confirmLabel={t("settings.delete")}
      icon={<Trash2 className="size-6" />}
      onConfirm={async () => {
        const r = await deleteClan(clanId, name);
        if (!r.ok) return t(`errors.${r.error}`);
        router.push("/clans");
      }}
    >
      <Trash2 className="size-4" /> {t("settings.delete")}
    </ConfirmButton>
  );
}
