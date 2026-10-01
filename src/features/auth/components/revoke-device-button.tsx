"use client";

import { MonitorX } from "lucide-react";
import { useTranslations } from "next-intl";
import { buttonClass } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { revokeAllOtherDevices, revokeDevice } from "../actions";

/** Sign out one other device, or all other devices — asks first. */
export function RevokeDeviceButton({ sessionId, className = "" }: { sessionId?: string; className?: string }) {
  const t = useTranslations("devices");
  const all = !sessionId;
  return (
    <ConfirmButton
      className={buttonClass("danger", className)}
      title={all ? t("revokeAllConfirm") : t("revokeConfirm")}
      text={t("revokeConfirmText")}
      confirmLabel={all ? t("revokeAll") : t("revoke")}
      icon={<MonitorX className="size-6" />}
      onConfirm={async () => {
        await (all ? revokeAllOtherDevices() : revokeDevice(sessionId));
      }}
    >
      {all ? t("revokeAll") : t("revoke")}
    </ConfirmButton>
  );
}
