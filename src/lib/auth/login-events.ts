import { db } from "@/lib/db";
import { loginEvents } from "@/lib/db/schema";
import { normalizeText, getClientIp, getRequestPath, MAX_PATH_LENGTH } from "@/lib/security/request-context";

export type LoginEventOutcome =
  | "success"
  | "invalid_credentials"
  | "rate_limited"
  | "policy_denied";

export type LoginEventRequestSummary = {
  attemptedIdentifier: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestMethod: string | null;
  requestPath: string | null;
};

export type LoginEventContextCarrier = {
  loginEventContext?: LoginEventRequestSummary;
};

type RequestLike = {
  headers: Headers;
  method?: string | null;
  url?: string | null;
};

type RecordLoginEventInput = {
  outcome: LoginEventOutcome;
  attemptedIdentifier?: string | null;
  userId?: string | null;
  request: RequestLike;
};

type RecordLoginEventWithContextInput = {
  outcome: LoginEventOutcome;
  userId?: string | null;
  context: LoginEventRequestSummary;
};

const MAX_IDENTIFIER_LENGTH = 320;
const MAX_IP_LENGTH = 128;
const MAX_USER_AGENT_LENGTH = 512;
const MAX_METHOD_LENGTH = 16;

export function buildLoginEventContext(
  request: RequestLike,
  attemptedIdentifier?: string | null
): LoginEventRequestSummary {
  return sanitizeLoginEventContext({
    attemptedIdentifier,
    ipAddress: getClientIp(request.headers),
    userAgent: request.headers.get("user-agent"),
    requestMethod: request.method,
    requestPath: getRequestPath(request.url),
  });
}

export function sanitizeLoginEventContext(
  context: Partial<LoginEventRequestSummary>
): LoginEventRequestSummary {
  return {
    attemptedIdentifier: normalizeText(context.attemptedIdentifier, MAX_IDENTIFIER_LENGTH),
    ipAddress: normalizeText(context.ipAddress, MAX_IP_LENGTH),
    userAgent: normalizeText(context.userAgent, MAX_USER_AGENT_LENGTH),
    requestMethod: normalizeText(context.requestMethod, MAX_METHOD_LENGTH)?.toUpperCase() ?? null,
    requestPath: normalizeText(context.requestPath, MAX_PATH_LENGTH),
  };
}

export function getLoginEventContextFromUser(user: unknown) {
  if (!user || typeof user !== "object") {
    return null;
  }

  return (user as LoginEventContextCarrier).loginEventContext ?? null;
}

export function recordLoginEvent({
  outcome,
  attemptedIdentifier,
  userId,
  request,
}: RecordLoginEventInput) {
  recordLoginEventWithContext({
    outcome,
    userId,
    context: buildLoginEventContext(request, attemptedIdentifier),
  });
}

export function recordLoginEventWithContext({
  outcome,
  userId,
  context,
}: RecordLoginEventWithContextInput) {
  try {
    db.insert(loginEvents)
      .values({
        outcome,
        attemptedIdentifier: context.attemptedIdentifier,
        userId: normalizeText(userId, 64),
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        requestMethod: context.requestMethod,
        requestPath: context.requestPath,
      })
      .run();
  } catch (error) {
    console.warn("Failed to persist login event", {
      outcome,
      userId: normalizeText(userId, 64),
      error: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
