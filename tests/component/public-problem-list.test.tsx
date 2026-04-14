import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { PublicProblemList } from "@/app/(public)/_components/public-problem-list";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

describe("PublicProblemList", () => {
  it("renders public problem cards", () => {
    render(
      <PublicProblemList
        title="Public problem catalog"
        description="Browse public problems"
        noProblemsLabel="No public problems"
        openProblemLabel="Open problem"
        problems={[
          {
            id: "problem-1",
            title: "A + B",
            summary: "Add two integers.",
            authorName: "Author One",
            tags: [{ name: "math", color: null }],
          },
        ]}
      />
    );

    expect(screen.getByText("Public problem catalog")).toBeInTheDocument();
    expect(screen.getByText("A + B")).toBeInTheDocument();
    expect(screen.getByText("Author One")).toBeInTheDocument();
    expect(screen.getByText("math")).toBeInTheDocument();
    expect(screen.getByText("Open problem")).toBeInTheDocument();
  });
});
