# Performance Review — RPF Cycle 31

**Date:** 2026-04-23
**Reviewer:** perf-reviewer
**Base commit:** 198e6a63

## Findings

### PERF-1: ActiveTimedAssignmentSidebarPanel `setInterval` causes unnecessary re-renders after all deadlines pass [MEDIUM/MEDIUM]

**File:** `src/components/layout/active-timed-assignment-sidebar-panel.tsx:63`

**Description:** The sidebar panel uses `setInterval` (line 63) with a self-stopping mechanism that clears the interval when all assignments have expired (line 72-74). However, the interval check `assignments.every(...)` runs on every 1-second tick, iterating the full assignments array each time. More critically, this is the last remaining client-side `setInterval` — the codebase has established recursive `setTimeout` as the standard for all timer-based effects.

**Fix:** Migrate to recursive `setTimeout` pattern, consistent with countdown-timer.tsx, useVisibilityPolling, and contest-replay.

---

### PERF-2: Edit-group-dialog triple `find()` in SelectValue [LOW/LOW]

**File:** `src/app/(dashboard)/dashboard/groups/edit-group-dialog.tsx:141-143`

**Description:** Three sequential `Array.find()` calls on the same array with the same predicate in a render expression. Minor but unnecessary O(3n) instead of O(n).

**Fix:** Extract the found instructor to a variable.
