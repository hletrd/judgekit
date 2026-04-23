# UI/UX Review — RPF Cycle 31

**Date:** 2026-04-23
**Reviewer:** designer
**Base commit:** 198e6a63

## Findings

### DES-1: ActiveTimedAssignmentSidebarPanel `setInterval` causes visual glitch on tab switch [MEDIUM/MEDIUM]

**File:** `src/components/layout/active-timed-assignment-sidebar-panel.tsx:63`

**Description:** When a user switches back to a tab showing the active assignment panel, the throttled `setInterval` can fire multiple callbacks in rapid succession. Each callback triggers `setNowMs(Date.now())` causing a re-render. The `visibilitychange` handler also fires. This creates a brief visual flicker as the "remaining time" and "progress" values update multiple times in rapid succession.

This is particularly noticeable on the progress bar (line 172-179) which has a CSS transition (`transition-[width] duration-1000 ease-linear`). Multiple rapid state updates can cause the progress bar to "stutter" as it tries to animate to intermediate positions.

**Fix:** Migrate to recursive `setTimeout` to prevent catch-up behavior. The `visibilitychange` handler already provides the correct immediate update.

---

### DES-2: Edit-group-dialog SelectValue triple-find causes unnecessary render work [LOW/LOW]

**File:** `src/app/(dashboard)/dashboard/groups/edit-group-dialog.tsx:141-143`

**Description:** The `SelectValue` render does three `Array.find()` calls on the same array with the same predicate. Minor unnecessary render computation.

**Fix:** Extract found instructor to a variable.
