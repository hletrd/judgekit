import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { MyDiscussionsList } from "@/components/discussions/my-discussions-list";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

describe("MyDiscussionsList", () => {
  it("renders authored and participated badges", () => {
    render(
      <MyDiscussionsList
        title="My discussions"
        description="Track threads"
        emptyLabel="Empty"
        openLabel="Open thread"
        items={[
          {
            id: "thread-1",
            title: "Need help",
            authorName: "User",
            replyCountLabel: "2 replies",
            authoredBadge: "Started by you",
            participatedBadge: "You replied here",
          },
        ]}
      />
    );

    expect(screen.getByText("My discussions")).toBeInTheDocument();
    expect(screen.getByText("Started by you")).toBeInTheDocument();
    expect(screen.getByText("You replied here")).toBeInTheDocument();
    expect(screen.getByText("Open thread")).toBeInTheDocument();
  });
});
