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
