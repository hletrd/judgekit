import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const { consumeApiRateLimitMock } = vi.hoisted(() => ({
  consumeApiRateLimitMock: vi.fn(),
}));

vi.mock("@/lib/api/auth", () => ({
  getApiUser: vi.fn(),
  csrfForbidden: vi.fn(() => null),
  unauthorized: () => NextResponse.json({ error: "unauthorized" }, { status: 401 }),
  forbidden: () => NextResponse.json({ error: "forbidden" }, { status: 403 }),
  notFound: (resource: string) => NextResponse.json({ error: "notFound", resource }, { status: 404 }),
  isAdmin: vi.fn(() => true),
  isInstructor: vi.fn(() => true),
}));

vi.mock("@/lib/api/responses", () => ({
  apiSuccess: (data: unknown, opts?: { status?: number }) =>
    NextResponse.json({ data }, { status: opts?.status ?? 200 }),
  apiError: (error: string, status: number, resource?: string) =>
    NextResponse.json(resource ? { error, resource } : { error }, { status }),
}));

vi.mock("@/lib/security/api-rate-limit", () => ({
  consumeApiRateLimit: consumeApiRateLimitMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

vi.mock("@/lib/judge/languages", () => ({
  isJudgeLanguage: vi.fn(() => true),
  getJudgeLanguageDefinition: vi.fn(() => ({
    extension: "py",
    dockerImage: "judge-python",
    runCommand: ["python3", "/workspace/main.py"],
    compileCommand: null,
  })),
  serializeJudgeCommand: vi.fn(() => null),
}));

vi.mock("@/lib/compiler/execute", () => ({
  executeCompilerRun: vi.fn(),
}));

describe("POST /api/v1/playground/run", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consumeApiRateLimitMock.mockResolvedValue(null);
  });

  it("allows unauthenticated guests to run code", { timeout: 15000 }, async () => {
    const { db } = await import("@/lib/db");
    const { executeCompilerRun } = await import("@/lib/compiler/execute");
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              extension: "py",
              dockerImage: "judge-python",
              compileCommand: null,
              runCommand: "python3 /workspace/main.py",
              isEnabled: true,
            },
          ]),
        }),
      }),
    } as never);
    vi.mocked(executeCompilerRun).mockResolvedValue({
      stdout: "3\n",
      stderr: "",
      exitCode: 0,
      executionTimeMs: 12,
      timedOut: false,
      oomKilled: false,
      compileOutput: null,
    });

    const { POST } = await import("@/app/api/v1/playground/run/route");
    const request = new NextRequest("http://localhost:3000/api/v1/playground/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify({
        language: "python",
        sourceCode: "print(1 + 2)",
        stdin: "",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        stdout: "3\n",
        stderr: "",
        exitCode: 0,
        executionTimeMs: 12,
        timedOut: false,
        oomKilled: false,
        compileOutput: null,
      },
    });
    expect(consumeApiRateLimitMock).toHaveBeenCalledOnce();
  });
});
