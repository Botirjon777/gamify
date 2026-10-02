import type { GradientKey } from "@/components/icon";
import { CATEGORIES, CATEGORY_STYLE, type Category } from "./categories";

/**
 * Top level of the catalog: Subject → (Category) → Track → Module → Skill.
 * Also what users pick as their interests. A subject without published tracks is shown as "coming soon".
 */
export const SUBJECTS = ["PROGRAMMING", "MATH", "GEOMETRY", "PHYSICS", "CHEMISTRY", "BIOLOGY", "CHESS"] as const;
export type Subject = (typeof SUBJECTS)[number];

export const SUBJECT_STYLE: Record<Subject, { icon: string; gradient: GradientKey }> = {
  PROGRAMMING: { icon: "code", gradient: "brand" },
  MATH: { icon: "calculator", gradient: "iq" },
  GEOMETRY: { icon: "triangle", gradient: "gold" },
  PHYSICS: { icon: "atom", gradient: "xp" },
  CHEMISTRY: { icon: "flask", gradient: "success" },
  BIOLOGY: { icon: "dna", gradient: "streak" },
  CHESS: { icon: "chess", gradient: "dark" },
};

/** Subjects split into categories (a step between the subject and its tracks). The others list their tracks directly. */
export const SUBJECT_CATEGORIES: Record<Subject, readonly Category[]> = {
  PROGRAMMING: CATEGORIES,
  MATH: [],
  GEOMETRY: [],
  PHYSICS: [],
  CHEMISTRY: [],
  BIOLOGY: [],
  CHESS: [],
};

export const subjectOfCategory = (category: Category): Subject => SUBJECTS.find((s) => SUBJECT_CATEGORIES[s].includes(category))!;

/** URL segment ↔ subject: /learn/s/math */
export const subjectFromSlug = (slug: string): Subject | null => SUBJECTS.find((s) => s.toLowerCase() === slug) ?? null;
export const subjectSlug = (s: Subject) => s.toLowerCase();

/** Keeps only known subjects, without duplicates, in catalog order (what is stored in User.interests). */
export const normalizeInterests = (values: readonly string[]): Subject[] => SUBJECTS.filter((s) => values.includes(s));

// ─── Groups: where a track is listed (landing page, duel topic picker) ──────

/** A subject's category, or the subject itself when it has no categories. */
export interface TrackGroup {
  subject: Subject;
  category: Category | null;
}

export const TRACK_GROUPS: TrackGroup[] = SUBJECTS.flatMap((subject): TrackGroup[] =>
  SUBJECT_CATEGORIES[subject].length ? SUBJECT_CATEGORIES[subject].map((category) => ({ subject, category })) : [{ subject, category: null }],
);

export const groupKey = (g: TrackGroup) => g.category ?? g.subject;
export const groupStyle = (g: TrackGroup) => (g.category ? CATEGORY_STYLE[g.category] : SUBJECT_STYLE[g.subject]);
/** Key under the `learn` messages with the group's `title` and `text`. */
export const groupMessageKey = (g: TrackGroup) => (g.category ? (`categories.${g.category}` as const) : (`subjects.${g.subject}` as const));
export const inGroup = (g: TrackGroup, track: { subject: Subject; category: Category | null }) =>
  track.subject === g.subject && track.category === g.category;

/** Where "back" from a track goes: its category page, or its subject page. */
export const trackParentHref = (track: { subject: Subject; category: Category | null }) =>
  track.category ? `/learn/c/${track.category.toLowerCase()}` : `/learn/s/${subjectSlug(track.subject)}`;
