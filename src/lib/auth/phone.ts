import { parsePhoneNumberFromString } from "libphonenumber-js";

/** Normalize an Uzbek phone number to E.164 (+998XXXXXXXXX), or null if invalid. */
export function normalizePhone(input: string): string | null {
  const phone = parsePhoneNumberFromString(input.trim(), "UZ");
  if (!phone || !phone.isValid() || phone.country !== "UZ") return null;
  return phone.number;
}

/** Heuristic for the login field: phone numbers are digits, spaces, +, -, ( ). */
export const looksLikePhone = (input: string) => /^[\d\s+\-()]{7,}$/.test(input.trim());
