import { beforeEach, describe, expect, it, vi } from "vitest";

describe("data retention configuration", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.AUDIT_EVENT_RETENTION_DAYS;
    delete process.env.CHAT_MESSAGE_RETENTION_DAYS;
    delete process.env.ANTI_CHEAT_RETENTION_DAYS;
    delete process.env.RECRUITING_RECORD_RETENTION_DAYS;
    delete process.env.SUBMISSION_RETENTION_DAYS;
    delete process.env.LOGIN_EVENT_RETENTION_DAYS;
  });

  it("uses documented defaults when no overrides are present", async () => {
    const { DATA_RETENTION_DAYS } = await import("@/lib/data-retention");

    expect(DATA_RETENTION_DAYS).toEqual({
      auditEvents: 90,
      chatMessages: 30,
      antiCheatEvents: 180,
      recruitingRecords: 365,
      submissions: 365,
      loginEvents: 180,
    });
  });

  it("accepts positive integer overrides from the environment", async () => {
    process.env.CHAT_MESSAGE_RETENTION_DAYS = "45";
    process.env.SUBMISSION_RETENTION_DAYS = "730";

    const { DATA_RETENTION_DAYS } = await import("@/lib/data-retention");

    expect(DATA_RETENTION_DAYS.chatMessages).toBe(45);
    expect(DATA_RETENTION_DAYS.submissions).toBe(730);
  });

  it("ignores invalid overrides and falls back to defaults", async () => {
    process.env.CHAT_MESSAGE_RETENTION_DAYS = "0";
    process.env.SUBMISSION_RETENTION_DAYS = "not-a-number";

    const { DATA_RETENTION_DAYS } = await import("@/lib/data-retention");

    expect(DATA_RETENTION_DAYS.chatMessages).toBe(30);
    expect(DATA_RETENTION_DAYS.submissions).toBe(365);
  });
});

describe("getRetentionCutoff", () => {
  it("computes the correct cutoff date for a given number of days", async () => {
    const { getRetentionCutoff } = await import("@/lib/data-retention");

    // Fixed timestamp: 2026-01-15T12:00:00.000Z = 1736942400000
    const nowMs = 1736942400000;
    const cutoff = getRetentionCutoff(30, nowMs);

    // 30 days before the fixed timestamp
    const expectedCutoff = new Date(nowMs - 30 * 24 * 60 * 60 * 1000);
    expect(cutoff.getTime()).toBe(expectedCutoff.getTime());
  });

  it("uses the provided nowMs parameter instead of Date.now()", async () => {
    const { getRetentionCutoff } = await import("@/lib/data-retention");

    const customNow = new Date("2025-06-01T00:00:00.000Z").getTime();
    const cutoff = getRetentionCutoff(90, customNow);

    const expectedCutoff = new Date(customNow - 90 * 24 * 60 * 60 * 1000);
    expect(cutoff.getTime()).toBe(expectedCutoff.getTime());
  });

  it("defaults to Date.now() when no nowMs is provided", async () => {
    const { getRetentionCutoff } = await import("@/lib/data-retention");

    const before = Date.now();
    const cutoff = getRetentionCutoff(365);
    const after = Date.now();

    const minCutoff = new Date(after - 365 * 24 * 60 * 60 * 1000);
    const maxCutoff = new Date(before - 365 * 24 * 60 * 60 * 1000);

    expect(cutoff.getTime()).toBeGreaterThanOrEqual(minCutoff.getTime());
    expect(cutoff.getTime()).toBeLessThanOrEqual(maxCutoff.getTime());
  });
});
