import "server-only";
import { randomBytes, randomInt } from "node:crypto";
import type { GuestIqTest } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import type { IqPublicContent } from "./content-schema";
import { iqPercentile } from "./rating";
import { questionContent, secondsLeft } from "./service";
import { IQ_QUESTIONS, type IqQuestion } from "./types";

/**
 * IQ test without an account (/iq-test). Taking it is free; the score and the certificate are shown after
 * the payment is confirmed by an admin. Flip this to show the score right away and sell only the certificate.
 */
export const GUEST_IQ_SCORE_IS_FREE = false;
export const GUEST_IQ_QUESTIONS = IQ_QUESTIONS.PLACEMENT;

/** No 0/O, 1/I/L — the code is read aloud and typed into Telegram. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const newGuestToken = () => randomBytes(18).toString("base64url");
export const newGuestCode = () => Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
export const normalizeGuestCode = (code: string) => code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);

/** A person's referral link: the public test with their code (who they bring is recorded). */
export const guestShareUrl = (origin: string, code: string) => `${origin}/iq-test?r=${code}`;

export const guestTestByToken = (token: string) => (token.length > 10 && token.length < 64 ? db.guestIqTest.findUnique({ where: { token } }) : null);

/** The question on screen, as the browser may see it (no answer). */
export async function guestQuestion(test: GuestIqTest, locale: string): Promise<IqQuestion> {
  const item = await db.iqItem.findUniqueOrThrow({ where: { id: test.currentItemId! } });
  return {
    itemId: item.id,
    number: test.answered + 1,
    total: test.total,
    ...questionContent(item.content as IqPublicContent, locale),
    secondsLeft: secondsLeft(test.currentShownAt!),
  };
}

/** What a paid certificate shows. */
export function guestCertificate(test: GuestIqTest) {
  const iq = test.iq ?? 100;
  return {
    name: `${test.firstName} ${test.lastName}`,
    iq,
    percentile: iqPercentile(iq),
    correct: test.correct,
    total: test.total,
    date: test.finishedAt ?? test.createdAt,
    code: test.code,
  };
}
