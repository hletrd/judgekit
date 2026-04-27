import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, findProblemMock, canAccessProblemMock, getRecruitingAccessContextMock, redirectMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  findProblemMock: vi.fn(),
  canAccessProblemMock: vi.fn(),
  getRecruitingAccessContextMock: vi.fn(),
  redirectMock: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("@/lib/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      problems: {
        findFirst: findProblemMock,
      },
    },
  },
}));

vi.mock("@/lib/auth/permissions", () => ({
  canAccessProblem: canAccessProblemMock,
}));

vi.mock("@/lib/recruiting/access", () => ({
  getRecruitingAccessContext: getRecruitingAccessContextMock,
}));

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

import ProblemRankingsPage from "@/app/(public)/practice/problems/[id]/rankings/page";

describe("ProblemRankingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "candidate-1", role: "student" } });
    findProblemMock.mockResolvedValue({ id: "problem-1", title: "Two Sum" });
    canAccessProblemMock.mockResolvedValue(true);
    getRecruitingAccessContextMock.mockResolvedValue({
      assignmentIds: ["assignment-1"],
      problemIds: ["problem-1"],
      isRecruitingCandidate: true,
      effectivePlatformMode: "recruiting",
    });
  });

  it("redirects recruiting candidates back to the problem detail page", async () => {
    await expect(
      ProblemRankingsPage({ params: Promise.resolve({ id: "problem-1" }) })
    ).rejects.toThrow("REDIRECT:/dashboard/problems/problem-1");

    expect(canAccessProblemMock).toHaveBeenCalledWith("problem-1", "candidate-1", "student");
    expect(getRecruitingAccessContextMock).toHaveBeenCalledWith("candidate-1");
  });
});
