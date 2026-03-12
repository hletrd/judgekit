import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { prepareGetMock, prepareMock, problemsFindFirstMock, selectMock, recordAuditEventMock } =
  vi.hoisted(() => ({
    prepareGetMock: vi.fn(),
    prepareMock: vi.fn(),
    problemsFindFirstMock: vi.fn(),
    selectMock: vi.fn(),
    recordAuditEventMock: vi.fn(),
  }));

vi.mock("@/lib/judge/auth", () => ({
  isJudgeAuthorized: vi.fn(() => true),
}));

vi.mock("@/lib/audit/events", () => ({
  recordAuditEvent: recordAuditEventMock,
}));

vi.mock("@/lib/db", () => ({
  sqlite: {
    prepare: prepareMock,
  },
  db: {
    query: {
      problems: {
        findFirst: problemsFindFirstMock,
      },
    },
    select: selectMock,
  },
}));

import { POST } from "@/app/api/v1/judge/claim/route";

beforeEach(() => {
  vi.clearAllMocks();

  prepareMock.mockReturnValue({
    get: prepareGetMock,
  });

  problemsFindFirstMock.mockResolvedValue({
    timeLimitMs: 1000,
    memoryLimitMb: 128,
  });

  selectMock.mockReturnValue({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        orderBy: vi.fn(() => []),
      })),
    })),
  });
});

describe("POST /api/v1/judge/claim", () => {
  it("binds a primitive timestamp when claiming submissions", async () => {
    prepareGetMock.mockReturnValue({
      id: "submission-1",
      userId: "user-1",
      problemId: "problem-1",
      assignmentId: null,
      claimToken: "claim-token",
      language: "python",
      sourceCode: "print(1)",
      status: "queued",
      compileOutput: null,
      executionTimeMs: null,
      memoryUsedKb: null,
      score: null,
      judgedAt: null,
      submittedAt: Date.now(),
    });

    const response = await POST(
      new NextRequest("http://localhost:3000/api/v1/judge/claim", {
        method: "POST",
        headers: {
          Authorization: "Bearer test-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      })
    );

    expect(prepareMock).toHaveBeenCalledOnce();
    expect(prepareGetMock).toHaveBeenCalledOnce();
    expect(prepareGetMock.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        claimToken: expect.any(String),
        claimCreatedAt: expect.any(Number),
      })
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toMatchObject({
      id: "submission-1",
      claimToken: "claim-token",
      timeLimitMs: 1000,
      memoryLimitMb: 128,
      testCases: [],
    });
  });
});
