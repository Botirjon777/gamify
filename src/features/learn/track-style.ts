import type { GradientKey } from "@/components/icon";

/** Tile colour per track (content tracks only carry an icon name). */
export const TRACK_GRADIENTS: Record<string, GradientKey> = {
  html: "streak",
  css: "iq",
  javascript: "gold",
  typescript: "brand",
  react: "iq",
  cpp: "dark",
  python: "success",
  csharp: "xp",
  cybersecurity: "dark",
};
