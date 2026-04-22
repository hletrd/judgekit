# RPF Cycle 28 — Review Remediation Plan

**Date:** 2026-04-22
**Source:** `.context/reviews/_aggregate.md`, `.context/reviews/{code-reviewer,perf-reviewer,security-reviewer,architect,critic,verifier,debugger,test-engineer,tracer,designer,document-specialist}.md`
**Status:** IN PROGRESS

## Scope

This cycle addresses findings from the fresh multi-agent review at commit 230b1ba3. The prior cycle 1 findings (AGG-1 through AGG-9 in the previous aggregate) have all been fixed. This plan addresses the NEW findings.

No review finding is silently dropped. All findings are either scheduled for implementation or explicitly recorded as deferred.

---

## Implementation Lanes

### H1: Fix `IoiCell` closure capture of `locale` — add explicit prop (AGG-1)

- **Source:** AGG-1 (5-agent signal: CR-1, ARCH-1, CRI-1, V-1, DOC-2)
- **Severity / confidence:** MEDIUM / HIGH
- **Citations:** `src/components/contest/leaderboard-table.tsx:171-204`
- **Problem:** `IoiCell` is a standalone function component that captures `locale` from the parent `LeaderboardTable` scope via JavaScript closure. It does not declare `locale` as a prop. If extracted to a separate file, locale would be undefined and `formatScore` would fall back to "en-US" silently.
- **Plan:**
  1. Add `locale: string | string[]` to `IoiCell`'s props interface
  2. Pass `locale` explicitly from `LeaderboardTable` where `IoiCell` is rendered
  3. Verify all gates pass
- **Status:** TODO

### H2: Fix `countdown-timer.tsx` NaN offset — add time sync validation (AGG-2)

- **Source:** AGG-2 (8-agent signal: CR-4, SEC-2, CRI-4, V-3, DBG-1, TR-1, DES-1, TE-1)
- **Severity / confidence:** MEDIUM / HIGH
- **Citations:** `src/components/exam/countdown-timer.tsx:77-82,91,108-110`
- **Problem:** The timer fetches `/api/v1/time` and uses `data.timestamp` directly without validation. If `data.timestamp` is not a finite number, `offsetRef.current` becomes `NaN`, causing `remaining` to be `NaN`. This shows "00:00:00" in red (appears expired) but `handleExpired()` is never called (since `NaN <= 0` is false). Student sees expired timer but exam session remains active.
- **Plan:**
  1. Add `Number.isFinite(data.timestamp)` validation in the `.then()` callback
  2. Only set `offsetRef.current` if validation passes; keep at 0 otherwise
  3. Add a comment documenting the failure mode
  4. Verify all gates pass
- **Status:** TODO

### H3: Fix stats endpoint "problems solved" comparison — align with leaderboard (AGG-3)

- **Source:** AGG-3 (6-agent signal: SEC-1, CRI-3, V-2, DBG-2, TR-2, DOC-3)
- **Severity / confidence:** MEDIUM / MEDIUM
- **Citations:** `src/app/api/v1/contests/[assignmentId]/stats/route.ts:121`
- **Problem:** Stats uses `ROUND(s.score, 2) >= COALESCE(ap.points, 100)` while leaderboard likely uses `score >= points` (unrounded). For fractional scores, this produces different "solved" counts.
- **Plan:**
  1. Change the comparison to `ROUND(s.score, 2) >= ROUND(COALESCE(ap.points, 100), 2)` to ensure both sides are rounded consistently
  2. Alternatively, check the leaderboard endpoint's comparison and match it
  3. Verify all gates pass
- **Status:** TODO

### M1: Migrate `submission-overview.tsx` to `useVisibilityPolling` (AGG-4 + AGG-5 + AGG-8)

- **Source:** AGG-4 (8-agent signal), AGG-5 (3-agent signal), AGG-8 (2-agent signal)
- **Severity / confidence:** MEDIUM / MEDIUM
- **Citations:** `src/components/lecture/submission-overview.tsx:109-135,103`
- **Problem:** This component reimplements visibility-aware polling with its own `visibilitychange` listener, lacks jitter (causes request bursts), shows toast on every polling error (no `initialLoadDoneRef`), and can fire `setStats` after unmount.
- **Plan:**
  1. Replace the custom polling logic (lines 109-135) with `useVisibilityPolling(() => { void fetchStats(); }, POLL_INTERVAL_MS)`
  2. Add `initialLoadDoneRef` pattern to `fetchStats` to suppress polling-error toasts
  3. Verify all gates pass
- **Status:** TODO

### M2: Add try/catch to `recruiting-invitations-panel.tsx` `handleResetAccountPassword` (AGG-7)

- **Source:** AGG-7 (3-agent signal: SEC-4, V-5, DBG-4)
- **Severity / confidence:** LOW / MEDIUM
- **Citations:** `src/components/contest/recruiting-invitations-panel.tsx:247-262`
- **Problem:** `handleResetAccountPassword` has no try/catch. If `apiFetch` throws a network exception, the promise rejects unhandled. The user sees no feedback.
- **Plan:**
  1. Wrap the function body in try/catch
  2. Add `toast.error(t("accountPasswordResetError"))` in the catch block
  3. Verify all gates pass
- **Status:** TODO

### M3: Fix `contest-clarifications.tsx` `handleCreate` — check `response.ok` before parsing JSON (AGG-10)

- **Source:** AGG-10 (1-agent signal: CR-6)
- **Severity / confidence:** LOW / MEDIUM
- **Citations:** `src/components/contest/contest-clarifications.tsx:107-109`
- **Problem:** `response.json()` is called before checking `!response.ok`. Inconsistent with the pattern used elsewhere in the same file.
- **Plan:**
  1. Restructure to check `!response.ok` first, then parse JSON
  2. Verify all gates pass
- **Status:** TODO

### L1: Add `formatNumber` to `recruiting-invitations-panel.tsx` stats grid (AGG-11)

- **Source:** AGG-11 (1-agent signal: DES-4)
- **Severity / confidence:** LOW / LOW
- **Citations:** `src/components/contest/recruiting-invitations-panel.tsx:340`
- **Problem:** Stats grid displays raw numbers without locale-aware formatting.
- **Plan:**
  1. Import `formatNumber` from `@/lib/formatting`
  2. Replace `{stats[key]}` with `{formatNumber(stats[key], locale)}`
  3. Verify all gates pass
- **Status:** TODO

### L2: Migrate `workers-client.tsx` to `useVisibilityPolling` (AGG-4 partial)

- **Source:** AGG-4 (8-agent signal)
- **Severity / confidence:** LOW / MEDIUM
- **Citations:** `src/app/(dashboard)/dashboard/admin/workers/workers-client.tsx:251-257`
- **Problem:** Workers admin panel polls every 10s with `setInterval` without visibility check. Background tabs generate unnecessary API calls.
- **Plan:**
  1. Replace `setInterval` with `useVisibilityPolling(() => { void fetchData(); }, 10_000)`
  2. Remove the manual interval management code
  3. Verify all gates pass
- **Status:** TODO

### L3: Consolidate stats endpoint queries into single CTE-based query (AGG-6)

- **Source:** AGG-6 (3-agent signal: PERF-1, ARCH-3, SEC-5)
- **Severity / confidence:** LOW / MEDIUM
- **Citations:** `src/app/api/v1/contests/[assignmentId]/stats/route.ts:79-123`
- **Problem:** The endpoint makes 3 separate DB queries that could be one. Minor TOCTOU risk between queries.
- **Plan:**
  1. Rewrite the 3 queries as a single query using CTEs
  2. Verify the output is identical for the same inputs
  3. Verify all gates pass
- **Status:** TODO

---

## Deferred Items

### DEFER-26: Migrate `contest-replay.tsx` to `useVisibilityPolling` (AGG-4 partial)

- **Source:** AGG-4 (8-agent signal)
- **Severity / confidence:** LOW / LOW
- **Original severity preserved:** LOW / LOW
- **Citations:** `src/components/contest/contest-replay.tsx:70`
- **Reason for deferral:** The replay component is short-lived and the polling impact is minimal. Lower priority than the other polling migrations.
- **Exit criterion:** When a cycle has capacity for a DRY refactor pass, or when the replay component is being modified for another reason.

### DEFER-27: Add unit tests for `countdown-timer.tsx` (AGG-9)

- **Source:** AGG-9 (1-agent signal: TE-1)
- **Severity / confidence:** MEDIUM / MEDIUM
- **Original severity preserved:** MEDIUM / MEDIUM
- **Citations:** `src/components/exam/countdown-timer.tsx`
- **Reason for deferral:** The NaN offset bug (AGG-2/H2) is being fixed with validation, which addresses the immediate risk. Writing comprehensive timer tests with fake timers is time-consuming and should be done in a dedicated test-writing cycle.
- **Exit criterion:** After H2 is stabilized and deployed. Pick up in a test-focused cycle.

### DEFER-28: Add unit tests for `IoiCell` rendering (TE-3)

- **Source:** TE-3 (1-agent signal)
- **Severity / confidence:** LOW / MEDIUM
- **Original severity preserved:** LOW / MEDIUM
- **Citations:** `src/components/contest/leaderboard-table.tsx:171-204`
- **Reason for deferral:** The closure capture fix (H1) addresses the immediate risk. Adding rendering tests is beneficial but not blocking.
- **Exit criterion:** When a cycle has capacity for UI component tests.

### DEFER-29: Add integration tests for stats endpoint "problems solved" query (TE-4)

- **Source:** TE-4 (1-agent signal)
- **Severity / confidence:** LOW / MEDIUM
- **Original severity preserved:** LOW / MEDIUM
- **Citations:** `src/app/api/v1/contests/[assignmentId]/stats/route.ts:115-123`
- **Reason for deferral:** The comparison logic fix (H3) addresses the immediate risk. Integration tests for fractional scores should be added in a test-focused cycle.
- **Exit criterion:** After H3 is stabilized. Pick up in a test-focused cycle.

### DEFER-30: `submission-overview.tsx` percentage display — use `formatNumber` instead of `Math.round` (AGG-12)

- **Source:** AGG-12 (1-agent signal: DES-3)
- **Severity / confidence:** LOW / LOW
- **Original severity preserved:** LOW / LOW
- **Citations:** `src/components/lecture/submission-overview.tsx:139`
- **Reason for deferral:** The percentage display works correctly. Using `formatNumber` is a consistency improvement with no functional impact. Will be addressed when M1 refactors the component.
- **Exit criterion:** When M1 is implemented, address this in the same pass.

### DEFER-31: `submission-detail-client.tsx` localStorage size limits (AGG-13)

- **Source:** AGG-13 (1-agent signal: CR-5)
- **Severity / confidence:** LOW / LOW
- **Original severity preserved:** LOW / LOW
- **Citations:** `src/app/(dashboard)/dashboard/submissions/[id]/submission-detail-client.tsx:94`
- **Reason for deferral:** The catch block handles quota exceeded. Adding a size check is a defensive improvement with no functional impact.
- **Exit criterion:** When localStorage issues are reported by users.

### DEFER-32: Documentation gaps for `countdown-timer.tsx`, `IoiCell`, stats endpoint, `useVisibilityPolling` (AGG-14)

- **Source:** AGG-14 (1-agent signal: DOC-1 through DOC-4)
- **Severity / confidence:** LOW / LOW
- **Original severity preserved:** LOW / LOW
- **Citations:** Multiple files
- **Reason for deferral:** Documentation improvements are non-blocking. The code fixes (H1, H2, H3) are higher priority.
- **Exit criterion:** When a cycle has capacity for a documentation pass.

---

## Previously Deferred Items (Carried Forward)

All previously deferred items from prior cycle plans remain in effect:
- DEFER-1 through DEFER-5 (from cycle 1 plan)
- DEFER-20 through DEFER-25 (from cycle 2 plan)
- D1, D2, A19 (from earlier cycles)
- DEFER-2 (prior): SSE connection tracking eviction optimization
- DEFER-3 (prior): SSE connection cleanup test coverage

---

## Progress Log

- 2026-04-22: Plan created from fresh multi-agent review at commit 230b1ba3. 14 aggregate findings. 9 scheduled for implementation (H1-H3, M1-M3, L1-L3). 7 deferred (DEFER-26 through DEFER-32). All prior cycle 1 findings verified as fixed.
