import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ControlNav } from "@/components/layout/control-nav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/control",
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

describe("ControlNav", () => {
  it("renders control-center navigation items", () => {
    render(
      <ControlNav
        siteTitle="JudgeKit"
        sectionLabel="Control"
        userLabel="Staff User · admin"
        items={[
          { href: "/control", label: "Control home", description: "Overview" },
          { href: "/dashboard/admin/users", label: "Users", description: "Manage people" },
        ]}
      />
    );

    expect(screen.getByText("JudgeKit")).toBeInTheDocument();
    expect(screen.getByText("Control")).toBeInTheDocument();
    expect(screen.getByText("Staff User · admin")).toBeInTheDocument();
    expect(screen.getByText("Control home")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
  });
});
