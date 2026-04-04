import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AntiCheatDashboard } from "@/components/contest/anti-cheat-dashboard";
import { apiFetch } from "@/lib/api/client";

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => {
    if (namespace === "contests.antiCheat" && key === "signalsDisclaimer") {
      return "These signals are review aids, not proof of misconduct on their own.";
    }
    if (namespace === "contests.antiCheat" && key === "fetchError") return "Fetch error";
    if (namespace === "contests.antiCheat" && key === "retry") return "Retry";
    if (namespace === "contests.antiCheat" && key === "dashboard") return "Anti-Cheat Signals Dashboard";
    if (namespace === "contests.antiCheat" && key === "eventCount") return "{count} events";
    if (namespace === "contests.antiCheat" && key === "noEvents") return "No anti-cheat signals recorded.";
    if (namespace === "common" && key === "error") return "Error";
    return key;
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/lib/api/client", () => ({
  apiFetch: vi.fn(),
}));

const apiFetchMock = vi.mocked(apiFetch);

describe("AntiCheatDashboard", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("renders the signals disclaimer", async () => {
    apiFetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          events: [],
          total: 0,
        },
      }),
    } as Response);

    render(<AntiCheatDashboard assignmentId="assignment-1" />);

    expect(
      await screen.findByText(
        "These signals are review aids, not proof of misconduct on their own."
      )
    ).toBeInTheDocument();
  });
});
