import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DiscussionPostForm } from "@/components/discussions/discussion-post-form";

const { apiFetchMock, refreshMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
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

describe("DiscussionPostForm", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    refreshMock.mockReset();
  });

  it("posts a reply", async () => {
    apiFetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: "post-1" } }),
    });

    render(
      <DiscussionPostForm
        threadId="thread-1"
        contentLabel="Reply"
        submitLabel="Post"
        successLabel="Posted"
        errorLabel="Error"
        signInLabel="Sign in"
        canPost
        signInHref="/login"
      />
    );

    fireEvent.change(screen.getByLabelText("Reply"), { target: { value: "Thanks!" } });
    fireEvent.click(screen.getByRole("button", { name: "Post" }));

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith(
        "/api/v1/community/threads/thread-1/posts",
        expect.objectContaining({ method: "POST" })
      );
      expect(refreshMock).toHaveBeenCalled();
    });
  });
});
