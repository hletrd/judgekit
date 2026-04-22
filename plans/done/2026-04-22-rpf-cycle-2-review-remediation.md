# RPF Cycle 2 — Review Remediation Plan

**Date:** 2026-04-22
**Source:** `.context/reviews/_aggregate.md`
**Status:** COMPLETED

## Task List

### TASK-1: Migrate `submission-overview.tsx` to `useVisibilityPolling` [AGG-1] — Priority: HIGH

**Files:** `src/components/lecture/submission-overview.tsx`
**Severity:** MEDIUM/HIGH (7-agent signal)

- [x] Remove the custom `visibilitychange` listener and `setInterval` polling logic (lines 115-146)
- [x] Import `useVisibilityPolling` from `@/hooks/use-visibility-polling`
- [x] Add `useVisibilityPolling(() => { void fetchStats(); }, POLL_INTERVAL_MS)` outside the dialog visibility check
- [x] Ensure polling only runs when `open` is true (wrap in conditional or add guard in callback)
- [x] Remove the now-unused `useEffect` for polling

**Note:** This also fixes AGG-8 (fetchStats fires after unmount) since `useVisibilityPolling` uses a ref-stable pattern.

---

### TASK-2: Fix `use-submission-polling.ts` NaN propagation — replace `typeof === "number"` with `Number.isFinite` [AGG-2] — Priority: HIGH

**Files:** `src/hooks/use-submission-polling.ts`
**Severity:** MEDIUM/HIGH (7-agent signal)

- [x] Line 55: Replace `typeof record.executionTimeMs === "number"` with `typeof record.executionTimeMs === "number" && Number.isFinite(record.executionTimeMs)`
- [x] Line 56: Replace `typeof record.memoryUsedKb === "number"` with `typeof record.memoryUsedKb === "number" && Number.isFinite(record.memoryUsedKb)`
- [x] Line 61: Replace `typeof testCase.sortOrder === "number"` with `typeof testCase.sortOrder === "number" && Number.isFinite(testCase.sortOrder)`
- [x] Line 87: Replace `typeof data.executionTimeMs === "number"` with `typeof data.executionTimeMs === "number" && Number.isFinite(data.executionTimeMs)`
- [x] Line 88: Replace `typeof data.memoryUsedKb === "number"` with `typeof data.memoryUsedKb === "number" && Number.isFinite(data.memoryUsedKb)`
- [x] Line 89: Replace `typeof data.score === "number"` with `typeof data.score === "number" && Number.isFinite(data.score)`
- [x] Line 90: Replace `typeof data.failedTestCaseIndex === "number"` with `typeof data.failedTestCaseIndex === "number" && Number.isFinite(data.failedTestCaseIndex)`

---

### TASK-3: Fix `contest-announcements.tsx` `handleSubmit` — check `response.ok` before parsing JSON [AGG-3] — Priority: MEDIUM

**Files:** `src/components/contest/contest-announcements.tsx`
**Severity:** LOW/MEDIUM (6-agent signal)

- [x] Move `const payload = await response.json()` after the `!response.ok` check
- [x] When `!response.ok`, throw a generic error without parsing the body
- [x] Parse JSON only when `response.ok` is true (for success case)

---

### TASK-4: Fix `active-timed-assignment-sidebar-panel.tsx` timer running with no active assignments [AGG-5] — Priority: LOW

**Files:** `src/components/layout/active-timed-assignment-sidebar-panel.tsx`
**Severity:** LOW/LOW (3-agent signal)

- [x] Change the effect dependency from `assignments.length` to a computed `hasActiveAssignments` boolean
- [x] Compute `hasActiveAssignments` based on whether any assignment deadline is in the future
- [x] Only start the `setInterval` when `hasActiveAssignments` is true

---

### TASK-5: Fix `submission-overview.tsx` acceptedPct display — use `formatNumber` [AGG-6] — Priority: LOW

**Files:** `src/components/lecture/submission-overview.tsx`
**Severity:** LOW/LOW (1-agent signal)

- [x] Import `formatNumber` from `@/lib/formatting`
- [x] Replace `{acceptedPct}%` on line 168 with `{formatNumber(acceptedPct, { locale, maximumFractionDigits: 0 })}%`
- [x] Add `useLocale` import if not already present

---

## Remaining Items from Cycle 1 Plan

The following tasks from the cycle 1 plan were not yet completed and should be addressed:

### TASK-4 (cycle 1): Replace inline Math.round with formatScore in remaining locations [AGG-4] — Priority: LOW

**Files:** `src/components/submission-status-badge.tsx`, `src/app/(public)/practice/problems/[id]/page.tsx`, `src/app/(public)/contests/[id]/page.tsx`
**Severity:** LOW/MEDIUM (7-agent signal in cycle 1 review)

- [ ] Replace `Math.round(score * 100) / 100` in `submission-status-badge.tsx:89` with `formatScore(score, locale)`
- [ ] Replace `Math.round(sub.score * 100) / 100` in `practice/problems/[id]/page.tsx:523` with `formatScore(sub.score, locale)`
- [ ] Replace `Math.round(entry.totalScore * 100) / 100` in `contests/[id]/page.tsx:229,266` with `formatScore(entry.totalScore, locale)`

### TASK-6 (cycle 1): Add jitter to useVisibilityPolling on visibility change — DONE in cycle 1

Already fixed (commit 53360a02).

### TASK-7 (cycle 1): Fix AntiCheatMonitor setInterval with async callback — DONE in cycle 1

Already fixed (commit afcd9b93).

### TASK-8 (cycle 1): Fix json-ld.tsx safeJsonForScript — handle `<!--` escape — DONE in cycle 1

Already fixed (commit 8654e5a2).

### TASK-9 (cycle 1): Split recruiting-invitations fetchData into separate functions — DONE in cycle 1

Already fixed (commit c3c4fd8e).

## Deferred Items

### DEFER-1: Add unit tests for useVisibilityPolling, use-submission-polling normalizeSubmission, and stats endpoint [AGG-4, AGG-9]

**Severity:** MEDIUM/MEDIUM (1-agent signal — test-engineer)
**Reason:** Test infrastructure is in place but writing meaningful async hook tests and API route tests is time-consuming. The behaviors being tested are covered by the code fixes in TASK-1, TASK-2, and the cycle 1 fixes. Will add tests in a future cycle.
**Exit criterion:** After TASK-1, TASK-2 are stabilized and deployed.

### DEFER-2: Standardize error handling pattern in useVisibilityPolling [ARCH-2 / CRI-3]

**Severity:** MEDIUM/MEDIUM (4-agent signal)
**Reason:** This is an architectural refactor that touches all polling components. The individual fixes (TASK-3 toast suppression) address the immediate symptoms. The full refactor should be done holistically.
**Exit criterion:** When adding a new polling component or after the next major UI iteration.

### DEFER-3: JWT authenticatedAt clock skew with DB tokenInvalidatedAt (D1 from prior cycles)

**Severity:** MEDIUM
**Reason:** Requires careful design of clock-skew tolerance. Security-sensitive change that needs review beyond this cycle.
**Exit criterion:** Dedicated security audit cycle.

### DEFER-4: JWT callback DB query on every request — add TTL cache (D2 from prior cycles)

**Severity:** MEDIUM
**Reason:** Requires cache invalidation strategy. Performance-sensitive change that needs load testing.
**Exit criterion:** Performance audit cycle.

### DEFER-5: Migrate raw route handlers to createApiHandler (22 routes)

**Severity:** MEDIUM
**Reason:** Large scope, low risk of current behavior. Each migration is mechanical but must be verified individually.
**Exit criterion:** Gradual migration with each cycle touching nearby routes.

### DEFER-6: Documentation gaps in use-submission-polling.ts and useVisibilityPolling [AGG-7]

**Severity:** LOW/LOW (1-agent signal — document-specialist)
**Reason:** Documentation updates have no functional impact. Will be addressed when the code is modified for TASK-2.
**Exit criterion:** After TASK-2 is implemented (documentation can be added in the same commit).

## Previously Deferred Items (Maintained)

- DEFER-2 (prior): SSE connection tracking eviction optimization
- DEFER-3 (prior): SSE connection cleanup test coverage
- A19 (prior): `new Date()` clock skew risk in remaining routes (LOW)
- DEFER-1 (cycle 1 plan): Add unit tests for useVisibilityPolling, SubmissionListAutoRefresh, and stats endpoint
- DEFER-2 (cycle 1 plan): Standardize error handling pattern in useVisibilityPolling
- DEFER-3 (cycle 1 plan): JWT authenticatedAt clock skew
- DEFER-4 (cycle 1 plan): JWT callback DB query TTL cache
- DEFER-5 (cycle 1 plan): Migrate raw route handlers to createApiHandler
- DEFER-20 (cycle 2 prior): Contest clarifications show raw userId instead of username
- DEFER-21 (cycle 2 prior): Duplicated visibility-aware polling pattern (now partially addressed by TASK-1)
- DEFER-22 (cycle 2 prior): copyToClipboard dynamic import inconsistency
- DEFER-23 (cycle 2 prior): Practice page Path B progress filter
- DEFER-24 (cycle 2 prior): Invitation URL uses window.location.origin
- DEFER-25 (cycle 2 prior): Duplicate formatTimestamp utility

## Progress log

- 2026-04-22: Plan created from cycle 2 aggregate review. 5 new tasks (TASK-1 through TASK-5). 1 carried forward from cycle 1 (TASK-4). 6 deferred items. All findings from the aggregate review are either scheduled for implementation or explicitly deferred.
