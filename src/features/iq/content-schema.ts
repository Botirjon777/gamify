/** Format of content/iq/items.yaml (shared by the sync script and the app — no server-only imports). */
import { z } from "zod";
import type { LocalizedText } from "@/i18n/content";

const localized = z
  // Only known language codes as keys: an unquoted "a: b" in YAML becomes {a: "b"} and must fail, not lose text.
  .union([z.string().min(1), z.partialRecord(z.enum(["uz", "ru", "en"]), z.string().min(1))])
  .transform((v): LocalizedText => (typeof v === "string" ? { uz: v } : v));

export const IQ_CATEGORIES = ["sequence", "letters", "shapes", "analogy", "odd", "logic", "math"] as const;

export const iqItemDef = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    category: z.enum(IQ_CATEGORIES),
    difficulty: z.number().int().min(1).max(5),
    prompt: localized,
    /** Big centered line: a sequence or a shape pattern. */
    figure: z.string().optional(),
    options: z.array(localized).min(2).max(6),
    answer: z.number().int().min(0),
    /** Drafts are never served in a test. */
    status: z.enum(["DRAFT", "PUBLISHED"]).default("PUBLISHED"),
  })
  .refine((i) => i.answer < i.options.length, { message: "answer index out of range", path: ["answer"] });

export const iqFile = z.object({ items: z.array(iqItemDef).min(1) });
export type IqItemDef = z.infer<typeof iqItemDef>;

/** Public part stored in IqItem.content. */
export type IqPublicContent = { prompt: LocalizedText; figure?: string; options: LocalizedText[] };

/** Starting Elo rating per difficulty; afterwards items calibrate themselves. */
export const INITIAL_ITEM_RATING: Record<number, number> = { 1: 700, 2: 850, 3: 1000, 4: 1150, 5: 1300 };
