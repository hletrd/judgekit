# Verifier Review — RPF Cycle 43

**Date:** 2026-04-23
**Reviewer:** verifier
**Base commit:** b0d843e7

## Evidence-Based Correctness Check

This review validates that the stated behavior of each recently-fixed item matches the actual code.

## Verified Fixes (All Pass)

1. **problemPoints/refine validation** — Lines 21-24: `.refine()` checks `problemPoints.length === problemIds.length`. PASS.
2. **Access-code capability auth** — Lines 9, 23, 37: `auth: { capabilities: ["contests.manage_access_codes"] }` on all 3 handlers. PASS.
3. **Redundant non-null assertion removed** — Line 237: `const userId = invitation.userId;` captured after guard. PASS.
4. **Date.now() replaced in assignment PATCH** — Line 103: `const now = await getDbNowUncached();`. PASS.
5. **Non-null assertions removed from anti-cheat** — Lines 211-213: Null guard with `continue`, no `!` assertions. PASS.

## New Findings

### V-1: Submission `oneMinuteAgo` computed from app clock while `submittedAt` uses DB clock — rate-limit may be inaccurate under clock skew [MEDIUM/MEDIUM]

**File:** `src/app/api/v1/submissions/route.ts:249,318`

**Description:** The rate-limit check at line 249 uses `Date.now()` to compute the 60-second window, while the submission's `submittedAt` at line 318 is set via `getDbNowUncached()`. Under clock skew, the rate limit may over- or under-count recent submissions.

Evidence: The code at line 249 computes `oneMinuteAgo = new Date(Date.now() - 60_000)` and uses it in `SUM(CASE WHEN submittedAt > ${oneMinuteAgo})` at line 257. The `submittedAt` is set with `await getDbNowUncached()` at line 318. When app server and DB server clocks diverge, the comparison is against two different time references.

**Concrete failure scenario:** App server clock is 15 seconds behind DB. A submission stored at DB time 10:01:00 will be compared against a window computed from 09:59:45 (app time minus 60s). The effective rate-limit window is 75 seconds instead of 60, allowing more submissions than intended.

**Fix:** Compute `oneMinuteAgo` from DB time:
```typescript
const dbNow = await getDbNowUncached();
const oneMinuteAgo = new Date(dbNow.getTime() - 60_000);
```
Also use `dbNow` for the `submittedAt` insert at line 318 (which already uses `getDbNowUncached()` but could reuse the same cached value to avoid a second round-trip).

**Confidence:** Medium
