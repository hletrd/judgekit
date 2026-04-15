import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NotFoundPage from "@/app/not-found";

const { authMock, getResolvedSystemSettingsMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  getResolvedSystemSettingsMock: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("next-intl/server", () => ({
  getLocale: async () => "en",
  getTranslations: async (namespace: string) => (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      common: { appName: "JudgeKit", appDescription: "Online judge", back: "Back" },
      auth: { signIn: "Sign in", signUp: "Sign up" },
      publicShell: {
        "nav.practice": "Practice",
        "nav.playground": "Playground",
        "nav.contests": "Contests",
        "nav.community": "Community",
        "nav.workspace": "Workspace",
      },
      dashboardState: {
        notFoundTitle: "Page not found",
        notFoundDescription: "This page doesn't exist.",
        backToDashboard: "Back to Dashboard",
      },
    };

    return translations[namespace]?.[key] ?? key;
  },
}));

vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/system-settings", () => ({ getResolvedSystemSettings: getResolvedSystemSettingsMock }));
vi.mock("@/components/layout/public-header", () => ({
  PublicHeader: () => <div>public-header</div>,
}));
vi.mock("@/components/layout/public-footer", () => ({
  PublicFooter: () => <div>public-footer</div>,
}));

describe("NotFoundPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getResolvedSystemSettingsMock.mockResolvedValue({
      siteTitle: "JudgeKit",
      siteDescription: "Online judge",
      publicSignupEnabled: true,
    });
  });

  it("renders guest 404 content", async () => {
    authMock.mockResolvedValue(null);
    render(await NotFoundPage());

    expect(screen.getByText("public-header")).toBeInTheDocument();
    expect(screen.getByText("public-footer")).toBeInTheDocument();
    expect(screen.getByText("Page not found")).toBeInTheDocument();
    expect(screen.getByText("This page doesn't exist.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/");
  });

  it("links logged-in users back to dashboard", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", name: "User" } });
    render(await NotFoundPage());

    expect(screen.getByRole("link", { name: "Back to Dashboard" })).toHaveAttribute("href", "/dashboard");
  });
});
