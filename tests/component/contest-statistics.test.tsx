import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ContestStatistics } from "@/components/contest/contest-statistics";

describe("ContestStatistics", () => {
  it("renders score distribution and solve-rate summaries", () => {
    render(
      <ContestStatistics
        title="Contest Statistics"
        scoreDistributionTitle="Score Distribution"
        solveRatesTitle="Solve Rates"
        noDataLabel="No data"
        studentsLabel="students"
        countLabel="Count"
        percentageLabel="Breakdown"
        solvedLabel="Solved"
        partialLabel="Partial"
        zeroLabel="Zero"
        scoreDistribution={[
          { label: "0-10%", count: 3 },
          { label: "10-20%", count: 5 },
        ]}
        problemSolveRates={[
          {
            problemId: "problem-1",
            title: "A + B",
            total: 20,
            solvedPercent: 70,
            partialPercent: 20,
            zeroPercent: 10,
          },
        ]}
      />
    );

    expect(screen.getByText("Contest Statistics")).toBeInTheDocument();
    expect(screen.getByText("0-10%")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("A + B")).toBeInTheDocument();
    expect(screen.getByText("Solved: 70% / Partial: 20% / Zero: 10%")).toBeInTheDocument();
  });
});
