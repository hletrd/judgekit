import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { DiscussionModerationList } from "@/components/discussions/discussion-moderation-list";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("@/components/discussions/discussion-thread-moderation-controls", () => ({
  DiscussionThreadModerationControls: () => <div>moderation-controls</div>,
}));

describe("DiscussionModerationList", () => {
  it("renders moderation items and controls", () => {
    render(
      <DiscussionModerationList
        title="Discussion moderation"
        description="Review threads"
        emptyLabel="No threads"
        items={[
          {
            id: "thread-1",
            title: "Need help",
            authorName: "User",
            scopeLabel: "General",
            statusLabels: ["Pinned"],
            metadataLabel: "2 replies",
            openHref: "/community/threads/thread-1",
            openLabel: "Open thread",
            moderation: {
              isLocked: false,
              isPinned: true,
              lockLabel: "Lock",
              unlockLabel: "Unlock",
              pinLabel: "Pin",
              unpinLabel: "Unpin",
              deleteLabel: "Delete",
              deleteConfirmTitle: "Confirm Delete",
              deleteConfirmDescription: "Are you sure?",
              cancelLabel: "Cancel",
              successLabel: "Updated",
              deleteSuccessLabel: "Deleted",
              errorLabel: "Error",
              deleteErrorLabel: "Delete Error",
            },
          },
        ]}
      />
    );

    expect(screen.getByText("Discussion moderation")).toBeInTheDocument();
    expect(screen.getByText("Need help")).toBeInTheDocument();
    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByText("Pinned")).toBeInTheDocument();
    expect(screen.getByText("moderation-controls")).toBeInTheDocument();
  });
});
