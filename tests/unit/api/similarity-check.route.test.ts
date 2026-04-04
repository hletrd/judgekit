import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const { getContestAssignmentMock, runAndStoreSimilarityCheckMock, mockUser } = vi.hoisted(() => ({
  getContestAssignmentMock: vi.fn(),
  runAndStoreSimilarityCheckMock: vi.fn(),
  mockUser: {
    id: "admin-1",
    role: "admin",
    username: "admin",
    email: "admin@example.com",
    name: "Admin",
    className: null,
    mustChangePassword: false,
  },
}));

vi.mock("@/lib/api/handler", () => ({
  createApiHandler:
    ({ handler }: { handler: (req: NextRequest, ctx: { user: typeof mockUser; params: Record<string, string>; body?: unknown }) => Promise<Response> }) =>
    async (req: NextRequest, routeCtx?: { params?: Promise<Record<string, string>> }) => {
      const params = routeCtx?.params ? await routeCtx.params : {};
      return handler(req, { user: mockUser, body: undefined as never, params });
    },
  isAdmin: (role: string) => role === "admin" || role === "super_admin",
  isInstructor: (role: string) => role === "instructor" || role === "admin" || role === "super_admin",
}));

vi.mock("@/lib/api/responses", () => ({
  apiSuccess: (data: unknown) => NextResponse.json({ data }, { status: 200 }),
  apiError: (error: string, status: number) => NextResponse.json({ error }, { status }),
}));

vi.mock("@/lib/assignments/contests", () => ({
  getContestAssignment: getContestAssignmentMock,
}));

vi.mock("@/lib/assignments/code-similarity", () => ({
  runAndStoreSimilarityCheck: runAndStoreSimilarityCheckMock,
}));

describe("POST /api/v1/contests/[assignmentId]/similarity-check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getContestAssignmentMock.mockResolvedValue({
      id: "assignment-1",
      examMode: "scheduled",
      instructorId: "admin-1",
    });
  });

  it("returns explicit not_run status instead of silently reporting zero flagged pairs", async () => {
    runAndStoreSimilarityCheckMock.mockResolvedValue({
      status: "not_run",
      reason: "too_many_submissions",
      flaggedPairs: 0,
      submissionCount: 700,
      maxSupportedSubmissions: 500,
    });

    const { POST } = await import("@/app/api/v1/contests/[assignmentId]/similarity-check/route");
    const req = new NextRequest("http://localhost:3000/api/v1/contests/assignment-1/similarity-check", {
      method: "POST",
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });

    const res = await POST(req, { params: Promise.resolve({ assignmentId: "assignment-1" }) } as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toMatchObject({
      status: "not_run",
      reason: "too_many_submissions",
      submissionCount: 700,
    });
  });

  it("returns explicit timed_out status when the scan exceeds the route timeout", async () => {
    vi.useFakeTimers();
    runAndStoreSimilarityCheckMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({
            status: "completed",
            reason: null,
            flaggedPairs: 0,
            submissionCount: 2,
            maxSupportedSubmissions: 500,
          }), 31_000);
        })
    );

    const { POST } = await import("@/app/api/v1/contests/[assignmentId]/similarity-check/route");
    const req = new NextRequest("http://localhost:3000/api/v1/contests/assignment-1/similarity-check", {
      method: "POST",
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });

    const resPromise = POST(req, { params: Promise.resolve({ assignmentId: "assignment-1" }) } as never);
    await vi.advanceTimersByTimeAsync(30_000);
    const res = await resPromise;
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toMatchObject({
      status: "timed_out",
      reason: "timeout",
    });

    vi.useRealTimers();
  });
});
