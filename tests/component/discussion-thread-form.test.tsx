import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DiscussionThreadForm } from "@/components/discussions/discussion-thread-form";

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

describe("DiscussionThreadForm", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    refreshMock.mockReset();
  });

  it("posts a new thread", async () => {
    apiFetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: "thread-1" } }),
    });

    render(
      <DiscussionThreadForm
        scopeType="general"
        titleLabel="Title"
        contentLabel="Content"
        submitLabel="Create"
        successLabel="Created"
        errorLabel="Error"
        signInLabel="Sign in"
        canPost
        signInHref="/login"
      />
    );

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Need help" } });
    fireEvent.change(screen.getByLabelText("Content"), { target: { value: "Question body" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith(
        "/api/v1/community/threads",
        expect.objectContaining({ method: "POST" })
      );
      expect(refreshMock).toHaveBeenCalled();
    });
  });
});
