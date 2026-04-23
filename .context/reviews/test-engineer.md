# Test Engineer Review — RPF Cycle 37

**Date:** 2026-04-23
**Reviewer:** test-engineer
**Base commit:** 3d729cee

## Inventory of Files Reviewed

- `tests/unit/` — Unit tests
- `tests/integration/` — Integration tests
- `tests/component/` — Component tests
- `src/lib/db/import.ts` — Import engine (verified TABLE_MAP/TABLE_ORDER test)
- `src/app/api/v1/contests/quick-create/route.ts` — Quick-create (test coverage gap)
- `src/app/api/v1/submissions/[id]/events/route.ts` — SSE route (test coverage gap)

## Previously Fixed Items (Verified)

- TE-1 (TABLE_MAP/TABLE_ORDER consistency test): Fixed in commit d7576aa7

## New Findings

### TE-1: No test for quick-create route NaN Date guard behavior [MEDIUM/MEDIUM]

**File:** `src/app/api/v1/contests/quick-create/route.ts` (no corresponding test file found)

**Description:** The quick-create route constructs Dates from client-provided strings without a NaN guard (same as CR-1, SEC-1, DBG-1). There is no unit or API test for this route that validates behavior with invalid date strings. Once the NaN guard is added, a regression test should cover:
1. Invalid `startsAt` string produces 400 error
2. Invalid `deadline` string produces 400 error
3. Valid dates pass through correctly

**Fix:** Add API mock tests for the quick-create route covering date validation edge cases.

**Confidence:** Medium

---

### TE-2: No test for SSE shared poll timer behavior [LOW/LOW]

**File:** `src/app/api/v1/submissions/[id]/events/route.ts`

**Description:** The shared poll timer (lines 128-203) has no unit test coverage. While the SSE route is difficult to unit test due to streaming, the poll timer logic (subscribe/unsubscribe/tick) could be tested in isolation. This is a carry-over from prior cycles.

**Confidence:** Low
