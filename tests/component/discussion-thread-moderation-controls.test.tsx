import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DiscussionThreadModerationControls } from "@/components/discussions/discussion-thread-moderation-controls";

const { apiFetchMock, pushMock, refreshMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/api/client", () => ({
  apiFetch: apiFetchMock,
}));

describe("DiscussionThreadModerationControls", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    pushMock.mockReset();
    refreshMock.mockReset();
  });

  it("pins a thread", async () => {
    apiFetchMock.mockResolvedValue({ ok: true, json: async () => ({ data: {} }) });

    render(
      <DiscussionThreadModerationControls
        threadId="thread-1"
        isLocked={false}
        isPinned={false}
        lockLabel="Lock"
        unlockLabel="Unlock"
        pinLabel="Pin"
        unpinLabel="Unpin"
        deleteLabel="Delete"
        deleteConfirmTitle="Confirm Delete"
        deleteConfirmDescription="Are you sure?"
        cancelLabel="Cancel"
        successLabel="Updated"
        deleteSuccessLabel="Deleted"
        errorLabel="Error"
        deleteErrorLabel="Delete Error"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Pin" }));

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith(
        "/api/v1/community/threads/thread-1",
        expect.objectContaining({ method: "PATCH" })
      );
      expect(refreshMock).toHaveBeenCalled();
    });
  });
});
