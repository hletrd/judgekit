# Cycle 7 Review Remediation Plan

**Date:** 2026-04-20
**Source:** `.context/reviews/cycle-7-aggregate.md`

---

## Scope

This cycle addresses the new cycle-7 findings from the multi-agent review:
- AGG-1: `tokenInvalidatedAt` clock-skew undermines session revocation guarantee
- AGG-2: Public contest pages use `new Date()` instead of DB time for contest status
- AGG-3: Sidebar active-timed-assignments uses `new Date()` for contest status
- AGG-4: Anti-cheat event `createdAt` uses `new Date()` instead of DB time
- AGG-5: Invite route stores `redeemedAt` and `enrolledAt` using `new Date()`
- AGG-6: Rejudge route uses `new Date()` for contest-finished check in audit log
- AGG-7: No test coverage for `tokenInvalidatedAt` clock-skew behavior or public contest DB-time usage
- AGG-8: Non-null assertions on Map.get() results can throw at runtime
- AGG-9: SSE connection tracking eviction uses O(n) linear scan
- AGG-10: Problem import button silently swallows JSON parse errors

No cycle-7 review finding is silently dropped. No new refactor-only work is added under deferred.

---

## Implementation lanes

### H1: Fix `tokenInvalidatedAt` clock-skew — use `getDbNowUncached()` for session revocation timestamps (AGG-1)

- **Source:** AGG-1
- **Severity / confidence:** HIGH / HIGH
- **Citations:**
  - `src/app/api/v1/users/[id]/route.ts:164,185,218,260,466`
  - `src/lib/actions/user-management.ts:114,308`
  - `src/lib/actions/change-password.ts:75`
  - `src/lib/assignments/recruiting-invitations.ts:242,359`
- **Problem:** `tokenInvalidatedAt` is set via `new Date()` in 10 locations. The session revocation mechanism compares this against the JWT's `authenticatedAtSeconds` (set via `Date.now()` at login). Clock drift between these two moments can cause `isTokenInvalidated()` to return `false` for a revoked session.
- **Plan:**
  1. Import `getDbNowUncached` from `@/lib/db-time` in all affected files.
  2. Replace all `tokenInvalidatedAt: new Date()` with `tokenInvalidatedAt: await getDbNowUncached()`.
  3. For `src/app/api/v1/users/[id]/route.ts`: The handler already uses `createApiHandler` which makes the handler async. Replace each `updates.tokenInvalidatedAt = new Date()` with `updates.tokenInvalidatedAt = await getDbNowUncached()`.
  4. For `src/lib/actions/user-management.ts`: The server actions are already async. Replace each `updates.tokenInvalidatedAt = new Date()` with `updates.tokenInvalidatedAt = await getDbNowUncached()`.
  5. For `src/lib/actions/change-password.ts`: Already async. Replace `tokenInvalidatedAt: new Date()` with `tokenInvalidatedAt: await getDbNowUncached()`.
  6. For `src/lib/assignments/recruiting-invitations.ts`: The function is already async. Replace each `tokenInvalidatedAt: new Date()` with `tokenInvalidatedAt: await getDbNowUncached()`.
  7. Verify tsc --noEmit passes.
  8. Verify existing tests pass.
- **Status:** DONE

### H2: Fix public contest pages clock-skew — use `getDbNow()` for contest status (AGG-2)

- **Source:** AGG-2
- **Severity / confidence:** HIGH / HIGH
- **Citations:** `src/lib/assignments/public-contests.ts:30,124`
- **Problem:** Both `getPublicContests()` and `getPublicContestById()` pass `new Date()` to `getContestStatus()`. If the app server clock drifts, a closed contest shows as "open".
- **Plan:**
  1. Import `getDbNow` from `@/lib/db-time`.
  2. In `getPublicContests()`, replace `const now = new Date()` (line 30) with `const now = await getDbNow()`.
  3. In `getPublicContestById()`, replace `new Date()` (line 124) with `const now = await getDbNow()` and pass `now` to `getContestStatus()`.
  4. Both functions are already async server-side functions, so `await` is compatible.
  5. Verify tsc --noEmit passes.
- **Status:** DONE active-timed-assignments clock-skew — use `getDbNow()` for contest status (AGG-3)

- **Source:** AGG-3
- **Severity / confidence:** MEDIUM / HIGH
- **Citations:** `src/lib/assignments/active-timed-assignments.ts:15,44`
- **Problem:** `selectActiveTimedAssignments` defaults to `new Date()` and `getActiveTimedAssignmentsForSidebar` also defaults to `new Date()`.
- **Plan:**
  1. Import `getDbNow` from `@/lib/db-time`.
  2. In `getActiveTimedAssignmentsForSidebar()`, replace `now: Date = new Date()` default parameter with an explicit `const now = await getDbNow()` call.
  3. Remove the default parameter from `selectActiveTimedAssignments` since the caller will always provide the DB time.
  4. Alternatively, keep the default parameter for testability but change the caller to pass DB time.
  5. Verify tsc --noEmit passes.
- **Status:** DONE event `createdAt` clock-skew — use already-fetched DB time (AGG-4)

- **Source:** AGG-4
- **Severity / confidence:** MEDIUM / HIGH
- **Citations:** `src/app/api/v1/contests/[assignmentId]/anti-cheat/route.ts:110,128`
- **Problem:** Anti-cheat event inserts use `createdAt: new Date()` while the boundary check at line 63 already fetches DB time via `SELECT NOW()`.
- **Plan:**
  1. The `now` variable is already available from line 67 (`const now = nowRow.now`).
  2. Replace `createdAt: new Date()` on line 110 with `createdAt: now`.
  3. Replace `createdAt: new Date()` on line 128 with `createdAt: now`.
  4. Verify tsc --noEmit passes.
- **Status:** DONE

### M3: Fix invite route timestamp clock-skew — use `getDbNowUncached()` for stored timestamps (AGG-5)

- **Source:** AGG-5
- **Severity / confidence:** MEDIUM / MEDIUM
- **Citations:** `src/app/api/v1/contests/[assignmentId]/invite/route.ts:103,115`
- **Problem:** The invite route stores `redeemedAt: new Date()` and `enrolledAt: new Date()`.
- **Plan:**
  1. Import `getDbNowUncached` from `@/lib/db-time`.
  2. At the top of the POST handler, add `const now = await getDbNowUncached()`.
  3. Replace `redeemedAt: new Date()` (line 103) with `redeemedAt: now`.
  4. Replace `enrolledAt: new Date()` (line 115) with `enrolledAt: now`.
  5. Verify tsc --noEmit passes.
- **Status:** TODO

### L1: Add tests for `tokenInvalidatedAt` DB-time usage and `isTokenInvalidated` clock-skew scenarios (AGG-7)

- **Source:** AGG-7
- **Severity / confidence:** MEDIUM / HIGH
- **Citations:** N/A — test gaps
- **Problem:** No tests verify that `tokenInvalidatedAt` is set using DB-consistent time. No tests verify `isTokenInvalidated()` behavior under clock-skew scenarios.
- **Plan:**
  1. Add a test file `tests/unit/auth/token-invalidation-clock-skew.test.ts` that:
     - Tests `isTokenInvalidated()` returns `true` when `authenticatedAtSeconds < tokenInvalidatedAt`.
     - Tests `isTokenInvalidated()` returns `false` when `authenticatedAtSeconds >= tokenInvalidatedAt`.
     - Tests edge case where both timestamps are equal (should return `false`).
  2. Add a test file `tests/unit/public-contests-db-time.test.ts` that verifies `getPublicContests()` and `getPublicContestById()` use `getDbNow()` instead of `new Date()`.
  3. Verify all tests pass.
- **Status:** TODO

---

## Deferred items

### DEFER-1: Fix rejudge route `new Date()` for audit log contest-finished check (AGG-6)

- **Source:** AGG-6
- **Severity / confidence:** LOW / LOW
- **Citations:** `src/app/api/v1/submissions/[id]/rejudge/route.ts:79`
- **Original severity preserved:** LOW / LOW
- **Reason for deferral:** The `new Date()` comparison only affects an audit log warning message, not access control or data integrity. The rejudge action itself is protected by capability checks. Adding an async DB call for a cosmetic audit log enhancement is a low priority.
- **Exit criterion:** When a dedicated consistency pass is scheduled, or when the rejudge route is refactored.

### DEFER-2: Fix non-null assertions on Map.get() results (AGG-8)

- **Source:** AGG-8
- **Severity / confidence:** LOW / MEDIUM
- **Citations:**
  - `src/app/(dashboard)/dashboard/groups/[id]/assignments/[assignmentId]/student/[userId]/page.tsx:131`
  - `src/lib/assignments/submissions.ts:365`
  - `src/lib/assignments/contest-scoring.ts:243`
- **Original severity preserved:** LOW / MEDIUM
- **Reason for deferral:** These non-null assertions are in code paths where the Map key is expected to always exist (the map is populated in a prior loop). The risk of a missing key is low and would only cause a descriptive TypeError. Fixing these is a code quality improvement, not a security or correctness issue.
- **Exit criterion:** When a code quality pass is scheduled, or when one of these code paths is refactored.

### DEFER-3: SSE connection tracking eviction O(n) scan (AGG-9)

- **Source:** AGG-9
- **Severity / confidence:** LOW / MEDIUM
- **Citations:** `src/app/api/v1/submissions/[id]/events/route.ts:44-55`
- **Original severity preserved:** LOW / MEDIUM
- **Reason for deferral:** The O(n) scan only runs during eviction, which happens when `connectionInfoMap.size >= MAX_TRACKED_CONNECTIONS` (1000). Under normal load, evictions are infrequent. The performance impact is bounded by the map size cap. This is an optimization, not a correctness issue.
- **Exit criterion:** When SSE connection volume becomes a performance bottleneck, or when the SSE route is refactored.

### DEFER-4: Problem import button JSON parse error handling (AGG-10)

- **Source:** AGG-10
- **Severity / confidence:** LOW / HIGH
- **Citations:** `src/app/(dashboard)/dashboard/problems/problem-import-button.tsx:23`
- **Original severity preserved:** LOW / HIGH
- **Reason for deferral:** The outer catch block already handles the error with a generic "importFailed" message. The improvement is a UX enhancement (more specific error message for malformed JSON), not a correctness issue. The server-side import endpoint validates the data structure regardless.
- **Exit criterion:** When the problem import feature is enhanced, or when a UX polish pass is scheduled.
