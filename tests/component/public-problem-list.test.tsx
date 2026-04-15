import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { PublicProblemList } from "@/app/(public)/_components/public-problem-list";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

describe("PublicProblemList", () => {
  it("renders public problem rows in a list/table layout", () => {
    render(
      <PublicProblemList
        title="Public problem catalog"
        description="Browse public problems"
        noProblemsLabel="No public problems"
        openProblemLabel="Open problem"
        numberLabel="#"
        problemTitleLabel="Title"
        authorLabel="Author"
        timeLimitLabel="Time limit"
        difficultyLabel="Difficulty"
        tagLabel="Tags"
        problems={[
          {
            id: "problem-1",
            sequenceNumber: 1000,
            title: "A + B",
            summary: "Add two integers.",
            authorName: "Author One",
            timeLimitLabel: "Time Limit: 2000 ms",
            difficultyLabel: "Difficulty: 1.00 / 10",
            tags: [{ name: "math", color: null }],
          },
        ]}
      />
    );

    expect(screen.getByText("Public problem catalog")).toBeInTheDocument();
    expect(screen.getByText("A + B")).toBeInTheDocument();
    expect(screen.getByText("Author One")).toBeInTheDocument();
    expect(screen.getByText("1000")).toBeInTheDocument();
    expect(screen.getByText("Time Limit: 2000 ms")).toBeInTheDocument();
    expect(screen.getByText("Difficulty: 1.00 / 10")).toBeInTheDocument();
    expect(screen.getByText("math")).toBeInTheDocument();
    expect(screen.getAllByText("Open problem").length).toBeGreaterThan(0);
  });
});
