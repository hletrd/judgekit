# Test Engineer Review — RPF Cycle 43

**Date:** 2026-04-23
**Reviewer:** test-engineer
**Base commit:** b0d843e7

## Inventory of Files Reviewed

- `src/app/api/v1/submissions/route.ts` — Submission creation + listing
- `src/app/api/v1/contests/[assignmentId]/anti-cheat/route.ts` — Anti-cheat
- `src/app/api/v1/community/votes/route.ts` — Vote toggle
- `src/app/api/v1/compiler/run/route.ts` — Compiler run
- `src/app/api/v1/playground/run/route.ts` — Playground run

## New Findings

### TE-1: Submission rate-limit clock source is not testable under clock-skew conditions — `Date.now()` is non-deterministic in tests [MEDIUM/MEDIUM]

**File:** `src/app/api/v1/submissions/route.ts:249`

**Description:** The rate-limit window uses `Date.now()` which makes it impossible to write deterministic tests that verify the rate-limit behavior under simulated clock skew. If the code used `getDbNowUncached()`, tests could mock the DB time function to verify both the nominal and clock-skew scenarios. This is the same testing gap that existed in the assignment PATCH route before its fix.

**Fix:** Use `getDbNowUncached()` so the time source is mockable in tests.

**Confidence:** Medium

---

### TE-2: Contest join route lacks explicit `auth: true` — testing requires knowledge of handler defaults [LOW/LOW]

**File:** `src/app/api/v1/contests/join/route.ts:9-11`

**Description:** The contest join route relies on the `createApiHandler` default of `auth: true` without explicitly specifying it. This makes test coverage less self-documenting — a test reviewer must know the factory defaults to confirm auth is checked.

**Fix:** Add `auth: true` explicitly for test clarity.

**Confidence:** Low
