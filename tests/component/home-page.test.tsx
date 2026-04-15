import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "@/app/page";

const { authMock, getResolvedSystemSettingsMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  getResolvedSystemSettingsMock: vi.fn(),
}));

vi.mock("next-intl/server", () => ({
  getLocale: async () => "en",
  getTranslations: async (namespace: string) => (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      common: {
        appName: "JudgeKit",
        appDescription: "Online judge",
      },
      auth: {
        signIn: "Sign in",
        signUp: "Sign up",
      },
      publicShell: {
        "nav.practice": "Practice",
        "nav.playground": "Playground",
        "nav.contests": "Contests",
        "nav.community": "Community",
        "nav.workspace": "Workspace",
        "home.eyebrow": "Online judge platform",
        "home.title": "Write code. Submit. Get judged.",
        "home.description": "Practice, contest, and coursework platform",
        "home.primaryCta": "Open workspace",
        "home.secondaryCta": "Sign in",
        "home.cards.practice.title": "Practice",
        "home.cards.practice.description": "Solve problems",
        "home.cards.playground.title": "Playground",
        "home.cards.playground.description": "Run code",
        "home.cards.contests.title": "Contests",
        "home.cards.contests.description": "Join contests",
        "home.cards.community.title": "Community",
        "home.cards.community.description": "Discuss",
      },
    };

    return translations[namespace]?.[key] ?? key;
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/system-settings", () => ({
  getResolvedSystemSettings: getResolvedSystemSettingsMock,
}));

vi.mock("@/components/layout/public-header", () => ({
  PublicHeader: ({ children }: { children?: ReactNode }) => <div>{children ?? "public-header"}</div>,
}));

vi.mock("@/app/(public)/_components/public-home-page", () => ({
  PublicHomePage: ({ primaryCta, secondaryCta }: { primaryCta: { label: string }; secondaryCta?: { label: string } | null }) => (
    <div>
      <div>{primaryCta.label}</div>
      {secondaryCta ? <div>{secondaryCta.label}</div> : null}
    </div>
  ),
}));

describe("HomePage hero CTAs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getResolvedSystemSettingsMock.mockResolvedValue({
      siteTitle: "JudgeKit",
      siteDescription: "Online judge",
      homePageContent: null,
      publicSignupEnabled: false,
    });
  });

  it("hides the sign-in hero CTA for logged-in users", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", name: "User" } });

    render(await HomePage());

    expect(screen.getByText("Open workspace")).toBeInTheDocument();
    expect(screen.queryByText("Sign in")).not.toBeInTheDocument();
  });

  it("shows the sign-in hero CTA for guests", async () => {
    authMock.mockResolvedValue(null);

    render(await HomePage());

    expect(screen.getByText("Open workspace")).toBeInTheDocument();
    expect(screen.getByText("Sign in")).toBeInTheDocument();
  });
});
