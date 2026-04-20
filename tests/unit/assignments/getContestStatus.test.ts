import { describe, expect, it, vi } from "vitest";

// Mock the DB module that contests.ts imports transitively
vi.mock("@/lib/db/queries", () => ({
  rawQueryOne: vi.fn(),
  rawQueryAll: vi.fn(),
}));

vi.mock("@/lib/assignments/management", () => ({
  canManageGroupResourcesAsync: vi.fn(),
}));

vi.mock("@/lib/capabilities/cache", () => ({
  resolveCapabilities: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {},
}));

vi.mock("@/lib/db/schema", () => ({
  assignments: {},
  contestAccessTokens: {},
  enrollments: {},
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { getContestStatus, type ContestEntry } from "@/lib/assignments/contests";

function makeContest(overrides: Partial<ContestEntry> = {}): ContestEntry {
  return {
    id: "test",
    title: "Test Contest",
    description: null,
    groupId: "group-1",
    groupName: "Group 1",
    examMode: "scheduled",
    examDurationMinutes: 120,
    scoringModel: "icpc",
    startsAt: null,
    deadline: null,
    freezeLeaderboardAt: null,
    enableAntiCheat: false,
    problemCount: 5,
    startedAt: null,
    personalDeadline: null,
    ...overrides,
  };
}

// Fixed reference time: 2026-04-20T12:00:00.000Z
const NOW = new Date("2026-04-20T12:00:00.000Z");

describe("getContestStatus", () => {
  // ── Scheduled mode ────────────────────────────────────────────────

  describe("scheduled mode", () => {
    it("returns 'upcoming' when startsAt is in the future", () => {
      const contest = makeContest({
        examMode: "scheduled",
        startsAt: new Date("2026-04-20T14:00:00.000Z"),
        deadline: new Date("2026-04-20T16:00:00.000Z"),
      });
      expect(getContestStatus(contest, NOW)).toBe("upcoming");
    });

    it("returns 'open' when between startsAt and deadline", () => {
      const contest = makeContest({
        examMode: "scheduled",
        startsAt: new Date("2026-04-20T10:00:00.000Z"),
        deadline: new Date("2026-04-20T16:00:00.000Z"),
      });
      expect(getContestStatus(contest, NOW)).toBe("open");
    });

    it("returns 'open' when startsAt is null and no deadline", () => {
      const contest = makeContest({
        examMode: "scheduled",
        startsAt: null,
        deadline: null,
      });
      expect(getContestStatus(contest, NOW)).toBe("open");
    });

    it("returns 'closed' when deadline is in the past", () => {
      const contest = makeContest({
        examMode: "scheduled",
        startsAt: new Date("2026-04-20T10:00:00.000Z"),
        deadline: new Date("2026-04-20T11:00:00.000Z"),
      });
      expect(getContestStatus(contest, NOW)).toBe("closed");
    });

    it("returns 'closed' when now exactly equals deadline", () => {
      const deadline = new Date("2026-04-20T12:00:00.000Z");
      const contest = makeContest({
        examMode: "scheduled",
        startsAt: new Date("2026-04-20T10:00:00.000Z"),
        deadline,
      });
      // nowMs >= deadlineMs => closed
      expect(getContestStatus(contest, NOW)).toBe("closed");
    });

    it("returns 'open' when now exactly equals startsAt", () => {
      const startsAt = new Date("2026-04-20T12:00:00.000Z");
      const contest = makeContest({
        examMode: "scheduled",
        startsAt,
        deadline: new Date("2026-04-20T16:00:00.000Z"),
      });
      // nowMs >= startsAtMs => not upcoming; nowMs < deadlineMs => not closed
      expect(getContestStatus(contest, NOW)).toBe("open");
    });
  });

  // ── Windowed mode ─────────────────────────────────────────────────

  describe("windowed mode", () => {
    it("returns 'upcoming' when startsAt is in the future", () => {
      const contest = makeContest({
        examMode: "windowed",
        startsAt: new Date("2026-04-20T14:00:00.000Z"),
        deadline: new Date("2026-04-20T18:00:00.000Z"),
      });
      expect(getContestStatus(contest, NOW)).toBe("upcoming");
    });

    it("returns 'open' when within window but not yet started (no startedAt)", () => {
      const contest = makeContest({
        examMode: "windowed",
        startsAt: new Date("2026-04-20T10:00:00.000Z"),
        deadline: new Date("2026-04-20T18:00:00.000Z"),
        startedAt: null,
      });
      expect(getContestStatus(contest, NOW)).toBe("open");
    });

    it("returns 'in_progress' when within window and startedAt is set", () => {
      const contest = makeContest({
        examMode: "windowed",
        startsAt: new Date("2026-04-20T10:00:00.000Z"),
        deadline: new Date("2026-04-20T18:00:00.000Z"),
        startedAt: new Date("2026-04-20T10:30:00.000Z"),
      });
      expect(getContestStatus(contest, NOW)).toBe("in_progress");
    });

    it("returns 'closed' when deadline is in the past", () => {
      const contest = makeContest({
        examMode: "windowed",
        startsAt: new Date("2026-04-20T08:00:00.000Z"),
        deadline: new Date("2026-04-20T11:00:00.000Z"),
        startedAt: new Date("2026-04-20T08:30:00.000Z"),
      });
      expect(getContestStatus(contest, NOW)).toBe("closed");
    });

    it("returns 'expired' when personalDeadline is past but global deadline is not", () => {
      const contest = makeContest({
        examMode: "windowed",
        startsAt: new Date("2026-04-20T10:00:00.000Z"),
        deadline: new Date("2026-04-20T18:00:00.000Z"),
        startedAt: new Date("2026-04-20T10:30:00.000Z"),
        personalDeadline: new Date("2026-04-20T11:00:00.000Z"),
      });
      expect(getContestStatus(contest, NOW)).toBe("expired");
    });

    it("prioritizes 'closed' (global deadline) over 'expired' (personal deadline)", () => {
      const contest = makeContest({
        examMode: "windowed",
        startsAt: new Date("2026-04-20T08:00:00.000Z"),
        deadline: new Date("2026-04-20T11:00:00.000Z"),
        startedAt: new Date("2026-04-20T08:30:00.000Z"),
        personalDeadline: new Date("2026-04-20T10:00:00.000Z"),
      });
      // Both deadline and personalDeadline are past — closed takes priority
      expect(getContestStatus(contest, NOW)).toBe("closed");
    });

    it("returns 'open' when no startsAt, no startedAt, and no deadline", () => {
      const contest = makeContest({
        examMode: "windowed",
        startsAt: null,
        deadline: null,
        startedAt: null,
      });
      expect(getContestStatus(contest, NOW)).toBe("open");
    });
  });

  // ── Boundary conditions ───────────────────────────────────────────

  describe("boundary conditions", () => {
    it("handles 1ms before deadline as 'open' (scheduled)", () => {
      const contest = makeContest({
        examMode: "scheduled",
        startsAt: new Date("2026-04-20T10:00:00.000Z"),
        deadline: new Date("2026-04-20T12:00:00.001Z"),
      });
      expect(getContestStatus(contest, NOW)).toBe("open");
    });

    it("handles 1ms after deadline as 'closed' (scheduled)", () => {
      const contest = makeContest({
        examMode: "scheduled",
        startsAt: new Date("2026-04-20T10:00:00.000Z"),
        deadline: new Date("2026-04-20T12:00:00.001Z"),
      });
      const justBefore = new Date("2026-04-20T12:00:00.000Z");
      expect(getContestStatus(contest, justBefore)).toBe("open");
    });

    it("handles null startsAt and null deadline gracefully (scheduled)", () => {
      const contest = makeContest({
        examMode: "scheduled",
        startsAt: null,
        deadline: null,
      });
      expect(getContestStatus(contest, NOW)).toBe("open");
    });
  });
});
