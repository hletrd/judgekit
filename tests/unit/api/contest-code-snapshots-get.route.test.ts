import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const {
  canViewAssignmentSubmissionsMock,
  dbSelectMock,
} = vi.hoisted(() => ({
  canViewAssignmentSubmissionsMock: vi.fn(),
  dbSelectMock: vi.fn(),
}));

vi.mock("@/lib/api/handler", () => ({
  createApiHandler:
    ({ handler }: { handler: (req: NextRequest, ctx: { user: any; params: Record<string, string> }) => Promise<Response> }) =>
    async (req: NextRequest, ctx?: { params?: Promise<Record<string, string>> }) =>
      handler(req, {
        user: { id: "reviewer-1", role: "reviewer" },
        params:
          (await ctx?.params) ?? {
            assignmentId: "assignment-1",
            userId: "student-1",
          },
      }),
}));

vi.mock("@/lib/api/responses", () => ({
  apiSuccess: (data: unknown, opts?: { status?: number }) =>
    NextResponse.json({ data }, { status: opts?.status ?? 200 }),
  apiError: (error: string, status: number) =>
    NextResponse.json({ error }, { status }),
  apiPaginated: (data: unknown[], page: number, limit: number, total: number) =>
    NextResponse.json({ data, page, limit, total }),
}));

vi.mock("@/lib/assignments/submissions", () => ({
  canViewAssignmentSubmissions: canViewAssignmentSubmissionsMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: dbSelectMock,
  },
}));

describe("GET /api/v1/contests/[assignmentId]/code-snapshots/[userId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canViewAssignmentSubmissionsMock.mockResolvedValue(true);

    // First select: count query, Second select: data query
    let selectCallCount = 0;
    dbSelectMock.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount % 2 === 1) {
        // Count query: db.select({ count: ... }).from(codeSnapshots).where(...)
        return {
          from: () => ({
            where: () => Promise.resolve([{ count: 1 }]),
          }),
        };
      }
      // Data query: db.select({...}).from(codeSnapshots).leftJoin(...).where(...).orderBy(...).limit(...).offset(...)
      return {
        from: () => ({
          leftJoin: () => ({
            where: () => ({
              orderBy: () => ({
                limit: () => ({
                  offset: () => Promise.resolve([
                    {
                      id: "snapshot-1",
                      problemId: "problem-1",
                      problemTitle: "A + B",
                      language: "python",
                      sourceCode: "print(1)",
                      charCount: 8,
                      createdAt: new Date("2026-04-14T00:00:00.000Z"),
                    },
                  ]),
                }),
              }),
            }),
          }),
        }),
      };
    });
  });

  it("returns 403 when the caller cannot view assignment submissions", async () => {
    canViewAssignmentSubmissionsMock.mockResolvedValue(false);

    const { GET } = await import(
      "@/app/api/v1/contests/[assignmentId]/code-snapshots/[userId]/route"
    );
    const response = await GET(
      new NextRequest(
        "http://localhost/api/v1/contests/assignment-1/code-snapshots/student-1"
      ),
      {
        params: Promise.resolve({
          assignmentId: "assignment-1",
          userId: "student-1",
        }),
      }
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "forbidden" });
    expect(dbSelectMock).not.toHaveBeenCalled();
  });

  it("returns snapshots only after assignment-level authorization passes", async () => {
    const { GET } = await import(
      "@/app/api/v1/contests/[assignmentId]/code-snapshots/[userId]/route"
    );
    const response = await GET(
      new NextRequest(
        "http://localhost/api/v1/contests/assignment-1/code-snapshots/student-1?problemId=problem-1"
      ),
      {
        params: Promise.resolve({
          assignmentId: "assignment-1",
          userId: "student-1",
        }),
      }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(canViewAssignmentSubmissionsMock).toHaveBeenCalledWith(
      "assignment-1",
      "reviewer-1",
      "reviewer"
    );
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({
      id: "snapshot-1",
      problemId: "problem-1",
    });
    expect(body.total).toBe(1);
  });
});
