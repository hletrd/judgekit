# Performance Review — RPF Cycle 29

**Date:** 2026-04-23
**Reviewer:** perf-reviewer
**Base commit:** a51772ae

## Previously Fixed Items (Verified)

- Contest replay setInterval -> recursive setTimeout (commit 9cc30d51): Verified
- Sidebar interval re-entry: Deferred (LOW/LOW)

## PERF-1: `useVisibilityPolling` uses `setInterval` instead of recursive `setTimeout` [LOW/MEDIUM]

**File:** `src/hooks/use-visibility-polling.ts:55`

The shared polling hook uses `setInterval(tick, intervalMs)`. While this is the centralized implementation and works correctly for most use cases, `setInterval` can cause drift and catch-up behavior in background tabs. The codebase has already migrated `contest-replay.tsx`, `countdown-timer.tsx`, and `anti-cheat-monitor.tsx` to recursive `setTimeout`. The same pattern should be applied to this shared hook since it is used by 10+ components.

**Concrete failure scenario:** A user switches to another tab for 30 seconds while a polling component is active. When they return, `setInterval` may fire multiple catch-up ticks rapidly, causing a burst of API requests.

**Fix:** Replace `setInterval(tick, intervalMs)` with a recursive `setTimeout` pattern that schedules the next tick only after the current one completes. This also naturally handles the case where `tick()` is slow.

**Note:** This is a low-severity issue since the hook already pauses on visibility change. The jitter mechanism (line 49) partially mitigates thundering herd on tab switch. However, it only applies to the initial tick after visibility change, not to ongoing polling.

---

## PERF-2: `active-timed-assignment-sidebar-panel` uses `setInterval` with `assignments` dependency [LOW/LOW]

**File:** `src/components/layout/active-timed-assignment-sidebar-panel.tsx:53-91`

This component uses `setInterval` for its countdown timer with `[assignments]` as the effect dependency. While the cleanup function correctly clears the interval, this follows the same pattern as the already-fixed contest-replay issue. The `setInterval` can accumulate drift in background tabs.

However, the component already handles this correctly on line 80-84 by listening for `visibilitychange` and immediately updating `nowMs` when the tab becomes visible. This effectively corrects any drift on tab switch, making the issue lower severity than the contest-replay case was.

**Fix:** Could be migrated to recursive `setTimeout` for consistency, but the existing `visibilitychange` handler makes this a low priority.

---

## Performance Findings (carried/deferred)

### PERF-CARRIED-1: sidebar interval re-entry — LOW/LOW, deferred from cycle 26
### PERF-CARRIED-2: Unbounded analytics query — carried from DEFER-31
### PERF-CARRIED-3: Scoring full-table scan — carried from DEFER-31
