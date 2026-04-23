# Debugger Review — RPF Cycle 43

**Date:** 2026-04-23
**Reviewer:** debugger
**Base commit:** b0d843e7

## Inventory of Files Reviewed

- `src/app/api/v1/submissions/route.ts` — Submission creation transaction
- `src/app/api/v1/contests/[assignmentId]/anti-cheat/route.ts` — Anti-cheat event logging
- `src/app/api/v1/judge/poll/route.ts` — Judge result reporting
- `src/app/api/v1/judge/claim/route.ts` — Judge claim
- `src/lib/compiler/execute.ts` — Docker execution

## Previously Fixed Items (Verified)

- All prior fixes intact and working

## New Findings

### DBG-1: Submission rate-limit window uses `Date.now()` — potential inaccurate throttling under clock skew [MEDIUM/MEDIUM]

**File:** `src/app/api/v1/submissions/route.ts:249`

**Description:** The `oneMinuteAgo` variable at line 249 is computed using `Date.now()`, while the `submissions.submittedAt` column it compares against is populated using DB server time via `getDbNowUncached()`. This means the rate-limit boundary is computed from one clock and compared against data stored using a different clock.

**Failure mode:** Under clock skew (app server ahead of DB), users are rate-limited too aggressively. Under reverse skew, rate-limiting is too lenient. The advisory lock prevents concurrent bypass, but sequential submissions can exceed the per-minute limit.

**Fix:** Use `getDbNowUncached()` for the window boundary computation.

**Confidence:** Medium
