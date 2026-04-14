import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { WorkspaceNav } from "@/components/layout/workspace-nav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/workspace",
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

describe("WorkspaceNav", () => {
  it("renders workspace navigation items", () => {
    render(
      <WorkspaceNav
        siteTitle="JudgeKit"
        sectionLabel="Workspace"
        userLabel="Test User · student"
        items={[
          { href: "/workspace", label: "Workspace home", description: "Home" },
          { href: "/dashboard/problems", label: "Problems", description: "Browse problems" },
        ]}
      />
    );

    expect(screen.getByText("JudgeKit")).toBeInTheDocument();
    expect(screen.getByText("Workspace")).toBeInTheDocument();
    expect(screen.getByText("Test User · student")).toBeInTheDocument();
    expect(screen.getByText("Workspace home")).toBeInTheDocument();
    expect(screen.getByText("Problems")).toBeInTheDocument();
  });
});
