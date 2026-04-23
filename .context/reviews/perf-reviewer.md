# Performance Review — RPF Cycle 23

**Date:** 2026-04-22
**Reviewer:** perf-reviewer
**Base commit:** 429d1b86

## PERF-1: Local `normalizePage` without MAX_PAGE allows unbounded DB OFFSET [MEDIUM/HIGH]

**Files:**
- `src/app/(dashboard)/dashboard/problems/page.tsx:51`
- `src/app/(dashboard)/dashboard/admin/audit-logs/page.tsx:50`
- `src/app/(dashboard)/dashboard/admin/login-logs/page.tsx:47`
- `src/app/(dashboard)/dashboard/admin/users/page.tsx:41`
- `src/app/(dashboard)/dashboard/admin/files/page.tsx:26`

**Confidence:** HIGH

Same as SEC-1. Large OFFSET values cause PostgreSQL to scan and discard all preceding rows, making queries O(n) instead of O(page_size). The shared `normalizePage` caps at 10000 but these local copies don't. For audit logs and submissions tables with millions of rows, this can cause 10+ second query times.

**Fix:** Replace with shared `normalizePage` from `@/lib/pagination`.

---

## PERF-2: `submission-overview.tsx` polls even when dialog is closed [MEDIUM/MEDIUM]

**File:** `src/components/lecture/submission-overview.tsx:123`

**Confidence:** MEDIUM

The component uses `useVisibilityPolling(() => { void fetchStats(); }, POLL_INTERVAL_MS, !open)`. The third parameter pauses polling when `!open` is true. However, `fetchStats` guards with `if (!openRef.current) return;` which means the callback fires but returns immediately, wasting a callback invocation every 5 seconds when the dialog is closed.

This is a minor performance issue -- the wasted callback is cheap (just a ref check), but it's unnecessary work.

**Fix:** Conditionally mount the `SubmissionOverview` component only when `open` is true, or pass a `paused` flag that prevents the interval from firing at all.

---

## PERF-3: `recruiting-invitations-panel.tsx` fetches stats and invitations in parallel on every data change [LOW/LOW]

**File:** `src/components/contest/recruiting-invitations-panel.tsx:166-168`

**Confidence:** LOW

`fetchData` calls `Promise.all([fetchInvitations(), fetchStats()])` on mount and after every mutation (create, revoke, delete). The stats endpoint hits a different route than the invitations list. After mutations, only the invitations need to be refreshed (the stats are derived from the same data). This causes 2 API calls per mutation instead of 1.

**Fix:** After create/revoke/delete mutations, only refetch the list and derive stats client-side, or merge stats into the invitations response.

---

## Performance Findings (carried)

### PERF-4: `recruiter-candidates-panel.tsx` full export fetch — carried as DEFER-29
### PERF-5: Practice page Path B progress filter — carried from cycles 18-22
