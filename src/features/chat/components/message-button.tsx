"use client";

import { useTransition } from "react";
import { MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { startDirectChat } from "../actions";

/** "Xabar yozish" — opens (or starts) the direct chat with a friend. */
export function MessageButton({ userId, className }: { userId: string; className?: string }) {
  const t = useTranslations("chat");
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={className}
      onClick={() =>
        start(async () => {
          const r = await startDirectChat(userId);
          if (r.redirectTo) router.push(r.redirectTo);
        })
      }
    >
      <MessageCircle className="size-4" /> {t("write")}
    </button>
  );
}
