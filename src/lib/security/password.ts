export const FIXED_MIN_PASSWORD_LENGTH = 8;

export type PasswordValidationError = "passwordTooShort";

export function getPasswordValidationError(
  password: string,
  _context?: { username?: string; email?: string | null }
): PasswordValidationError | null {
  if (password.length < FIXED_MIN_PASSWORD_LENGTH) {
    return "passwordTooShort";
  }

  return null;
}

export function isStrongPassword(password: string, context?: { username?: string; email?: string | null }) {
  return getPasswordValidationError(password, context) === null;
}
