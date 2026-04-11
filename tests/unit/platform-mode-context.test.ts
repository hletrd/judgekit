import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getResolvedPlatformModeMock,
  getSystemSettingsMock,
  recruitingInvitationFindFirstMock,
  assignmentFindFirstMock,
} = vi.hoisted(() => ({
  getResolvedPlatformModeMock: vi.fn(),
  getSystemSettingsMock: vi.fn(),
  recruitingInvitationFindFirstMock: vi.fn(),
  assignmentFindFirstMock: vi.fn(),
}));

vi.mock("@/lib/system-settings", () => ({
  getResolvedPlatformMode: getResolvedPlatformModeMock,
  getSystemSettings: getSystemSettingsMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      recruitingInvitations: {
        findFirst: recruitingInvitationFindFirstMock,
      },
      assignments: {
        findFirst: assignmentFindFirstMock,
      },
    },
  },
}));

describe("platform-mode context helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getResolvedPlatformModeMock.mockResolvedValue("homework");
    getSystemSettingsMock.mockResolvedValue({ aiAssistantEnabled: true });
    recruitingInvitationFindFirstMock.mockResolvedValue(null);
    assignmentFindFirstMock.mockResolvedValue(null);
  });

  it("treats redeemed recruiting users as recruiting mode even when the site default is homework", async () => {
    const { getEffectivePlatformMode } = await import("@/lib/platform-mode-context");
    recruitingInvitationFindFirstMock.mockResolvedValue({ id: "invite-1" });

    await expect(
      getEffectivePlatformMode({ userId: "candidate-1" })
    ).resolves.toBe("recruiting");
  });

  it("promotes assignment-scoped exam sessions to contest mode on homework deployments", async () => {
    const { getEffectivePlatformMode } = await import("@/lib/platform-mode-context");
    assignmentFindFirstMock.mockResolvedValue({ examMode: "scheduled" });

    await expect(
      getEffectivePlatformMode({ userId: "student-1", assignmentId: "assignment-1" })
    ).resolves.toBe("contest");
  });

  it("keeps exam deployments in exam mode for assignment-scoped sessions", async () => {
    const { getEffectivePlatformMode } = await import("@/lib/platform-mode-context");
    getResolvedPlatformModeMock.mockResolvedValue("exam");
    assignmentFindFirstMock.mockResolvedValue({ examMode: "windowed" });

    await expect(
      getEffectivePlatformMode({ userId: "student-1", assignmentId: "assignment-1" })
    ).resolves.toBe("exam");
  });

  it("disables AI help for contest assignments even when the global AI toggle is on", async () => {
    const { isAiAssistantEnabledForContext } = await import("@/lib/platform-mode-context");
    assignmentFindFirstMock.mockResolvedValue({ examMode: "scheduled" });

    await expect(
      isAiAssistantEnabledForContext({ userId: "student-1", assignmentId: "assignment-1" })
    ).resolves.toBe(false);
  });

  it("respects the global AI toggle in homework contexts", async () => {
    const { isAiAssistantEnabledForContext } = await import("@/lib/platform-mode-context");
    getSystemSettingsMock.mockResolvedValue({ aiAssistantEnabled: false });

    await expect(
      isAiAssistantEnabledForContext({ userId: "student-1" })
    ).resolves.toBe(false);
  });
});
