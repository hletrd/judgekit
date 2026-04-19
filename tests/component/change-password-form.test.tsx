import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChangePasswordForm } from "@/app/change-password/change-password-form";

const {
  signInMock,
  signOutMock,
  routerReplaceMock,
  routerRefreshMock,
  changePasswordMock,
} = vi.hoisted(() => ({
  signInMock: vi.fn(),
  signOutMock: vi.fn(),
  routerReplaceMock: vi.fn(),
  routerRefreshMock: vi.fn(),
  changePasswordMock: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  signIn: signInMock,
  signOut: signOutMock,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: routerReplaceMock,
    refresh: routerRefreshMock,
  }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      currentPassword: "Current password",
      newPassword: "New password",
      confirmPassword: "Confirm password",
      passwordMismatch: "Passwords do not match",
      changing: "Changing...",
      changeButton: "Change password",
      currentPasswordIncorrect: "Current password is incorrect",
      error: "Something went wrong",
    };
    return translations[key] ?? key;
  },
}));

vi.mock("@/lib/actions/change-password", () => ({
  changePassword: changePasswordMock,
}));

describe("ChangePasswordForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signOutMock.mockResolvedValue(undefined);
    signInMock.mockResolvedValue({ ok: true, url: "http://localhost:3000/dashboard" });
    changePasswordMock.mockResolvedValue({ success: true });
  });

  it("re-authenticates after a successful password change and redirects to dashboard", async () => {
    const user = userEvent.setup();
    render(<ChangePasswordForm username="admin" />);

    await user.type(screen.getByLabelText("Current password"), "old-password");
    await user.type(screen.getByLabelText("New password"), "new-password-123");
    await user.type(screen.getByLabelText("Confirm password"), "new-password-123");
    await user.click(screen.getByRole("button", { name: "Change password" }));

    await waitFor(() => {
      expect(changePasswordMock).toHaveBeenCalledWith("old-password", "new-password-123");
      expect(signOutMock).not.toHaveBeenCalled();
      expect(signInMock).toHaveBeenCalledWith("credentials", expect.objectContaining({
        username: "admin",
        password: "new-password-123",
        redirect: false,
        redirectTo: "/dashboard",
      }));
      expect(routerReplaceMock).toHaveBeenCalledWith("/dashboard");
      expect(routerRefreshMock).toHaveBeenCalled();
    });
  });

  it("shows mismatch error without submitting", async () => {
    const user = userEvent.setup();
    render(<ChangePasswordForm username="admin" />);

    await user.type(screen.getByLabelText("Current password"), "old-password");
    await user.type(screen.getByLabelText("New password"), "new-password-123");
    await user.type(screen.getByLabelText("Confirm password"), "different-password");
    await user.click(screen.getByRole("button", { name: "Change password" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Passwords do not match");
    expect(changePasswordMock).not.toHaveBeenCalled();
  });
});
