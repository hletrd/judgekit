import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { PublicProblemDetail } from "@/app/(public)/_components/public-problem-detail";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("@/components/problem-description", () => ({
  ProblemDescription: ({ description }: { description: string | null }) => <div>{description}</div>,
}));

describe("PublicProblemDetail", () => {
  it("renders problem metadata and action links", () => {
    render(
      <PublicProblemDetail
        title="A + B"
        description="Add two integers."
        authorLabel="Author: JudgeKit"
        tags={[{ name: "math", color: null }]}
        timeLimitMs={2000}
        memoryLimitMb={256}
        timeLimitLabel="Time limit: 2000ms"
        memoryLimitLabel="Memory limit: 256MB"
        playgroundHref="/playground"
        playgroundLabel="Try in playground"
        signInHref="/login"
        signInLabel="Sign in to submit"
      />
    );

    expect(screen.getByText("A + B")).toBeInTheDocument();
    expect(screen.getByText("Author: JudgeKit")).toBeInTheDocument();
    expect(screen.getByText("Time limit: 2000ms")).toBeInTheDocument();
    expect(screen.getByText("Memory limit: 256MB")).toBeInTheDocument();
    expect(screen.getByText("Try in playground")).toBeInTheDocument();
    expect(screen.getByText("Sign in to submit")).toBeInTheDocument();
  });
});
