import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { PublicHomePage } from "@/app/(public)/_components/public-home-page";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

describe("PublicHomePage", () => {
  it("renders the hero and surface cards", () => {
    render(
      <PublicHomePage
        eyebrow="Public-first phase"
        title="A new JudgeKit structure is underway."
        description="Description"
        sections={[
          { href: "/practice", title: "Practice", description: "Practice description", icon: "code" as const },
          { href: "/community", title: "Community", description: "Community description", icon: "message" as const },
        ]}
        primaryCta={{ href: "/workspace", label: "Open workspace" }}
        secondaryCta={{ href: "/login", label: "Sign in" }}
      />
    );

    expect(screen.getByText("Public-first phase")).toBeInTheDocument();
    expect(screen.getByText("A new JudgeKit structure is underway.")).toBeInTheDocument();
    expect(screen.getByText("Practice")).toBeInTheDocument();
    expect(screen.getByText("Community")).toBeInTheDocument();
    expect(screen.getByText("Open workspace")).toBeInTheDocument();
    expect(screen.getByText("Sign in")).toBeInTheDocument();
  });
});
