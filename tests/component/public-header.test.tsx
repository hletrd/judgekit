import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { PublicHeader } from "@/components/layout/public-header";

vi.mock("next/navigation", () => ({
  usePathname: () => "/practice",
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("@/components/layout/theme-toggle", () => ({
  ThemeToggle: () => <div>theme-toggle</div>,
}));

vi.mock("@/components/layout/locale-switcher", () => ({
  LocaleSwitcher: () => <div>locale-switcher</div>,
}));

describe("PublicHeader", () => {
  it("renders public nav items and actions", () => {
    render(
      <PublicHeader
        siteTitle="JudgeKit"
        items={[
          { href: "/practice", label: "Practice" },
          { href: "/community", label: "Community" },
        ]}
        actions={[
          { href: "/workspace", label: "Workspace" },
          { href: "/login", label: "Sign in" },
        ]}
      />
    );

    expect(screen.getByText("JudgeKit")).toBeInTheDocument();
    expect(screen.getByText("Practice")).toBeInTheDocument();
    expect(screen.getByText("Community")).toBeInTheDocument();
    expect(screen.getByText("Workspace")).toBeInTheDocument();
    expect(screen.getByText("Sign in")).toBeInTheDocument();
    expect(screen.getByText("theme-toggle")).toBeInTheDocument();
    expect(screen.getByText("locale-switcher")).toBeInTheDocument();
  });
});
