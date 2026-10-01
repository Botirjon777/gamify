import type { GradientKey } from "@/components/icon";

/** Learn page order. A category without published tracks is shown as "coming soon". */
export const CATEGORIES = ["FRONTEND", "BACKEND", "CYBERSECURITY", "LINUX", "NETWORKING", "BASIC", "MIX"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_STYLE: Record<Category, { icon: string; gradient: GradientKey }> = {
  FRONTEND: { icon: "layout", gradient: "brand" },
  BACKEND: { icon: "server", gradient: "success" },
  CYBERSECURITY: { icon: "shield", gradient: "dark" },
  LINUX: { icon: "terminal", gradient: "xp" },
  NETWORKING: { icon: "network", gradient: "iq" },
  BASIC: { icon: "blocks", gradient: "gold" },
  MIX: { icon: "shuffle", gradient: "streak" },
};

/** URL segment ↔ category: /learn/c/frontend */
export const categoryFromSlug = (slug: string): Category | null => CATEGORIES.find((c) => c.toLowerCase() === slug) ?? null;
export const categorySlug = (c: Category) => c.toLowerCase();
