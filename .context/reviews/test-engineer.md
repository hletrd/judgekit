# Test Engineer Review — RPF Cycle 23

**Date:** 2026-04-22
**Reviewer:** test-engineer
**Base commit:** 429d1b86

## TE-1: No tests for local `normalizePage` divergence from shared version [MEDIUM/HIGH]

**Files:**
- `src/app/(dashboard)/dashboard/problems/page.tsx:51`
- `src/app/(dashboard)/dashboard/admin/audit-logs/page.tsx:50`
- `src/app/(dashboard)/dashboard/admin/login-logs/page.tsx:47`
- `src/app/(dashboard)/dashboard/admin/users/page.tsx:41`
- `src/app/(dashboard)/dashboard/admin/files/page.tsx:26`

**Confidence:** HIGH

The shared `normalizePage` has unit tests in `tests/unit/pagination-and-ratings.test.ts`. However, the 5 local copies in server components are untested. The divergence from the shared version (using `Number()` instead of `parseInt`, no MAX_PAGE) means edge cases like `?page=1e10` or `?page=0x10` behave differently in these pages vs. pages using the shared version.

**Concrete failure scenario:** A test for `?page=1e10` passes for the shared `normalizePage` (returns 1) but fails silently for the local copies (returns 10000000000). Without tests, this divergence is invisible.

**Fix:** After replacing local copies with the shared import (recommended), no additional tests are needed since the shared version is already tested. If local copies are kept, add tests matching the shared version's test suite.

---

## TE-2: No unit tests for `contest-join-client.tsx` double `.json()` pattern [LOW/MEDIUM]

**File:** `src/app/(dashboard)/dashboard/contests/join/contest-join-client.tsx:44-49`

**Confidence:** MEDIUM

The double `.json()` pattern on the same Response object has no test coverage. While the current if/else branching prevents the error, a test would document the expected behavior and catch regressions if the pattern is changed.

**Fix:** After migrating to `apiFetchJson`, the pattern is eliminated and the test becomes about the correct API call. If keeping the current pattern, add a component test that verifies both error and success paths work correctly.

---

## Test Coverage Gaps (carried)

### TE-3: No component tests for anti-cheat-dashboard — carried from cycle 21
### TE-4: No component tests for role-editor-dialog — carried from cycle 21
### TE-5: No component tests for contest-replay — carried from cycle 21
### TE-6: Security module test gaps — carried as DEFER-36
### TE-7: Hook test gaps — carried as DEFER-37
