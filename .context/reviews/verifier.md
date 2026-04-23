# Verifier Review — RPF Cycle 40

**Date:** 2026-04-23
**Reviewer:** verifier
**Base commit:** f030233a

## Evidence-Based Correctness Check

This review validates that the stated behavior of each recently-fixed item matches the actual code.

### Verified Fixes (All Pass)

1. **Quick-create NaN guard** — Lines 36-44: `Number.isFinite()` checks on both `startsAt` and `deadline`. PASS.
2. **Bulk invitation MAX_EXPIRY_MS guard** — Lines 67-69: `(expiresAt.getTime() - dbNow.getTime()) > MAX_EXPIRY_MS` check after `computeExpiryFromDays`. PASS.
3. **Un-revoke transition removed** — Lines 96-102: The `allowed` map for `"revoked"` status is empty (no transitions out of revoked). PASS.
4. **Exam session short-circuit** — Line 29: `if (assignment.examMode === "none") return apiError("examModeInvalid", 400)` before any enrollment check. PASS.
5. **API key auto-dismiss countdown** — Lines 115-137: 5-minute timer with `setKeyDismissCountdown` state and visible countdown text. PASS.
6. **MAX_EXPIRY_MS shared constant** — `src/lib/assignments/recruiting-constants.ts` imported in all 3 invitation routes. PASS.
7. **ESCAPE clause on LIKE queries** — `src/lib/realtime/realtime-coordination.ts` lines 94, 107: `ESCAPE '\\'` added. PASS.
8. **Chat widget button aria-label with message count** — Verified. PASS.

## New Findings

### V-1: Assignment PATCH uses `Date.now()` instead of DB time for active-contest check — clock-skew inconsistency [MEDIUM/MEDIUM]

**File:** `src/app/api/v1/groups/[id]/assignments/[assignmentId]/route.ts:99-101`

**Description:** Tracing the active-contest check:
1. Line 99: `const now = Date.now();` — uses app server time
2. Line 100: `const startsAt = assignment.startsAt ? new Date(assignment.startsAt).getTime() : null;` — compares DB time against app time
3. Line 101: `if (startsAt && now >= startsAt)` — if clocks differ, the check is wrong

Compare with the submission route at line 299 which uses `sql`${examSessions.personalDeadline} < NOW()`` to enforce deadlines in SQL (DB time). The recruiting invitation routes use `getDbNowUncached()`. This is the only remaining schedule check that uses app server time.

**Verification:** The fix should use `getDbNowUncached()` which returns a Date object from `SELECT NOW()::timestamptz AS now`, ensuring both sides of the comparison use DB time.

**Confidence:** Medium
