import { z } from "zod";

// Error messages are i18n keys under "auth.errors" in messages/*.json.

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,20}$/, "usernameFormat");

export const passwordSchema = z.string().min(8, "passwordTooShort").max(128, "passwordTooLong");

export const genderSchema = z.enum(["MALE", "FEMALE"], { error: "genderRequired" });

export const registerSchema = z.object({
  gender: genderSchema,
  phone: z.string().trim().min(1, "required"),
  username: usernameSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "required"),
  password: z.string().min(1, "required"),
});

export type FormState = {
  /** Where the client should navigate after success (see note in actions.ts). */
  redirectTo?: string;
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
  values?: Record<string, string>;
};
