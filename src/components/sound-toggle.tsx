"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useTranslations } from "next-intl";
import { playSound, setSoundEnabled, useSoundEnabled } from "@/lib/sound";

/** Speaker button: sound effects on / off (remembered on this device). */
export function SoundToggle({ className = "" }: { className?: string }) {
  const t = useTranslations("common");
  const on = useSoundEnabled();
  const label = on ? t("soundOff") : t("soundOn");
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={on}
      onClick={() => {
        setSoundEnabled(!on);
        // Hear what was just switched on.
        if (!on) playSound("tap");
      }}
      className={`grid size-9 shrink-0 place-items-center rounded-xl text-muted hover:bg-surface hover:text-foreground ${className}`}
    >
      {on ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
    </button>
  );
}

/** The same setting as a labelled switch, for the settings page. */
export function SoundSwitch({ label, text }: { label: string; text: string }) {
  const on = useSoundEnabled();
  return (
    <div className="flex items-center gap-4">
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{label}</span>
        <span className="block text-sm text-muted">{text}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => {
          setSoundEnabled(!on);
          if (!on) playSound("correct");
        }}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? "bg-success" : "bg-border"}`}
      >
        <span className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-all ${on ? "left-5.5" : "left-0.5"}`} />
      </button>
    </div>
  );
}
