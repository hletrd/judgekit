import { describe, expect, it, vi } from "vitest";

// Mock the contest-scoring module before importing the module under test
vi.mock("@/lib/assignments/contest-scoring", () => ({
  computeContestRanking: vi.fn(),
}));

import { getParticipantAuditData } from "@/lib/assignments/participant-audit";
import { computeContestRanking } from "@/lib/assignments/contest-scoring";
import type { LeaderboardEntry } from "@/lib/assignments/contest-scoring";

const mockedComputeContestRanking = vi.mocked(computeContestRanking);

function makeEntry(overrides: Partial<LeaderboardEntry> = {}): LeaderboardEntry {
  return {
    userId: "user-1",
    username: "alice",
    name: "Alice",
    className: "A",
    rank: 1,
    totalScore: 200,
    totalPenalty: 0,
    problems: [],
    ...overrides,
  };
}

describe("getParticipantAuditData", () => {
  it("returns null for an unknown user", () => {
    mockedComputeContestRanking.mockReturnValue({
      scoringModel: "ioi",
      entries: [makeEntry({ userId: "user-1" })],
    });

    const result = getParticipantAuditData("assignment-1", "user-unknown");
    expect(result).toBeNull();
  });

  it("returns correct entry and scoringModel for a known user (IOI)", () => {
    const entry = makeEntry({
      userId: "user-1",
      rank: 1,
      totalScore: 250,
    });

    mockedComputeContestRanking.mockReturnValue({
      scoringModel: "ioi",
      entries: [entry, makeEntry({ userId: "user-2", rank: 2, totalScore: 100 })],
    });

    const result = getParticipantAuditData("assignment-1", "user-1");
    expect(result).not.toBeNull();
    expect(result!.scoringModel).toBe("ioi");
    expect(result!.entry.userId).toBe("user-1");
    expect(result!.entry.rank).toBe(1);
    expect(result!.entry.totalScore).toBe(250);
  });

  it("returns correct entry for ICPC scoring model", () => {
    const entry = makeEntry({
      userId: "user-2",
      rank: 3,
      totalScore: 2, // 2 problems solved
      totalPenalty: 120,
    });

    mockedComputeContestRanking.mockReturnValue({
      scoringModel: "icpc",
      entries: [
        makeEntry({ userId: "user-1", rank: 1, totalScore: 4, totalPenalty: 80 }),
        makeEntry({ userId: "user-3", rank: 2, totalScore: 3, totalPenalty: 90 }),
        entry,
      ],
    });

    const result = getParticipantAuditData("assignment-1", "user-2");
    expect(result).not.toBeNull();
    expect(result!.scoringModel).toBe("icpc");
    expect(result!.entry.rank).toBe(3);
    expect(result!.entry.totalScore).toBe(2);
    expect(result!.entry.totalPenalty).toBe(120);
  });

  it("returns null when contest has no entries", () => {
    mockedComputeContestRanking.mockReturnValue({
      scoringModel: "ioi",
      entries: [],
    });

    const result = getParticipantAuditData("assignment-1", "user-1");
    expect(result).toBeNull();
  });
});
