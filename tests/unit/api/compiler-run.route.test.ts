import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const {
  getApiUserMock,
  consumeApiRateLimitMock,
  resolveCapabilitiesMock,
  getEffectivePlatformModeMock,
} = vi.hoisted(() => ({
  getApiUserMock: vi.fn(),
  consumeApiRateLimitMock: vi.fn(),
  resolveCapabilitiesMock: vi.fn(),
  getEffectivePlatformModeMock: vi.fn(),
}));

vi.mock("@/lib/api/auth", () => ({
  getApiUser: getApiUserMock,
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

vi.mock("@/lib/capabilities", () => ({
  resolveCapabilities: resolveCapabilitiesMock,
}));

vi.mock("@/lib/platform-mode-context", () => ({
  getEffectivePlatformMode: getEffectivePlatformModeMock,
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

describe("POST /api/v1/compiler/run", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getApiUserMock.mockResolvedValue({
      id: "student-1",
      role: "student",
      username: "student",
      email: "student@example.com",
      name: "Student",
      className: null,
      mustChangePassword: false,
    });
    consumeApiRateLimitMock.mockResolvedValue(null);
    resolveCapabilitiesMock.mockResolvedValue(new Set(["content.submit_solutions"]));
    getEffectivePlatformModeMock.mockResolvedValue("homework");
  });

  it("blocks standalone compiler in recruiting mode even when the global site is permissive", async () => {
    getEffectivePlatformModeMock.mockResolvedValue("recruiting");
    const { POST } = await import("@/app/api/v1/compiler/run/route");

    const request = new NextRequest("http://localhost:3000/api/v1/compiler/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify({
        language: "python",
        sourceCode: "print(1)",
        stdin: "",
        assignmentId: "assignment-1",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "compilerDisabledInCurrentMode" });
    expect(getEffectivePlatformModeMock).toHaveBeenCalledWith({
      userId: "student-1",
      assignmentId: "assignment-1",
    });
  });
});
