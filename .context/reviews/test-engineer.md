# Test Engineer Review — RPF Cycle 48

**Date:** 2026-04-23
**Reviewer:** test-engineer
**Base commit:** 6831c05e

## Test Coverage Analysis

### TE-1: Judge claim route lacks clock-skew test [MEDIUM/MEDIUM]

**File:** `src/app/api/v1/judge/claim/route.ts:122`

**Description:** The judge claim route uses `Date.now()` for `claimCreatedAt`, but there is no test verifying behavior under clock skew. The codebase has established a pattern of mocking `getDbNowUncached` for clock-skew testing (e.g., `tests/unit/security/api-rate-limit.test.ts`), but the claim route's clock dependency is not tested.

**Fix:** Add a test that mocks the DB time to be offset from `Date.now()` and verifies that stale claim detection uses the DB-consistent timestamp.

---

### TE-2: `rateLimitedResponse` header accuracy not tested [LOW/LOW]

**File:** `src/lib/security/api-rate-limit.ts:125`

**Description:** The `X-RateLimit-Reset` header value is computed from `Date.now()` but there is no test verifying the header matches the actual DB reset time.

---

### TE-3: Anti-cheat heartbeat gap query integration test coverage [LOW/LOW] (carry-over)

**File:** `src/app/api/v1/contests/[assignmentId]/anti-cheat/route.ts:195-204`

**Description:** The heartbeat gap detection logic (5000-row DESC fetch + reverse + gap threshold scan) has limited integration test coverage. Edge cases like exactly-at-threshold gaps, boundary timestamps, and empty heartbeat sets should be tested.

## Test Infrastructure Observations

1. The `getDbNowUncached` mock pattern is well-established and reusable
2. Unit tests for rate limiting are comprehensive
3. SSE route testing is limited due to streaming response complexity
