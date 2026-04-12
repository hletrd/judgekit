import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authMock,
  dbSelectMock,
  getRecruitingInvitationByTokenMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  dbSelectMock: vi.fn(),
  getRecruitingInvitationByTokenMock: vi.fn(),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string, values?: Record<string, string | number>) => {
    const messages: Record<string, string> = {
      title: "Coding Assessment",
      invalidToken: "Invalid link",
      invalidTokenDescription: "This link is invalid or has been revoked.",
      expired: "Link expired",
      expiredDescription: "This link has expired. Contact the organizer for a new one.",
      contestClosed: "Assessment closed",
      contestClosedDescription: "This assessment is closed.",
      importantNotes: "Before you start",
      noteTimer: "Timer note",
      noteSubmissions: "Submission note",
      noteCompletion: "Completion note",
      reviewNoticeTitle: "Assessment review notice",
      reviewNoticeSubmissions: "Review submissions note",
      reviewNoticeSignals: "Review signals note",
      reviewNoticeAi: "Review AI note",
      continueAssessment: "Continue Assessment",
      startAssessment: "Start Assessment",
      claimed: "Assessment already claimed",
      claimedDescription:
        "This invitation has already been used. Continue from your existing assessment session on this device, or enter your resume code to continue from a new session. If you no longer have it, contact the organizer to reset access.",
      resumeSessionOnlyNotice:
        "For security, this invite link can no longer sign you in again. Continue with your current assessment session or use your resume code on a new session.",
      resumeCodeNotice:
        "This invite link can no longer sign you in by itself. Enter the resume code you created when you first started the assessment.",
    };

    if (key === "welcome") {
      return `Welcome, ${values?.name ?? ""}`;
    }
    if (key === "problemCount") {
      return `${values?.count ?? 0} problems`;
    }
    if (key === "durationDetail") {
      return `Time limit: ${values?.minutes ?? 0} minutes`;
    }
    if (key === "deadlineInfo") {
      return `Deadline: ${values?.date ?? ""}`;
    }

    return messages[key] ?? key;
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/assignments/recruiting-invitations", () => ({
  getRecruitingInvitationByToken: getRecruitingInvitationByTokenMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: dbSelectMock,
  },
}));

vi.mock("@/app/(auth)/recruit/[token]/recruit-start-form", () => ({
  RecruitStartForm: ({
    assignmentId,
    isReentry,
    resumeWithCurrentSession,
    requireResumeCode,
    resumeMode,
  }: {
    assignmentId: string;
    isReentry: boolean;
    resumeWithCurrentSession: boolean;
    requireResumeCode: boolean;
    resumeMode: "setup" | "resume";
  }) => (
    <div
      data-testid="recruit-start-form"
      data-assignment-id={assignmentId}
      data-reentry={String(isReentry)}
      data-resume={String(resumeWithCurrentSession)}
      data-require-resume-code={String(requireResumeCode)}
      data-resume-mode={resumeMode}
    />
  ),
}));

import RecruitPage from "@/app/(auth)/recruit/[token]/page";

function mockSelectQueue(...results: unknown[][]) {
  dbSelectMock.mockImplementation(() => {
    const result = results.shift() ?? [];
    const whereResult = Promise.resolve(result) as Promise<unknown[]> & {
      limit: () => Promise<unknown[]>;
    };
    whereResult.limit = async () => result;

    return {
      from: () => ({
        where: () => whereResult,
      }),
    };
  });
}

describe("RecruitPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue(null);
  });

  it("requires a resume code when claiming an invite for the first time", async () => {
    getRecruitingInvitationByTokenMock.mockResolvedValue({
      id: "invite-1",
      status: "pending",
      assignmentId: "assignment-1",
      candidateName: "Candidate One",
      expiresAt: null,
      userId: null,
      metadata: {},
    });
    mockSelectQueue(
      [
        {
          id: "assignment-1",
          title: "Recruiting Assignment",
          description: "Assessment details",
          examDurationMinutes: 90,
          deadline: null,
        },
      ],
      [{ count: 2 }]
    );

    render(await RecruitPage({ params: Promise.resolve({ token: "invite-token" }) }));

    expect(screen.getByText("Welcome, Candidate One")).toBeInTheDocument();
    expect(screen.getByTestId("recruit-start-form")).toHaveAttribute("data-require-resume-code", "true");
    expect(screen.getByTestId("recruit-start-form")).toHaveAttribute("data-resume-mode", "setup");
  });

  it("blocks replayed invite URLs when the candidate has neither the claimed session nor a resume code", async () => {
    getRecruitingInvitationByTokenMock.mockResolvedValue({
      id: "invite-2",
      status: "redeemed",
      assignmentId: "assignment-2",
      candidateName: "Candidate Two",
      expiresAt: null,
      userId: "user-2",
      metadata: {},
    });

    render(await RecruitPage({ params: Promise.resolve({ token: "invite-token" }) }));

    expect(screen.getByText("Assessment already claimed")).toBeInTheDocument();
    expect(
      screen.getByText(/enter your resume code to continue from a new session/i)
    ).toBeInTheDocument();
    expect(screen.queryByTestId("recruit-start-form")).not.toBeInTheDocument();
    expect(dbSelectMock).not.toHaveBeenCalled();
  });

  it("prompts for a resume code when the invite was already claimed elsewhere", async () => {
    getRecruitingInvitationByTokenMock.mockResolvedValue({
      id: "invite-3",
      status: "redeemed",
      assignmentId: "assignment-3",
      candidateName: "Candidate Three",
      expiresAt: null,
      userId: "user-3",
      metadata: { resumeCodeHash: "argon-hash" },
    });
    mockSelectQueue(
      [
        {
          id: "assignment-3",
          title: "Claimed Assessment",
          description: "Assessment details",
          examDurationMinutes: 60,
          deadline: null,
        },
      ],
      [{ count: 1 }]
    );

    render(await RecruitPage({ params: Promise.resolve({ token: "invite-token" }) }));

    expect(screen.getByText(/Enter the resume code you created when you first started the assessment/i)).toBeInTheDocument();
    expect(screen.getByTestId("recruit-start-form")).toHaveAttribute("data-reentry", "true");
    expect(screen.getByTestId("recruit-start-form")).toHaveAttribute("data-resume", "false");
    expect(screen.getByTestId("recruit-start-form")).toHaveAttribute("data-require-resume-code", "true");
    expect(screen.getByTestId("recruit-start-form")).toHaveAttribute("data-resume-mode", "resume");
  });

  it("lets the claimed candidate continue with their current session without entering the resume code again", async () => {
    authMock.mockResolvedValue({
      user: {
        id: "user-4",
      },
    });
    getRecruitingInvitationByTokenMock.mockResolvedValue({
      id: "invite-4",
      status: "redeemed",
      assignmentId: "assignment-4",
      candidateName: "Candidate Four",
      expiresAt: null,
      userId: "user-4",
      metadata: { resumeCodeHash: "argon-hash" },
    });
    mockSelectQueue(
      [
        {
          id: "assignment-4",
          title: "Current Session Assessment",
          description: "Assessment details",
          examDurationMinutes: 60,
          deadline: null,
        },
      ],
      [{ count: 1 }]
    );

    render(await RecruitPage({ params: Promise.resolve({ token: "invite-token" }) }));

    expect(screen.getByText(/current assessment session/i)).toBeInTheDocument();
    expect(screen.getByTestId("recruit-start-form")).toHaveAttribute("data-resume", "true");
    expect(screen.getByTestId("recruit-start-form")).toHaveAttribute("data-require-resume-code", "false");
  });
});
