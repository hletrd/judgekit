import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { PublicHomePage } from "@/app/(public)/_components/public-home-page";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

describe("PublicHomePage", () => {
  it("renders the hero, insight cards, and surface cards", () => {
    render(
      <PublicHomePage
        eyebrow="Public-first phase"
        title="A new JudgeKit structure is underway."
        description="Description"
        insights={[
          { label: "Public problems", value: "1,024", description: "Problem insight", icon: "problems" },
          { label: "Total submissions", value: "9,876", description: "Submission insight", icon: "submissions" },
          { label: "Supported languages", value: "120", description: "Language insight", icon: "languages" },
        ]}
        sections={[
          { href: "/practice", title: "Practice", description: "Practice description", icon: "code" as const },
          { href: "/community", title: "Community", description: "Community description", icon: "message" as const },
        ]}
        primaryCta={{ href: "/workspace", label: "Open workspace" }}
        secondaryCta={{ href: "/login", label: "Sign in" }}
        judgeInfo={{
          title: "Judge System",
          description: "Judge description",
          viewDetails: "View judge environments & compilation options",
          languagesHref: "/languages",
          stats: [
            { label: "Enabled languages", value: "120" },
            { label: "Workers online", value: "2" },
            { label: "Parallel slots", value: "8" },
          ],
        }}
      />
    );

    expect(screen.getByText("Public-first phase")).toBeInTheDocument();
    expect(screen.getByText("A new JudgeKit structure is underway.")).toBeInTheDocument();
    expect(screen.getByText("Public problems")).toBeInTheDocument();
    expect(screen.getByText("1,024")).toBeInTheDocument();
    expect(screen.getByText("Total submissions")).toBeInTheDocument();
    expect(screen.getByText("Supported languages")).toBeInTheDocument();
    expect(screen.getByText("Practice")).toBeInTheDocument();
    expect(screen.getByText("Community")).toBeInTheDocument();
    expect(screen.getByText("Open workspace")).toBeInTheDocument();
    expect(screen.getByText("Sign in")).toBeInTheDocument();
    expect(screen.getByText("Judge System")).toBeInTheDocument();
    expect(screen.getByText("Enabled languages")).toBeInTheDocument();
    expect(screen.getByText("Workers online")).toBeInTheDocument();
    expect(screen.getByText("View judge environments & compilation options")).toBeInTheDocument();
  });
});
