import type { JWT } from "next-auth/jwt";
import { getConfiguredSettings } from "@/lib/system-settings-config";

export function getSessionMaxAgeSeconds() {
  return getConfiguredSettings().sessionMaxAgeSeconds;
}

type TokenTimeCarrier = {
  authenticatedAt?: unknown;
  iat?: unknown;
};

export function getTokenAuthenticatedAtSeconds(token: TokenTimeCarrier | null | undefined) {
  if (typeof token?.authenticatedAt === "number" && Number.isFinite(token.authenticatedAt)) {
    return Math.trunc(token.authenticatedAt);
  }

  if (typeof token?.iat === "number" && Number.isFinite(token.iat)) {
    return Math.trunc(token.iat);
  }

  return null;
}

export function isTokenInvalidated(
  authenticatedAtSeconds: number | null,
  tokenInvalidatedAt: Date | null | undefined
) {
  if (authenticatedAtSeconds === null || authenticatedAtSeconds === undefined || !tokenInvalidatedAt) {
    return false;
  }

  const invalidatedAtSeconds = Math.floor(tokenInvalidatedAt.getTime() / 1000);
  return authenticatedAtSeconds < invalidatedAtSeconds;
}

/**
 * Token field names that carry auth-relevant user data.
 * Must stay in sync with mapUserToAuthFields / syncTokenWithUser.
 * When a new auth preference field is added, add it here too.
 */
const AUTH_TOKEN_FIELDS = [
  "sub",
  "id",
  "role",
  "username",
  "email",
  "name",
  "className",
  "mustChangePassword",
  "preferredLanguage",
  "preferredTheme",
  "shareAcceptedSolutions",
  "acceptedSolutionsAnonymous",
  "editorTheme",
  "editorFontSize",
  "editorFontFamily",
  "lectureMode",
  "lectureFontScale",
  "lectureColorScheme",
  "authenticatedAt",
  "uaHash",
] as const;

export function clearAuthToken(token: JWT) {
  // Set authenticatedAt to 0 instead of deleting it so that
  // getTokenAuthenticatedAtSeconds returns 0 (not falling back
  // to token.iat). This ensures isTokenInvalidated always
  // returns true for a cleared token, closing a revocation
  // bypass window where iat > tokenInvalidatedAt.
  token.authenticatedAt = 0;

  for (const field of AUTH_TOKEN_FIELDS) {
    if (field !== "authenticatedAt") {
      delete token[field as keyof JWT];
    }
  }

  return token;
}
