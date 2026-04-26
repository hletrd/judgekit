# Code Reviewer — RPF Cycle 5/100

**Date:** 2026-04-26
**Lens:** code quality, logic, SOLID, maintainability, dead code, naming
**Files inventoried:** As architect.md, plus the test files (`tests/unit/api/contests-analytics-route.test.ts`, `tests/unit/components/anti-cheat-storage.test.ts`).

---

## CR5-1: [LOW, actionable, NEW] `cacheClear` exposed in `__test_internals` but never consumed — YAGNI

**Severity:** LOW
**Confidence:** HIGH (verified by grep across `tests/`)

**Evidence:**
- `src/app/api/v1/contests/[assignmentId]/analytics/route.ts:108-110` exposes `cacheClear`.
- `grep -rn "cacheClear" tests/` returns zero hits. Tests use `setCooldown`, `hasCooldown`, `cacheDelete` only (`tests/unit/api/contests-analytics-route.test.ts:239-247`).
- The cycle-4 verifier called this out (VER4-2) and the fix was deferred.

**Why it's a problem:** Dead surface area. Test internals should be the smallest possible escape hatch. Adding unused methods invites accidental coupling and grows the production-vs-test API delta.

**Fix:** Drop `cacheClear` from the exported object:
```ts
export const __test_internals: ... | undefined =
  process.env.NODE_ENV === "test"
    ? { hasCooldown, setCooldown, cacheDelete }
    : undefined;
```

**Exit criteria:**
- `__test_internals` does not include `cacheClear`.
- `grep -rn "cacheClear" src/ tests/` returns no hits.
- All gates green.

---

## CR5-2: [LOW, actionable, NEW] `_refreshingKeys` Set has no upper bound and depends on `finally` for cleanup

**Severity:** LOW
**Confidence:** MEDIUM

**Evidence:** `src/app/api/v1/contests/[assignmentId]/analytics/route.ts:19,85,160`. The set is added to in line 160 and removed from in line 85 (the `finally` of `refreshAnalyticsCacheInBackground`). The `finally` always runs, so under normal control flow the set drains.

**Why it's a problem:** If a future refactor moves the `add` outside the function or introduces a synchronous throw before `try`, the `finally` doesn't run and the set leaks the key forever. Subsequent stale-cache reads for that key never trigger refresh. The cycle-4 architect (ARCH4-2) and critic (CRIT4-2) both noted this risk.

**Fix:** Move the `_refreshingKeys.add(cacheKey)` to be the FIRST line inside `refreshAnalyticsCacheInBackground` (before the try), so the function is the single owner of both add and delete. Or use a bounded `Set` (e.g., LRU) with a TTL guard.

**Exit criteria:**
- A unit test verifies that a synchronous failure inside the refresh-launch path leaves `_refreshingKeys` empty for that key.
- All gates green.

---

## CR5-3: [LOW, NEW] `MIN_INTERVAL_MS` is a hook-local const inside the component body

**Severity:** LOW
**Confidence:** MEDIUM

**Evidence:** `src/components/exam/anti-cheat-monitor.tsx:41`
```ts
const MIN_INTERVAL_MS = 1000;
```
Sits inside the React component body, alongside the other constants (`MAX_RETRIES`, `RETRY_BASE_DELAY_MS`, `HEARTBEAT_INTERVAL_MS`) which are at module scope (lines 28-30).

**Why it's a problem:** Inconsistent placement. Recreated on every render (negligible cost, but stylistically off). Forces every reader to scan for "where did this come from."

**Fix:** Move to module scope alongside the other constants.

**Exit criteria:** All numeric tunables for the anti-cheat monitor live at module scope.

---

## CR5-4: [LOW, deferred] `lastEventRef.current[eventType]` Record bound by enum closed-set in practice

**Severity:** LOW
**Confidence:** MEDIUM

**Evidence:** `src/components/exam/anti-cheat-monitor.tsx:40,127,129`. The Record is keyed by `eventType` which is enum-bounded (`CLIENT_EVENT_TYPES` = 6 entries). In practice cannot grow unboundedly.

**Why deferring:** Bound is implicit, not enforced. Cosmetic only.

**Exit criterion for re-open:** Either (a) anti-cheat events become user-defined, or (b) a code review wants the bound enforced at the type level (`Record<typeof CLIENT_EVENT_TYPES[number], number>`).

---

## Final Sweep

- All cycle-4 fixes verified present and minimal: `__test_internals` env-gated; `loadPendingEvents` capped via `MAX_PENDING_EVENTS`; storage helpers extracted to `anti-cheat-storage.ts` with unit tests.
- No new code-quality regressions detected in the recently-touched files.
- All gates green: lint 0 errors, test:unit 2232 pass, build EXIT=0.
