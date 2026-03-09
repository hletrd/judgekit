import { headers } from "next/headers";
import { db } from "@/lib/db";
import { auditEvents } from "@/lib/db/schema";
import { extractClientIp } from "@/lib/security/ip";

type RequestLike = {
  headers: Headers;
  method?: string | null;
  url?: string | null;
};

type AuditRequestContext = {
  ipAddress?: string | null;
  userAgent?: string | null;
  requestMethod?: string | null;
  requestPath?: string | null;
};

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type RecordAuditEventInput = {
  actorId?: string | null;
  actorRole?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  resourceLabel?: string | null;
  summary: string;
  details?: JsonValue | null;
  request?: RequestLike;
  context?: AuditRequestContext;
};

const MAX_TEXT_LENGTH = 512;
const MAX_PATH_LENGTH = 512;
const MAX_JSON_LENGTH = 4000;
let auditEventWriteFailures = 0;
let lastAuditEventWriteFailureAt: string | null = null;

function normalizeText(value: string | null | undefined, maxLength = MAX_TEXT_LENGTH) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
}

function getClientIp(headersList: Headers) {
  const clientIp = extractClientIp(headersList);
  if (clientIp === "unknown") {
    return null;
  }

  return normalizeText(clientIp, 128);
}

function getRequestPath(url: string | null | undefined) {
  if (!url) {
    return null;
  }

  try {
    return normalizeText(new URL(url).pathname, MAX_PATH_LENGTH);
  } catch {
    return null;
  }
}

function serializeDetails(details: JsonValue | null | undefined) {
  if (details == null) {
    return null;
  }

  try {
    return JSON.stringify(details).slice(0, MAX_JSON_LENGTH);
  } catch {
    return null;
  }
}

export function buildAuditRequestContext(request: RequestLike): AuditRequestContext {
  return {
    ipAddress: getClientIp(request.headers),
    userAgent: normalizeText(request.headers.get("user-agent"), MAX_TEXT_LENGTH),
    requestMethod: normalizeText(request.method, 32)?.toUpperCase() ?? null,
    requestPath: getRequestPath(request.url),
  };
}

export async function buildServerActionAuditContext(
  requestPath: string,
  requestMethod = "SERVER_ACTION"
): Promise<AuditRequestContext> {
  const headerStore = await headers();

  return {
    ipAddress: getClientIp(headerStore),
    userAgent: normalizeText(headerStore.get("user-agent"), MAX_TEXT_LENGTH),
    requestMethod: normalizeText(requestMethod, 32)?.toUpperCase() ?? null,
    requestPath: normalizeText(requestPath, MAX_PATH_LENGTH),
  };
}

export function recordAuditEvent({
  actorId,
  actorRole,
  action,
  resourceType,
  resourceId,
  resourceLabel,
  summary,
  details,
  request,
  context,
}: RecordAuditEventInput) {
  const resolvedContext = request ? buildAuditRequestContext(request) : context;

  try {
    db.insert(auditEvents)
      .values({
        actorId: normalizeText(actorId, 64),
        actorRole: normalizeText(actorRole, 32),
        action: normalizeText(action, 128) ?? "unknown",
        resourceType: normalizeText(resourceType, 64) ?? "unknown",
        resourceId: normalizeText(resourceId, 64),
        resourceLabel: normalizeText(resourceLabel, MAX_TEXT_LENGTH),
        summary: normalizeText(summary, MAX_TEXT_LENGTH) ?? "Audit event",
        details: serializeDetails(details),
        ipAddress: normalizeText(resolvedContext?.ipAddress, 128),
        userAgent: normalizeText(resolvedContext?.userAgent, MAX_TEXT_LENGTH),
        requestMethod: normalizeText(resolvedContext?.requestMethod, 32),
        requestPath: normalizeText(resolvedContext?.requestPath, MAX_PATH_LENGTH),
      })
      .run();
  } catch (error) {
    auditEventWriteFailures += 1;
    lastAuditEventWriteFailureAt = new Date().toISOString();
    console.warn("Failed to persist audit event", {
      action,
      actorId: normalizeText(actorId, 64),
      resourceType,
      error: error instanceof Error ? error.message : "unknown_error",
    });
  }
}

export function getAuditEventHealthSnapshot() {
  return {
    failedWrites: auditEventWriteFailures,
    lastFailureAt: lastAuditEventWriteFailureAt,
    status: auditEventWriteFailures === 0 ? "ok" : "degraded",
  } as const;
}
