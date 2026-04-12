import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecruitStartForm } from "@/app/(auth)/recruit/[token]/recruit-start-form";

const { pushMock, refreshMock, signInMock, signOutMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
  signInMock: vi.fn(),
  signOutMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      startAssessment: "Start Assessment",
      continueAssessment: "Continue Assessment",
      starting: "Starting...",
      startFailed: "Couldn't start. Try again.",
      resumeCodeLabel: "Resume code",
      resumeCodeSetupLabel: "Create a resume code",
      resumeCodePlaceholder: "Enter your resume code",
      resumeCodeSetupHint: "Create a private code you can use later.",
      resumeCodeResumeHint: "Enter the code you created earlier.",
      resumeCodeMissing: "Enter your resume code to continue.",
      resumeCodeInvalid: "The resume code is incorrect. Try again or contact the organizer.",
    };
    return messages[key] ?? key;
  },
}));

vi.mock("next-auth/react", () => ({
  signIn: signInMock,
  signOut: signOutMock,
}));

describe("RecruitStartForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signOutMock.mockResolvedValue(undefined);
    signInMock.mockResolvedValue({ ok: true });
  });

  it("requires creating a resume code on first claim and includes it in sign-in", async () => {
    const user = userEvent.setup();

    render(
      <RecruitStartForm
        token="invite-token"
        assignmentId="assignment-1"
        isReentry={false}
        resumeWithCurrentSession={false}
        requireResumeCode
        resumeMode="setup"
      />
    );

    await user.type(screen.getByLabelText("Create a resume code"), "resume-secret");
    await user.click(screen.getByRole("button", { name: "Start Assessment" }));

    await waitFor(() => {
      expect(signOutMock).toHaveBeenCalledWith({ redirect: false });
      expect(signInMock).toHaveBeenCalledWith("credentials", {
        recruitToken: "invite-token",
        recruitResumeCode: "resume-secret",
        redirect: false,
      });
      expect(pushMock).toHaveBeenCalledWith("/dashboard/contests/assignment-1");
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  it("requires the existing resume code for a resumed assessment", async () => {
    const user = userEvent.setup();

    render(
      <RecruitStartForm
        token="invite-token"
        assignmentId="assignment-2"
        isReentry
        resumeWithCurrentSession={false}
        requireResumeCode
        resumeMode="resume"
      />
    );

    await user.type(screen.getByLabelText("Resume code"), "resume-secret");
    await user.click(screen.getByRole("button", { name: "Continue Assessment" }));

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith("credentials", {
        recruitToken: "invite-token",
        recruitResumeCode: "resume-secret",
        redirect: false,
      });
      expect(pushMock).toHaveBeenCalledWith("/dashboard/contests/assignment-2");
    });
  });

  it("shows a validation error when a required resume code is missing", async () => {
    const user = userEvent.setup();

    render(
      <RecruitStartForm
        token="invite-token"
        assignmentId="assignment-3"
        isReentry
        resumeWithCurrentSession={false}
        requireResumeCode
        resumeMode="resume"
      />
    );

    await user.click(screen.getByRole("button", { name: "Continue Assessment" }));

    expect(screen.getByText("Enter your resume code to continue.")).toBeInTheDocument();
    expect(signOutMock).not.toHaveBeenCalled();
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("reuses the current session without replaying the invite token", async () => {
    const user = userEvent.setup();

    render(
      <RecruitStartForm
        token="invite-token"
        assignmentId="assignment-4"
        isReentry
        resumeWithCurrentSession
        requireResumeCode={false}
        resumeMode="resume"
      />
    );

    await user.click(screen.getByRole("button", { name: "Continue Assessment" }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/dashboard/contests/assignment-4");
      expect(refreshMock).toHaveBeenCalled();
    });
    expect(signOutMock).not.toHaveBeenCalled();
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("shows a resume-code error when resumed sign-in fails", async () => {
    const user = userEvent.setup();
    signInMock.mockResolvedValueOnce({ ok: false });

    render(
      <RecruitStartForm
        token="invite-token"
        assignmentId="assignment-5"
        isReentry
        resumeWithCurrentSession={false}
        requireResumeCode
        resumeMode="resume"
      />
    );

    await user.type(screen.getByLabelText("Resume code"), "wrong-code");
    await user.click(screen.getByRole("button", { name: "Continue Assessment" }));

    await waitFor(() => {
      expect(screen.getByText("The resume code is incorrect. Try again or contact the organizer.")).toBeInTheDocument();
    });
    expect(pushMock).not.toHaveBeenCalled();
  });
});
