export const DATA_RETENTION_DAYS = {
  auditEvents: 90,
  chatMessages: 30,
  antiCheatEvents: 180,
  recruitingRecords: 365,
  submissions: 365,
} as const;

export type DataRetentionKey = keyof typeof DATA_RETENTION_DAYS;

export function getRetentionCutoff(days: number, now = Date.now()) {
  return new Date(now - days * 24 * 60 * 60 * 1000);
}
