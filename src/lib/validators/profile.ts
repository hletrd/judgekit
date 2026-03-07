import { z } from "zod";

function trimString(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim();
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export const updateProfileSchema = z.object({
  name: z.preprocess(
    trimString,
    z.string().min(1, "nameRequired").max(100, "nameTooLong")
  ),
  email: z.preprocess(
    normalizeOptionalString,
    z.string().email("invalidEmail").max(255, "invalidEmail").optional()
  ),
  className: z.preprocess(
    normalizeOptionalString,
    z.string().max(100, "classNameTooLong").optional()
  ),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
