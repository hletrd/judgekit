# Test Engineer — RPF Cycle 6/100

**Date:** 2026-04-26
**Cycle:** 6/100
**Lens:** test coverage gaps, flaky tests, TDD opportunities

---

**Cycle-5 carry-over verification:**
- TE5-1 (`__test_internals === undefined` in production): RESOLVED at `tests/unit/api/contests-analytics-route.test.ts:234-247`.
- TE5-2 (`clearAuthSessionCookies` dual-clear test): RESOLVED at `tests/unit/proxy.test.ts:488-507`.
- TE5-5 (storage-quota-exceeded swallow): UNCHANGED — carried deferred.

Gates verified: `npm run lint` 0 errors / 14 warnings (untracked dev .mjs scripts only); `npm run test:unit` 304/304 files, 2234/2234 tests, EXIT=0; `npm run build` EXIT=0.

---

## TE6-1: [LOW, NEW] No test asserts the `0020` SQL backfill DO-block is idempotent (re-runs as no-op when secret_token column does not exist)

**Severity:** LOW
**Confidence:** HIGH

**Evidence:**
- `drizzle/pg/0020_drop_judge_workers_secret_token.sql` wraps the UPDATE in a DO-block guarded by `IF EXISTS (SELECT 1 FROM information_schema.columns WHERE ... column_name = 'secret_token')`.
- Comment in the SQL claims idempotency, but no automated test runs the SQL twice and verifies the second run is a no-op.

**Why it's a problem:** A future schema change that drops the guard, OR a future Postgres version that changes information_schema query semantics, will silently break the idempotency. The DO-block runs in production deploys; a regression here would manifest as an UPDATE that executes when it shouldn't.

**Fix:** Add a Postgres-mode integration test (or a sandboxed sql-runner test) that:
1. Sets up a DB with the schema at commit `0019_familiar_mikhail_rasputin` (still has `secret_token`).
2. Runs `0020` once: verifies hash backfill happened + column dropped.
3. Runs `0020` again: verifies no error + no UPDATE occurs.

If integration testing is too expensive, fall back to a documentation test (a comment with a manual procedure operators can run periodically).

**Exit criteria:** Either integration test exists, OR a documented manual procedure is captured in `tests/sql/README.md`. Gates green.

---

## TE6-2: [LOW, NEW] Dispose-hook test name describes mechanism, not invariant — fragile to refactor

**Severity:** LOW (test quality — same surface as CRIT6-2)
**Confidence:** HIGH

**Evidence:** `tests/unit/api/contests-analytics-route.test.ts:248`: `it("evicts cooldown metadata when the cache entry is removed (dispose hook)", ...)`.

**Fix:** Rename to "cooldown metadata cannot outlive its cache entry (memory leak guard)" or similar.

**Exit criteria:** Test name pins the invariant. Gates green.

---

## TE6-3: [LOW, NEW] `setCooldown(key, valueMs)` parameter naming is ambiguous in tests — no test asserts the value semantics

**Severity:** LOW (related to CR6-1)
**Confidence:** HIGH

**Evidence:**
- `tests/unit/api/contests-analytics-route.test.ts:257`: `__test_internals.setCooldown(ASSIGNMENT_ID, Date.now())`.
- The test passes `Date.now()` (a timestamp) but the parameter name `valueMs` reads as "duration in ms".

**Fix:** Once the parameter is renamed to `failureAtMs` (per CR6-1), update the test caller. Add a brief comment in the test explaining the value is a timestamp.

**Exit criteria:** Test caller uses the renamed parameter; gates green.

---

## TE6-4: [LOW, NEW] No test pins `0021_lethal_black_tom.sql` content matches `tags.updated_at` schema

**Severity:** LOW (defense — schema-vs-migration drift is detectable today via existing `db/schema-parity.test.ts` if it covers the tags table)
**Confidence:** MEDIUM

**Evidence:**
- `tests/unit/db/schema-parity.test.ts` exists per the test output (`tests/unit/db/schema-parity.test.ts (4 tests)`). Without reading it, can't confirm whether it covers `tags.updated_at`.

**Fix:** Verify schema-parity.test.ts catches a missing `updated_at` column on tags (e.g., by removing it from the schema and running the test — should fail). If it does, no action needed. If it doesn't, extend it.

**Exit criteria:** Schema-parity test catches `tags.updated_at` missing in the migration. Gates green.

---

## Final Sweep — Test Coverage

- Unit-test count: 2234 (up from 2232 in cycle 5 — cycle-5 added 2 tests).
- 304 test files; 0 failures.
- Coverage of cycle-5 fixes is solid.
- The new gaps (TE6-1, TE6-4) are low-priority migration-validation tests.

**No agent failures.**
