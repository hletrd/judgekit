import pino from "pino";

const isDev = process.env.NODE_ENV === "development";
const REDACTED_PLACEHOLDER = "[REDACTED]";
const REDACT_PATHS = [
  "authorization",
  "headers.authorization",
  "request.headers.authorization",
  "req.headers.authorization",
  "password",
  "passwordHash",
  "body.password",
  "body.passwordHash",
  "recruitAccountPassword",
  "recruitToken",
  "workerSecret",
  "judgeClaimToken",
  "sessionToken",
  "access_token",
  "refresh_token",
  "id_token",
  "encryptedKey",
  "authToken",
  "runnerAuthToken",
];

export function createLogger(destination?: Parameters<typeof pino>[1]) {
  return pino(
    {
      level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
      base: { service: "judgekit" },
      redact: {
        paths: REDACT_PATHS,
        censor: REDACTED_PLACEHOLDER,
      },
    },
    destination
  );
}

export const logger = createLogger();

export function createRequestLogger(context: {
  requestId?: string;
  userId?: string;
  route?: string;
}) {
  return logger.child(context);
}
