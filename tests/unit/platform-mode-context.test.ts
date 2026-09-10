import { beforeEach, describe, expect, it, vi } from "vitest";

const { rawQueryOneMock, getResolvedPlatformModeMock, getSystemSettingsMock } = vi.hoisted(
  () => ({
    rawQueryOneMock: vi.fn(),
    getResolvedPlatformModeMock: vi.fn(),
    getSystemSettingsMock: vi.fn(),
  })
);

vi.mock("@/lib/db/queries", () => ({
  rawQueryOne: rawQueryOneMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      recruitingInvitations: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      assignments: {
        findFirst: vi.fn().mockResolvedValue({ examMode: "windowed" }),
      },
    },
  },
}));

vi.mock("@/lib/system-settings", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/system-settings")>();
  return {
    ...actual,
    getResolvedPlatformMode: getResolvedPlatformModeMock,
    getSystemSettings: getSystemSettingsMock,
  };
});

describe("platform mode context derivation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getResolvedPlatformModeMock.mockResolvedValue("homework");
    getSystemSettingsMock.mockResolvedValue({ aiAssistantEnabled: true });
  });

  it("derives a restricted assignment from problem context when assignmentId is omitted", async () => {
    rawQueryOneMock.mockResolvedValueOnce({ assignmentId: "assignment-1" });

    const { getEffectivePlatformMode } = await import("@/lib/platform-mode-context");
    await expect(
      getEffectivePlatformMode({
        userId: "student-1",
        assignmentId: null,
        problemId: "problem-1",
      })
    ).resolves.toBe("contest");
  });

  it("derives an active restricted assignment for a user when compiler context omits assignmentId", async () => {
    rawQueryOneMock.mockResolvedValueOnce({ assignmentId: "assignment-2" });

    const { getEffectivePlatformMode } = await import("@/lib/platform-mode-context");
    await expect(
      getEffectivePlatformMode({
        userId: "student-1",
        assignmentId: null,
      })
    ).resolves.toBe("contest");
  });

  it("prefers the server-derived restricted problem assignment over a forged assignmentId", async () => {
    rawQueryOneMock.mockImplementation((query: string, params: Record<string, string>) => {
      if (query.includes("WHERE a.id = @assignmentId")) {
        return Promise.resolve(null);
      }
      if (params.problemId === "problem-1") {
        return Promise.resolve({ assignmentId: "assignment-1" });
      }
      return Promise.resolve(null);
    });

    const { resolvePlatformModeAssignmentContextDetails } = await import(
      "@/lib/platform-mode-context"
    );
    await expect(
      resolvePlatformModeAssignmentContextDetails({
        userId: "student-1",
        assignmentId: "forged-assignment",
        problemId: "problem-1",
      })
    ).resolves.toEqual({
      assignmentId: "assignment-1",
      mismatch: {
        providedAssignmentId: "forged-assignment",
        resolvedAssignmentId: "assignment-1",
        reason: "problem_scope",
      },
    });
  });

  it("drops an invalid problem-scoped assignmentId instead of trusting it", async () => {
    rawQueryOneMock.mockImplementation((query: string) => {
      if (query.includes("WHERE a.id = @assignmentId")) {
        return Promise.resolve(null);
      }
      return Promise.resolve(null);
    });

    const { resolvePlatformModeAssignmentContextDetails } = await import(
      "@/lib/platform-mode-context"
    );
    await expect(
      resolvePlatformModeAssignmentContextDetails({
        userId: "student-1",
        assignmentId: "forged-assignment",
        problemId: "problem-1",
      })
    ).resolves.toEqual({
      assignmentId: null,
      mismatch: {
        providedAssignmentId: "forged-assignment",
        resolvedAssignmentId: "forged-assignment",
        reason: "problem_scope",
      },
    });
  });

  it("prefers an active restricted assignment over a forged compiler assignmentId", async () => {
    rawQueryOneMock.mockResolvedValue({ assignmentId: "assignment-2" });

    const { resolvePlatformModeAssignmentContextDetails } = await import(
      "@/lib/platform-mode-context"
    );
    await expect(
      resolvePlatformModeAssignmentContextDetails({
        userId: "student-1",
        assignmentId: "forged-assignment",
      })
    ).resolves.toEqual({
      assignmentId: "assignment-2",
      mismatch: {
        providedAssignmentId: "forged-assignment",
        resolvedAssignmentId: "assignment-2",
        reason: "active_restricted_scope",
      },
    });
  });
});

describe("non-interactive AI output (post-judge auto review)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getResolvedPlatformModeMock.mockResolvedValue("homework");
    getSystemSettingsMock.mockResolvedValue({ aiAssistantEnabled: true });
  });

  it("is suppressed for a participant with an active restricted assignment when interactive", async () => {
    rawQueryOneMock.mockResolvedValueOnce({ assignmentId: "assignment-2" });

    const { isAiAssistantEnabledForContext } = await import("@/lib/platform-mode-context");
    await expect(
      isAiAssistantEnabledForContext({ userId: "student-1", assignmentId: null })
    ).resolves.toBe(false);
  });

  it("still runs for that same participant when interactive is false", async () => {
    // The regression this guards: a student enrolled in ANY currently-open
    // exam_mode != 'none' assignment resolved to contest mode, so the
    // post-judge review was disabled on every one of their submissions —
    // practice and plain homework included.
    rawQueryOneMock.mockResolvedValueOnce({ assignmentId: "assignment-2" });

    const { isAiAssistantEnabledForContext } = await import("@/lib/platform-mode-context");
    await expect(
      isAiAssistantEnabledForContext({
        userId: "student-1",
        assignmentId: null,
        interactive: false,
      })
    ).resolves.toBe(true);
  });

  it("still honours the master aiAssistantEnabled kill switch", async () => {
    getSystemSettingsMock.mockResolvedValue({ aiAssistantEnabled: false });
    rawQueryOneMock.mockResolvedValueOnce({ assignmentId: "assignment-2" });

    const { isAiAssistantEnabledForContext } = await import("@/lib/platform-mode-context");
    await expect(
      isAiAssistantEnabledForContext({
        userId: "student-1",
        assignmentId: null,
        interactive: false,
      })
    ).resolves.toBe(false);
  });

  it("still honours a per-contest aiAssistantPolicy of forbid", async () => {
    const dbModule = await import("@/lib/db");
    vi.mocked(dbModule.db.query.assignments.findFirst).mockResolvedValueOnce({
      examMode: "scheduled",
      aiAssistantPolicy: "forbid",
    } as never);
    rawQueryOneMock.mockResolvedValueOnce({ assignmentId: "assignment-2" });

    const { isAiAssistantEnabledForContext } = await import("@/lib/platform-mode-context");
    await expect(
      isAiAssistantEnabledForContext({
        userId: "student-1",
        assignmentId: null,
        interactive: false,
      })
    ).resolves.toBe(false);
  });
});

describe("restricted-mode override single source of truth (RPF cycle-1 A2)", () => {
  it("isAiAssistantEnabledForContext delegates to getEffectiveModeRestrictions instead of re-deriving the override inline", async () => {
    // Guard against drift: the admin override rule
    // (restrictAiByDefault && !allowAiAssistantInRestrictedModes) must live in
    // exactly one place — getEffectiveModeRestrictions. A second inline copy
    // here is how the two resolution paths diverged before this cycle.
    const { readFileSync } = await import("node:fs");
    const source = readFileSync("src/lib/platform-mode-context.ts", "utf8");
    expect(source).toContain("getEffectiveModeRestrictions(");
    expect(source).not.toContain("allowAiAssistantInRestrictedModes ??");
  });
});
