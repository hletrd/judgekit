import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AntiCheatMonitor } from "@/components/exam/anti-cheat-monitor";

const apiFetchMock = vi.fn();

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("sonner", () => ({
  toast: {
    warning: vi.fn(),
  },
}));

vi.mock("@/lib/api/client", () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

describe("AntiCheatMonitor", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    apiFetchMock.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends an immediate heartbeat and does not suppress a different event right after it", async () => {
    render(<AntiCheatMonitor assignmentId="assignment-1" enabled />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(apiFetchMock).toHaveBeenCalledWith(
      "/api/v1/contests/assignment-1/anti-cheat",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          eventType: "heartbeat",
          details: undefined,
        }),
      }),
    );

    await act(async () => {
      window.dispatchEvent(new Event("blur"));
      await Promise.resolve();
    });

    expect(apiFetchMock).toHaveBeenCalledWith(
      "/api/v1/contests/assignment-1/anti-cheat",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          eventType: "blur",
          details: undefined,
        }),
      }),
    );
  });
});
