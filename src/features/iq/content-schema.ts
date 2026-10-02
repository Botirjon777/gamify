/** Format of content/iq/*.yaml (shared by the sync scripts and the app — no server-only imports). */
import { z } from "zod";
import type { LocalizedText } from "@/i18n/content";
import { MEDIA_PATH } from "@/lib/media";

const localized = z
  // Only known language codes as keys: an unquoted "a: b" in YAML becomes {a: "b"} and must fail, not lose text.
  .union([z.string().min(1), z.partialRecord(z.enum(["uz", "ru", "en"]), z.string().min(1))])
  .transform((v): LocalizedText => (typeof v === "string" ? { uz: v } : v));

export const IQ_CATEGORIES = ["sequence", "letters", "shapes", "matrix", "analogy", "odd", "logic", "math"] as const;
export const IQ_MAX_OPTIONS = 8;

/** A picture in the media store, e.g. "iq/sandia/s001.png" (see lib/media.ts). */
const mediaPath = z.string().regex(MEDIA_PATH, "not a media path (lowercase folders/name.png|jpg|webp|svg)");

/** One picture holding all the answers as a grid of equal square cells, read left to right, top to bottom. */
const optionsImage = z.object({ src: mediaPath, columns: z.number().int().min(1).max(IQ_MAX_OPTIONS), rows: z.number().int().min(1).max(4) });
export type IqOptionsImage = z.infer<typeof optionsImage>;

export const iqItemDef = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    category: z.enum(IQ_CATEGORIES),
    difficulty: z.number().int().min(1).max(5),
    prompt: localized,
    /** Big centered line: a sequence or a shape pattern. */
    figure: z.string().optional(),
    /** The question as a picture. */
    image: mediaPath.optional(),
    /** Left out when the answers are a picture: they are then just numbered. */
    options: z.array(localized).min(2).max(IQ_MAX_OPTIONS).optional(),
    optionsImage: optionsImage.optional(),
    answer: z.number().int().min(0),
    /** Drafts are never served in a test. */
    status: z.enum(["DRAFT", "PUBLISHED"]).default("PUBLISHED"),
  })
  .transform((item, ctx) => {
    const cells = item.optionsImage ? item.optionsImage.columns * item.optionsImage.rows : 0;
    if (item.optionsImage && (cells < 2 || cells > IQ_MAX_OPTIONS)) ctx.addIssue({ code: "custom", message: `2–${IQ_MAX_OPTIONS} cells`, path: ["optionsImage"] });
    if (item.optionsImage && item.options && item.options.length !== cells) ctx.addIssue({ code: "custom", message: "one option per cell of the picture", path: ["options"] });
    if (!item.optionsImage && !item.options) ctx.addIssue({ code: "custom", message: "options or optionsImage is required", path: ["options"] });
    const options = item.options ?? numberedOptions(cells);
    if (item.answer >= options.length) ctx.addIssue({ code: "custom", message: "answer index out of range", path: ["answer"] });
    return { ...item, options };
  });

export const iqFile = z.object({ items: z.array(iqItemDef).min(1) });
/** content/iq: text questions, and questions with pictures (those are bulk-made — see scripts/iq-collect.py). */
export const IQ_FILES = { text: "items.yaml", pictures: "pictures.yaml" } as const;
export type IqItemDef = z.infer<typeof iqItemDef>;

/** Public part stored in IqItem.content. Pictures are media paths. */
export type IqPublicContent = { prompt: LocalizedText; figure?: string; image?: string; options: LocalizedText[]; optionsImage?: IqOptionsImage };

export const numberedOptions = (count: number): LocalizedText[] => Array.from({ length: count }, (_, i) => ({ uz: String(i + 1) }));

/** Options that only number the cells of the answers picture — not worth writing into the file. */
export const isNumbered = (options: LocalizedText[]) => options.every((o, i) => Object.keys(o).length === 1 && o.uz === String(i + 1));

export const toIqContent = (item: IqItemDef): IqPublicContent => ({
  prompt: item.prompt,
  figure: item.figure,
  image: item.image,
  options: item.options,
  optionsImage: item.optionsImage,
});

/** Starting Elo rating per difficulty; afterwards items calibrate themselves. */
export const INITIAL_ITEM_RATING: Record<number, number> = { 1: 700, 2: 850, 3: 1000, 4: 1150, 5: 1300 };
