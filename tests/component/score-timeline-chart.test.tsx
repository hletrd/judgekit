import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ScoreTimelineChart } from "@/components/contest/score-timeline-chart";

// Mock the Select components to be test-friendly with a ref-based callback
const selectCallbackRef: { current: ((value: string) => void) | null } = { current: null };

vi.mock("@/components/ui/select", () => ({
  Select: ({ children, value, onValueChange }: { children: React.ReactNode; value: string; onValueChange: (v: string) => void }) => {
    selectCallbackRef.current = onValueChange;
    return (
      <div data-testid="select" data-value={value}>
        {children}
      </div>
    );
  },
  SelectTrigger: ({ children, id }: { children: React.ReactNode; id?: string }) => (
    <div data-testid="select-trigger" id={id}>{children}</div>
  ),
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode; label?: string }) => (
    <button
      data-testid="select-item"
      data-value={value}
      onClick={() => selectCallbackRef.current?.(value)}
    >
      {children}
    </button>
  ),
}));

describe("ScoreTimelineChart", () => {
  it("renders the chart with participant options and initial data", () => {
    render(
      <ScoreTimelineChart
        title="Score Progression"
        participantLabel="Participant"
        noDataLabel="No data"
        scoreLabel="Score"
        progressions={[
          {
            userId: "user-1",
            name: "Alice",
            points: [
              { timestamp: 1, totalScore: 10 },
              { timestamp: 2, totalScore: 30 },
            ],
          },
          {
            userId: "user-2",
            name: "Bob",
            points: [
              { timestamp: 1, totalScore: 5 },
              { timestamp: 3, totalScore: 50 },
            ],
          },
        ]}
      />
    );

    // The participant label and title are rendered
    expect(screen.getByText("Participant")).toBeInTheDocument();
    expect(screen.getByText("Score Progression")).toBeInTheDocument();

    // The select shows the first participant by default
    expect(screen.getByTestId("select")).toHaveAttribute("data-value", "user-1");

    // Both participants are available as select options
    const items = screen.getAllByTestId("select-item");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveAttribute("data-value", "user-1");
    expect(items[1]).toHaveAttribute("data-value", "user-2");
    expect(items[0]).toHaveTextContent("Alice");
    expect(items[1]).toHaveTextContent("Bob");

    // The initial chart renders the first participant's data (Alice: scores 10 and 30)
    expect(screen.getByLabelText("Score: 10")).toBeInTheDocument();
    expect(screen.getByLabelText("Score: 30")).toBeInTheDocument();

    // Bob's data should NOT be rendered initially
    expect(screen.queryByLabelText("Score: 5")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Score: 50")).not.toBeInTheDocument();
  });
});
