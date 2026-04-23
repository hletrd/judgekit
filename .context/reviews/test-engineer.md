# Test Engineer Review — RPF Cycle 40

**Date:** 2026-04-23
**Reviewer:** test-engineer
**Base commit:** f030233a

## Inventory of Files Reviewed

- `tests/unit/` — Unit tests
- `tests/integration/` — Integration tests
- `tests/component/` — Component tests
- `src/app/api/v1/groups/[id]/assignments/[assignmentId]/route.ts` — Assignment PATCH (no test for active-contest clock-skew)
- `src/app/api/v1/contests/[assignmentId]/anti-cheat/route.ts` — Anti-cheat events (no gap detection test)

## Previously Fixed Items (Verified)

- TABLE_MAP/TABLE_ORDER consistency test: Fixed

## New Findings

### TE-1: No test for assignment PATCH active-contest clock-skew behavior [MEDIUM/MEDIUM]

**File:** `src/app/api/v1/groups/[id]/assignments/[assignmentId]/route.ts`

**Description:** The assignment PATCH route's active-contest check (line 99-101) uses `Date.now()` to determine if an exam has started. There is no test verifying the behavior when the app server clock differs from the DB server clock. Once the fix is applied (using `getDbNowUncached()`), a regression test should verify:
1. Problem changes are blocked when the contest has started (DB time >= startsAt)
2. Problem changes are allowed before the contest starts (DB time < startsAt)
3. The check uses DB server time, not app server time

**Fix:** Add API mock tests for the assignment PATCH route covering the active-contest check with DB time.

**Confidence:** Medium

---

### TE-2: No test for anti-cheat heartbeat gap detection edge cases [LOW/LOW]

**File:** `src/app/api/v1/contests/[assignmentId]/anti-cheat/route.ts`

**Description:** The heartbeat gap detection logic (lines 189-224) has no unit test coverage. Edge cases that should be tested:
1. No heartbeats (empty array)
2. Single heartbeat (no gaps possible)
3. Heartbeats with NULL createdAt values
4. Gap exactly at the threshold boundary

**Fix:** Add unit tests for the gap detection logic.

**Confidence:** Low
