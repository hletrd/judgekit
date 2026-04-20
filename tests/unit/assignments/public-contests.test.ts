import { beforeEach, describe, expect, it, vi } from "vitest";

const { assignmentsFindManyMock, assignmentsFindFirstMock } = vi.hoisted(() => ({
  assignmentsFindManyMock: vi.fn(),
  assignmentsFindFirstMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      assignments: {
        findMany: assignmentsFindManyMock,
        findFirst: assignmentsFindFirstMock,
      },
    },
  },
}));

vi.mock("@/lib/db-time", () => ({
  getDbNow: vi.fn().mockResolvedValue(new Date("2026-04-20T12:00:00Z")),
}));

describe("public contest helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps public contests with public problem counts", async () => {
    assignmentsFindManyMock.mockResolvedValue([
      {
        id: "contest-1",
        title: "Spring Challenge",
        description: "desc",
        groupId: "group-1",
        group: { name: "Algorithms 101" },
        examMode: "scheduled",
        examDurationMinutes: null,
        scoringModel: "ioi",
        startsAt: new Date("2026-04-20T00:00:00Z"),
        deadline: new Date("2026-04-21T00:00:00Z"),
        freezeLeaderboardAt: null,
        enableAntiCheat: false,
        assignmentProblems: [
          { problem: { id: "problem-1", visibility: "public" } },
          { problem: { id: "problem-2", visibility: "private" } },
        ],
      },
    ]);

    const { getPublicContests } = await import("@/lib/assignments/public-contests");
    const contests = await getPublicContests();

    expect(contests).toHaveLength(1);
    expect(contests[0]).toMatchObject({
      id: "contest-1",
      publicProblemCount: 1,
      problemCount: 2,
      groupName: "Algorithms 101",
    });
  });

  it("returns a public contest detail with only public problems", async () => {
    assignmentsFindFirstMock.mockResolvedValue({
      id: "contest-1",
      title: "Spring Challenge",
      description: "desc",
      groupId: "group-1",
      group: { name: "Algorithms 101" },
      examMode: "scheduled",
      examDurationMinutes: null,
      scoringModel: "ioi",
      startsAt: new Date("2026-04-20T00:00:00Z"),
      deadline: new Date("2026-04-21T00:00:00Z"),
      freezeLeaderboardAt: null,
      enableAntiCheat: false,
      assignmentProblems: [
        { problemId: "problem-1", sortOrder: 0, problem: { id: "problem-1", title: "A + B", visibility: "public" } },
        { problemId: "problem-2", sortOrder: 1, problem: { id: "problem-2", title: "Secret", visibility: "private" } },
      ],
    });

    const { getPublicContestById } = await import("@/lib/assignments/public-contests");
    const contest = await getPublicContestById("contest-1");

    expect(contest?.publicProblems).toEqual([{ id: "problem-1", title: "A + B", difficulty: null }]);
  });
});
