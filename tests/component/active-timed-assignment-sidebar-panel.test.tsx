import { act, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ActiveTimedAssignmentSidebarPanel } from "@/components/layout/active-timed-assignment-sidebar-panel";
import type { ActiveTimedAssignmentSummary } from "@/lib/assignments/active-timed-assignments";

const { pathnameRef, searchAssignmentIdRef } = vi.hoisted(() => ({
  pathnameRef: { current: "/dashboard/contests/contest-current" },
  searchAssignmentIdRef: { current: null as string | null },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameRef.current,
  useSearchParams: () => ({
    get: (key: string) => (key === "assignmentId" ? searchAssignmentIdRef.current : null),
  }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("lucide-react", () => ({
  Timer: ({ className }: { className?: string }) => <svg data-testid="timer-icon" className={className} aria-hidden="true" />,
}));

function createAssignment(overrides: Partial<ActiveTimedAssignmentSummary> = {}): ActiveTimedAssignmentSummary {
  return {
    assignmentId: overrides.assignmentId ?? "contest-current",
    title: overrides.title ?? "Current contest",
    groupName: overrides.groupName ?? "Group A",
    href: overrides.href ?? "/dashboard/contests/contest-current",
    mode: overrides.mode ?? "scheduled",
    startedAt: overrides.startedAt ?? "2026-04-15T05:00:00.000Z",
    deadline: overrides.deadline ?? "2026-04-15T06:00:00.000Z",
  };
}

describe("ActiveTimedAssignmentSidebarPanel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-15T05:10:00.000Z"));
    pathnameRef.current = "/dashboard/contests/contest-current";
    searchAssignmentIdRef.current = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the current active assignment with remaining, elapsed, and progress", () => {
    render(
      <ActiveTimedAssignmentSidebarPanel
        assignments={[
          createAssignment(),
          createAssignment({
            assignmentId: "contest-later",
            title: "Later contest",
            href: "/dashboard/contests/contest-later",
            deadline: "2026-04-15T06:30:00.000Z",
          }),
        ]}
      />
    );

    expect(screen.getByTestId("active-timed-assignment-title")).toHaveTextContent("Current contest");
    expect(screen.getByTestId("active-timed-assignment-remaining")).toHaveTextContent("00:50:00");
    expect(screen.getByTestId("active-timed-assignment-elapsed")).toHaveTextContent("00:10:00");
    expect(screen.getByTestId("active-timed-assignment-progress-label")).toHaveTextContent("16.7%");
  });

  it("updates the timer every second and hides itself after expiry", () => {
    render(
      <ActiveTimedAssignmentSidebarPanel
        assignments={[createAssignment({ deadline: "2026-04-15T05:11:00.000Z" })]}
      />
    );

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(screen.getByTestId("active-timed-assignment-remaining")).toHaveTextContent("00:00:30");

    act(() => {
      vi.advanceTimersByTime(31_000);
    });

    expect(screen.queryByTestId("active-timed-assignment-panel")).not.toBeInTheDocument();
  });

  it("uses the assignmentId query parameter on problem pages when present", () => {
    pathnameRef.current = "/dashboard/problems/problem-1";
    searchAssignmentIdRef.current = "contest-query";

    render(
      <ActiveTimedAssignmentSidebarPanel
        assignments={[
          createAssignment({ assignmentId: "contest-query", title: "Query contest", href: "/dashboard/contests/contest-query" }),
          createAssignment({ assignmentId: "contest-other", title: "Other contest", href: "/dashboard/contests/contest-other" }),
        ]}
      />
    );

    expect(screen.getByTestId("active-timed-assignment-title")).toHaveTextContent("Query contest");
  });
});
