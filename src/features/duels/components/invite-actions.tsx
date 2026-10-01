"use client";

import { useState, useTransition } from "react";
import { Swords, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button, buttonClass } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { acceptDuelAction, declineDuelAction } from "../actions";

/** Opponent's choice: accept (then play) or decline (asks first). */
export function InviteActions({ duelId, username }: { duelId: string; username: string }) {
  const t = useTranslations("duels");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-3">
        <ConfirmButton
          className={buttonClass("secondary", "h-12")}
          disabled={pending}
          title={t("declineConfirm", { username })}
          confirmLabel={t("decline")}
          icon={<X className="size-6" />}
          onConfirm={async () => {
            const r = await declineDuelAction(duelId);
            if (r.error) return t(`errors.${r.error}`);
            router.refresh();
          }}
        >
          <X className="size-4" /> {t("decline")}
        </ConfirmButton>
        <Button
          className="animate-glow h-12"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await acceptDuelAction(duelId);
              if (r.error) setError(t(`errors.${r.error}`));
              else router.refresh();
            })
          }
        >
          <Swords className="size-4" /> {t("accept")}
        </Button>
      </div>
      {error && <p className="text-center text-sm font-semibold text-danger">{error}</p>}
    </div>
  );
}
