"use server";

import { revalidatePath } from "next/cache";
import { audit, requireAdmin } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { settingsInput, toRows, type SettingsInput } from "@/features/settings/rules";
import { saveSettings } from "@/features/settings/service";

/** `error` is the field that failed (a key under admin.settings.errors), or "invalid". */
export type SettingsResult = { ok: true } | { ok: false; error: string };

/** Payment card, Telegram contact and the IQ price — applied on the site at once. */
export async function updateSettings(input: SettingsInput): Promise<SettingsResult> {
  const { user: admin } = await requireAdmin();
  const parsed = settingsInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: String(parsed.error.issues[0]?.path[0] ?? "invalid") };

  await saveSettings(toRows(parsed.data), admin.id);
  // The card number itself stays out of the audit log; what changed can be seen in the settings.
  await audit(db, admin.id, "settings.update", null, { iqPriceUzs: parsed.data.iqPriceUzs, iqOldPriceUzs: parsed.data.iqOldPriceUzs });
  revalidatePath("/", "layout");
  return { ok: true };
}
