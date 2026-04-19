import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  dbExecute: vi.fn(),
  sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values })),
  getRetentionCutoff: vi.fn((days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000)),
}));

vi.mock("drizzle-orm", async () => {
  const actual = await vi.importActual<typeof import("drizzle-orm")>("drizzle-orm");
  return {
    ...actual,
    sql: mocks.sql,
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    execute: mocks.dbExecute,
  },
}));

vi.mock("@/lib/db/schema", () => ({
  auditEvents: { createdAt: "auditEvents.createdAt" },
  loginEvents: { createdAt: "loginEvents.createdAt" },
}));

vi.mock("@/lib/data-retention", () => ({
  DATA_RETENTION_DAYS: {
    auditEvents: 90,
    loginEvents: 180,
  },
  DATA_RETENTION_LEGAL_HOLD: false,
  getRetentionCutoff: mocks.getRetentionCutoff,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("cleanupOldEvents", () => {
  it("returns the rowCount from raw delete statements", async () => {
    mocks.dbExecute
      .mockResolvedValueOnce({ rowCount: 3 })
      .mockResolvedValueOnce({ rowCount: 1 });

    const { cleanupOldEvents } = await import("@/lib/db/cleanup");
    const result = await cleanupOldEvents();

    expect(result).toEqual({ auditDeleted: 3, loginDeleted: 1 });
  });

  it("uses getRetentionCutoff with DATA_RETENTION_DAYS for each event type", async () => {
    mocks.dbExecute
      .mockResolvedValueOnce({ rowCount: 0 })
      .mockResolvedValueOnce({ rowCount: 0 });

    const { cleanupOldEvents } = await import("@/lib/db/cleanup");
    await cleanupOldEvents();

    // getRetentionCutoff should be called once for audit events (90 days)
    // and once for login events (180 days)
    expect(mocks.getRetentionCutoff).toHaveBeenCalledWith(90);
    expect(mocks.getRetentionCutoff).toHaveBeenCalledWith(180);
  });
});
