export const FIXED_MIN_PASSWORD_LENGTH = 8;

export type PasswordValidationError =
  | "passwordTooShort"
  | "passwordMatchesUsername"
  | "passwordMatchesEmail"
  | "passwordTooCommon";

/**
 * Common passwords that should always be rejected regardless of length.
 * Keep this list short and focused on the most frequently used weak passwords.
 */
const COMMON_PASSWORDS = new Set([
  "password",
  "12345678",
  "qwertyui",
  "11111111",
  "123456789",
  "1234567890",
  "abcdefgh",
  "password1",
  "iloveyou",
  "sunshine1",
  "princess",
  "football1",
  "charlie1",
  "abc12345",
  "passw0rd",
  "master11",
  "welcome1",
  "shadow12",
  "trustno1",
  "letmein1",
]);

export function getPasswordValidationError(
  password: string,
  context?: { username?: string; email?: string | null }
): PasswordValidationError | null {
  if (password.length < FIXED_MIN_PASSWORD_LENGTH) {
    return "passwordTooShort";
  }

  // Check against common passwords (case-insensitive)
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return "passwordTooCommon";
  }

  // Check if password matches or closely resembles the username
  if (context?.username) {
    const normalizedUsername = context.username.toLowerCase();
    const normalizedPassword = password.toLowerCase();
    if (normalizedPassword === normalizedUsername) {
      return "passwordMatchesUsername";
    }
  }

  // Check if password contains or matches the email local part
  if (context?.email) {
    const localPart = context.email.split("@")[0]?.toLowerCase();
    if (localPart && localPart.length >= 3) {
      const normalizedPassword = password.toLowerCase();
      if (normalizedPassword === localPart || normalizedPassword.includes(localPart)) {
        return "passwordMatchesEmail";
      }
    }
  }

  return null;
}

export function isStrongPassword(password: string, context?: { username?: string; email?: string | null }) {
  return getPasswordValidationError(password, context) === null;
}
