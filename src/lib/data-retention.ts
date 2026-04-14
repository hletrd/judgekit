const DEFAULT_DATA_RETENTION_DAYS = {
  auditEvents: 90,
  chatMessages: 30,
  antiCheatEvents: 180,
  recruitingRecords: 365,
  submissions: 365,
} as const;

function parseRetentionOverride(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const DATA_RETENTION_DAYS = {
  auditEvents: parseRetentionOverride("AUDIT_EVENT_RETENTION_DAYS", DEFAULT_DATA_RETENTION_DAYS.auditEvents),
  chatMessages: parseRetentionOverride("CHAT_MESSAGE_RETENTION_DAYS", DEFAULT_DATA_RETENTION_DAYS.chatMessages),
  antiCheatEvents: parseRetentionOverride("ANTI_CHEAT_RETENTION_DAYS", DEFAULT_DATA_RETENTION_DAYS.antiCheatEvents),
  recruitingRecords: parseRetentionOverride("RECRUITING_RECORD_RETENTION_DAYS", DEFAULT_DATA_RETENTION_DAYS.recruitingRecords),
  submissions: parseRetentionOverride("SUBMISSION_RETENTION_DAYS", DEFAULT_DATA_RETENTION_DAYS.submissions),
} as const;

export type DataRetentionKey = keyof typeof DATA_RETENTION_DAYS;

/**
 * When true, all automatic data pruning is suspended.  Set via the
 * `DATA_RETENTION_LEGAL_HOLD` environment variable.  Intended for
 * litigation holds, regulatory investigations, or any scenario where
 * data must not be deleted until the hold is lifted.
 */
export const DATA_RETENTION_LEGAL_HOLD =
  process.env.DATA_RETENTION_LEGAL_HOLD === "true" ||
  process.env.DATA_RETENTION_LEGAL_HOLD === "1";

export function getRetentionCutoff(days: number, now = Date.now()) {
  return new Date(now - days * 24 * 60 * 60 * 1000);
}
