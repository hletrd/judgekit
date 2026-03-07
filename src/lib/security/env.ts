const AUTH_SECRET_PLACEHOLDER = "your-secret-key-here-generate-with-openssl-rand-base64-32";
const JUDGE_AUTH_TOKEN_PLACEHOLDER = "your-judge-auth-token";
const SECURE_AUTH_SESSION_COOKIE_NAME = "__Secure-authjs.session-token";
const AUTH_SESSION_COOKIE_NAME = "authjs.session-token";

function requireNonEmptyEnv(name: string, value: string | undefined) {
  if (!value || value.trim().length === 0) {
    throw new Error(`${name} must be set before starting the application.`);
  }

  return value.trim();
}

export function shouldUseSecureSessionCookie() {
  const authUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;

  return authUrl?.startsWith("https://") === true;
}

export function getAuthSessionCookieName() {
  return shouldUseSecureSessionCookie()
    ? SECURE_AUTH_SESSION_COOKIE_NAME
    : AUTH_SESSION_COOKIE_NAME;
}

export function getValidatedAuthSecret() {
  const authSecret = requireNonEmptyEnv("AUTH_SECRET", process.env.AUTH_SECRET);

  if (authSecret === AUTH_SECRET_PLACEHOLDER || authSecret.length < 32) {
    throw new Error("AUTH_SECRET must be replaced with a strong value that is at least 32 characters long.");
  }

  return authSecret;
}

export function getValidatedJudgeAuthToken() {
  const judgeAuthToken = requireNonEmptyEnv("JUDGE_AUTH_TOKEN", process.env.JUDGE_AUTH_TOKEN);

  if (judgeAuthToken === JUDGE_AUTH_TOKEN_PLACEHOLDER) {
    throw new Error("JUDGE_AUTH_TOKEN must be replaced with a strong random value before starting the application.");
  }

  return judgeAuthToken;
}
