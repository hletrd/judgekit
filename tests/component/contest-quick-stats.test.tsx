import { act, render, screen } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { ContestQuickStats } from "@/components/contest/contest-quick-stats";

const apiFetchMock = vi.fn();

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/lib/api/client", () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

describe("ContestQuickStats", () => {
  let visibilityState: DocumentVisibilityState = "visible";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    visibilityState = "visible";
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => visibilityState,
    });
    apiFetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          problems: [{ points: 100 }],
          entries: [{ totalScore: 100, problems: [{ score: 100, solved: true }] }],
        },
      }),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("polls while the tab is visible", async () => {
    render(
      <ContestQuickStats
        assignmentId="assignment-1"
        problemCount={1}
        refreshInterval={20}
        initialStats={{
          participantCount: 1,
          submittedCount: 0,
          avgScore: 0,
          problemsSolvedCount: 0,
        }}
      />
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(apiFetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(25);
      await Promise.resolve();
    });

    expect(apiFetchMock).toHaveBeenCalledTimes(2);

    expect(screen.getByText("1/1")).toBeInTheDocument();
  });

  it("stops polling while hidden and resumes immediately when visible again", async () => {
    visibilityState = "hidden";

    render(
      <ContestQuickStats
        assignmentId="assignment-1"
        problemCount={1}
        refreshInterval={20}
        initialStats={{
          participantCount: 1,
          submittedCount: 0,
          avgScore: 0,
          problemsSolvedCount: 0,
        }}
      />
    );

    await act(async () => {
      vi.advanceTimersByTime(35);
      await Promise.resolve();
    });

    expect(apiFetchMock).not.toHaveBeenCalled();

    visibilityState = "visible";
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(apiFetchMock).toHaveBeenCalledTimes(1);

    visibilityState = "hidden";
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      vi.advanceTimersByTime(35);
      await Promise.resolve();
    });

    expect(apiFetchMock).toHaveBeenCalledTimes(1);
  });
});
