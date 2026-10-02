"use server";

import { getLocale } from "next-intl/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getClientIp } from "@/lib/auth/session";
import { normalizePhone } from "@/lib/auth/phone";
import { getRateLimiter } from "@/lib/rate-limit";
import { getCurrentTenant, isDefaultTenant } from "@/lib/tenant";
import { partnerFromCookie } from "@/features/partners/service";
import { GUEST_IQ_QUESTIONS, guestQuestion, newGuestCode, newGuestToken, normalizeGuestCode } from "./guest";
import { iqFromRating, pickIqItem, START_RATING, updateRatings, userK } from "./rating";
import { isInTime } from "./service";
import type { IqQuestion } from "./types";

const nameSchema = z
  .string()
  .trim()
  .min(2, "nameShort")
  .max(40, "nameLong")
  // Letters of any alphabet (Latin, Cyrillic), spaces, apostrophes and hyphens.
  .regex(/^[\p{L}\s'ʻʼ’`-]+$/u, "nameLetters");

const startSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  age: z.coerce.number({ error: "ageInvalid" }).int("ageInvalid").min(6, "ageInvalid").max(99, "ageInvalid"),
  phone: z.string().trim().min(1, "required"),
  /** Share-link code of the guest who sent them here. */
  ref: z.string().max(20).optional(),
});

export type GuestStartState = {
  /** Where to go after success: the test page. */
  redirectTo?: string;
  error?: "tooMany" | "noQuestions" | "closed";
  fieldErrors?: Partial<Record<"firstName" | "lastName" | "age" | "phone", string>>;
  values?: Record<string, string>;
};

const published = { status: "PUBLISHED" as const };
const itemPool = () => db.iqItem.findMany({ where: published, select: { id: true, category: true, rating: true } });

/** The form before the test: name, surname, age, phone → a new test with its first question. */
export async function startGuestIq(_prev: GuestStartState, formData: FormData): Promise<GuestStartState> {
  const raw = Object.fromEntries(["firstName", "lastName", "age", "phone", "ref"].map((k) => [k, String(formData.get(k) ?? "")]));
  const values = raw;

  // The public test belongs to the main site.
  if (!isDefaultTenant(await getCurrentTenant())) return { error: "closed", values };

  const parsed = startSchema.safeParse(raw);
  const fieldErrors: GuestStartState["fieldErrors"] = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]) as keyof NonNullable<GuestStartState["fieldErrors"]>;
      fieldErrors[key] ??= issue.message;
    }
  }
  const phone = normalizePhone(raw.phone);
  if (raw.phone.trim() && !phone) fieldErrors.phone ??= "invalidPhone";
  if (!parsed.success || !phone) return { fieldErrors, values };

  // Each test hands out 12 questions — keep that from being farmed.
  const limit = await getRateLimiter().hit(`guestiq:ip:${await getClientIp()}`, 6, 60 * 60);
  if (!limit.ok) return { error: "tooMany", values };

  const first = pickIqItem(await itemPool(), START_RATING, new Set(), null);
  if (!first) return { error: "noQuestions", values };

  const refCode = normalizeGuestCode(parsed.data.ref ?? "");
  const [partnerId, referrer] = await Promise.all([
    partnerFromCookie(),
    refCode ? db.guestIqTest.findUnique({ where: { code: refCode }, select: { id: true } }) : null,
  ]);

  // A code collision is astronomically unlikely but cheap to survive.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const test = await db.guestIqTest.create({
        data: {
          token: newGuestToken(),
          code: newGuestCode(),
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
          age: parsed.data.age,
          phone,
          total: GUEST_IQ_QUESTIONS,
          askedItemIds: [first.id],
          currentItemId: first.id,
          currentShownAt: new Date(),
          partnerId,
          referredById: referrer?.id,
        },
        select: { token: true },
      });
      return { redirectTo: `/iq-test/${test.token}` };
    } catch (e) {
      if (attempt === 4) throw e;
    }
  }
  return { error: "tooMany", values };
}

export type GuestIqStep = { status: "ACTIVE"; question: IqQuestion } | { status: "FINISHED" };

/** Answer the current question (`choice = null` → time ran out). Returns the next question, or "finished". */
export async function answerGuestIq(token: string, itemId: string, rawChoice: number | null): Promise<GuestIqStep> {
  const locale = await getLocale();
  const choice = z.number().int().min(0).max(10).nullable().parse(rawChoice);
  const key = z.string().min(11).max(63).parse(token);

  const limit = await getRateLimiter().hit(`guestiq:answer:${key.slice(0, 16)}`, 40, 60);
  if (!limit.ok) throw new Error("Too many answers");

  await db.$transaction(async (tx) => {
    const test = await tx.guestIqTest.findUnique({ where: { token: key } });
    if (!test) throw new Error("Test not found");
    if (test.status === "FINISHED") return;

    // Claim the current question atomically — a double submit finds nothing to claim and just gets the current state.
    const claimed = await tx.guestIqTest.updateMany({ where: { id: test.id, status: "ACTIVE", currentItemId: itemId }, data: { currentItemId: null } });
    if (claimed.count === 0) return;

    const item = await tx.iqItem.findUniqueOrThrow({ where: { id: itemId } });
    const correct = isInTime(test.currentShownAt!) && choice !== null && choice === item.answer;
    // Guests don't move the questions' own ratings: those are calibrated by registered users only.
    const rating = updateRatings(test.rating, item.rating, correct, userK("PLACEMENT", test.answered)).user;
    const answered = test.answered + 1;
    const progress = { answered, correct: test.correct + (correct ? 1 : 0), rating };

    const pool = await tx.iqItem.findMany({ where: published, select: { id: true, category: true, rating: true } });
    const next = answered >= test.total ? null : pickIqItem(pool, rating, new Set(test.askedItemIds), item.category);
    // Out of questions (tiny bank) → finish early rather than repeat one.
    if (!next || test.askedItemIds.includes(next.id)) {
      await tx.guestIqTest.update({ where: { id: test.id }, data: { ...progress, status: "FINISHED", finishedAt: new Date(), iq: iqFromRating(rating) } });
      return;
    }
    await tx.guestIqTest.update({
      where: { id: test.id },
      data: { ...progress, currentItemId: next.id, currentShownAt: new Date(), askedItemIds: { push: next.id } },
    });
  });

  const test = await db.guestIqTest.findUniqueOrThrow({ where: { token: key } });
  if (test.status === "FINISHED" || !test.currentItemId) return { status: "FINISHED" };
  return { status: "ACTIVE", question: await guestQuestion(test, locale) };
}
