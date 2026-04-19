# Cycle 2 Review Remediation Plan

**Date:** 2026-04-19
**Source:** `.context/reviews/cycle-2-comprehensive-review.md`, `.context/reviews/_aggregate.md`
**Status:** COMPLETE

## Deduplication note
Cycle 1 plan (`2026-04-19-cycle-1-review-remediation.md`) is COMPLETE. The 2026-04-18 plan is also COMPLETE. This plan covers findings that are genuinely NEW from the cycle 2 review.

---

## Implementation Stories

### I18N-01: Add missing `language` key to anti-cheat i18n bundles
**Severity:** MEDIUM | **Confidence:** HIGH | **Effort:** Quick win

**Files:**
- `messages/en.json:2058` — add `"language": "Language"` under `contests.antiCheat`
- `messages/ko.json:2058` — add `"language": "언어"` under `contests.antiCheat`

**Problem:** The anti-cheat dashboard renders `t("language")` but neither locale bundle defines `contests.antiCheat.language`.

**Fix:** Add the key to both locale files.

**Verification:** `npx vitest run tests/unit/ui-i18n-keys-implementation.test.ts`, visual check

---

### SEC-04: Fix CSRF-before-auth ordering on 6 unwrapped API routes
**Severity:** MEDIUM | **Confidence:** HIGH | **Effort:** Moderate

**Files:**
- `src/app/api/v1/groups/[id]/assignments/route.ts:79` — CSRF before auth
- `src/app/api/v1/admin/backup/route.ts:21` — CSRF before auth
- `src/app/api/v1/admin/restore/route.ts:21` — CSRF before auth
- `src/app/api/v1/admin/migrate/export/route.ts:17` — CSRF before auth
- `src/app/api/v1/admin/migrate/validate/route.ts:12` — CSRF before auth
- `src/app/api/v1/admin/migrate/import/route.ts:19` — CSRF before auth

**Problem:** These routes check CSRF before resolving auth. API-key callers (no cookies, no browser origin) are rejected by CSRF before their identity is checked. The files DELETE route already has the correct pattern.

**Fix:** For each route, reorder to resolve auth first, then skip CSRF for API-key callers:
```
const user = await getApiUser(request);
if (!user) return unauthorized();
const isApiKeyAuth = "_apiKeyAuth" in user;
if (!isApiKeyAuth) {
  const csrfError = csrfForbidden(request);
  if (csrfError) return csrfError;
}
```

**Verification:** `npx tsc --noEmit`, `npx vitest run`

---

### TEST-04: Fix api-key-auth test mock chain
**Severity:** MEDIUM | **Confidence:** HIGH | **Effort:** Quick win

**File:** `tests/unit/api-key-auth.test.ts:8-19`

**Problem:** `makeSelectChain` creates a mock where `limit()` returns the rows array directly instead of a chainable thenable. The `authenticateApiKey` function does two `db.select()` calls; the mock fails for both.

**Fix:** Restructure `makeSelectChain` so `limit()` returns the chain object (which has `.then()`), and `.then()` resolves with the rows array. The key issue is that `limit()` must return something with a `.then()` method, not the raw rows.

**Verification:** `npx vitest run tests/unit/api-key-auth.test.ts`

---

### TEST-05: Fix data-retention-maintenance test expected call counts
**Severity:** MEDIUM | **Confidence:** HIGH | **Effort:** Quick win

**File:** `tests/unit/data-retention-maintenance.test.ts:68,81,85`

**Problem:** After `pruneLoginEvents` was added (cycle 1 CRIT-7), the prune pass now makes 5 delete calls instead of 4. Test expects 4 (initial) and 8 (double-start), should be 5 and 10.

**Fix:**
- Line 68: change `toHaveBeenCalledTimes(4)` to `toHaveBeenCalledTimes(5)`
- Line 81: change `toBe(8)` to `toBe(10)`
- Line 85: change `initialPruneCalls + 4` to `initialPruneCalls + 5`

**Verification:** `npx vitest run tests/unit/data-retention-maintenance.test.ts`

---

### TEST-06: Fix audit events test mock for batched DELETE
**Severity:** MEDIUM | **Confidence:** HIGH | **Effort:** Quick win

**File:** `tests/unit/audit/events.test.ts`

**Problem:** After PERF-01 fix (batched DELETE), the audit event pruning uses `db.execute(sql\`DELETE ... LIMIT\`)` instead of `db.delete().where()`. The test still mocks `db.delete().where()` which is never called.

**Fix:** Update the test mock to mock `db.execute()` instead of `db.delete().where()`. The mock should return an object with `rowCount: BATCH_SIZE` (or 0 to terminate the loop).

**Verification:** `npx vitest run tests/unit/audit/events.test.ts`

---

### TEST-07: Update source-grep inventory baseline
**Severity:** LOW | **Confidence:** HIGH | **Effort:** Quick win

**File:** `tests/unit/infra/source-grep-inventory.test.ts:85-86`

**Problem:** `DOCUMENTED_BASELINE = 115` but current count is 118.

**Fix:** Update `DOCUMENTED_BASELINE` to 118.

**Verification:** `npx vitest run tests/unit/infra/source-grep-inventory.test.ts`

---

### LOGIC-03: Replace `role !== "student"` with capability-based enrollment check
**Severity:** MEDIUM | **Confidence:** MEDIUM | **Effort:** Moderate

**Files:**
- `src/app/api/v1/groups/[id]/members/route.ts:94` — `if (student.role !== "student")`
- `src/app/(dashboard)/dashboard/groups/[id]/page.tsx:201` — `u.role !== "student"`
- `src/app/(dashboard)/dashboard/groups/page.tsx:87` — `user.role !== "student"`

**Problem:** Hardcoded `role !== "student"` blocks custom non-student roles from enrollment. The system has a capability model but these routes don't use it.

**Fix:** Use `getRoleLevel(role)` for server-side checks and `getRoleLevel` for UI filtering:
- Members route: `if (await getRoleLevel(student.role) > 0)` (non-student level roles cannot be enrolled as students)
- Groups pages: filter by `getRoleLevel > 0` for instructor dropdown

**Verification:** `npx tsc --noEmit`, `npx vitest run`

---

## Deferred Items

These findings are explicitly deferred per the review. Each records the file+line citation, original severity/confidence, concrete reason, and exit criterion.

| ID | Finding | Severity | Confidence | Reason for deferral | Exit criterion |
|----|---------|----------|------------|---------------------|----------------|
| PERF-03 | `/api/metrics` computes redundant `select 1` probe alongside worker/queue queries | LOW | HIGH | The overhead is one trivial query per metrics poll. Not impactful at typical Prometheus scrape intervals (15-60s). | Performance profiling shows metrics route is a bottleneck |
| OPS-03 | SSE connection tracking is per-pod when shared coordination is disabled | LOW | HIGH | By design: shared coordination via Redis is available for multi-pod deployments. Single-pod deployments don't need it. | Deployment architecture requires multi-pod SSE coordination |
| OPS-04 | Groups pages fetch all users for instructor dropdown instead of server-side filtering | LOW | MEDIUM | The current approach works for small-to-medium deployments. The query is already filtered by `isActive: true` and client-side role filter. | Platform exceeds 10K users and page load time becomes noticeable |

---

## Progress Ledger

| Story | Status | Commit |
|---|---|---|
| I18N-01 | Done | f7653631 |
| SEC-04 | Done | 24ea28a8 |
| TEST-04 | Done | f4ed1ce4 |
| TEST-05 | Done | 61a94fdc |
| TEST-06 | Done | 18c41fa9 |
| TEST-07 | Done | 7b062268 |
| LOGIC-03 | Done | 0ce2fb11 |
