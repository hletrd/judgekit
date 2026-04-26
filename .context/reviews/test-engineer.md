# Test Engineer — RPF Cycle 5/100

**Date:** 2026-04-26
**Lens:** test coverage gaps, flaky tests, TDD opportunities

---

## TE5-1: [LOW, actionable, NEW] No test asserts that production-mode (NODE_ENV !== "test") `__test_internals` is undefined

**Severity:** LOW
**Confidence:** HIGH

**Evidence:**
- `src/app/api/v1/contests/[assignmentId]/analytics/route.ts:101-118` gates `__test_internals` behind `NODE_ENV === "test"`.
- `tests/unit/api/contests-analytics-route.test.ts` does NOT assert what happens when `NODE_ENV !== "test"` — that's hard to do because vitest sets it to `test` automatically.
- The cycle-4 plan exit criterion was "Production builds have `__test_internals === undefined`" but no test pins this contract.

**Why it's a problem:** The runtime gate could be removed accidentally (e.g., during a TypeScript refactor that "cleans up" the conditional), and no test would fail. The next time someone reads the code, they'd see "this is undefined in production" but nothing enforces it.

**Fix:** Add a test that uses `vi.stubEnv("NODE_ENV", "production")` before re-importing:
```ts
it("__test_internals is undefined in production", async () => {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", "production");
  const mod = await import("@/app/api/v1/contests/[assignmentId]/analytics/route");
  expect(mod.__test_internals).toBeUndefined();
  vi.unstubAllEnvs();
});
```

**Exit criteria:**
- New test asserts `__test_internals === undefined` when `NODE_ENV === "production"`.
- Test passes; gates green.

---

## TE5-2: [LOW, actionable, NEW] `clearAuthSessionCookies` lacks dedicated test asserting both cookie names are cleared in one response

**Severity:** LOW (also flagged as SEC5-2)
**Confidence:** HIGH

**Evidence:** `src/proxy.ts:87-97`. Tests in `tests/unit/proxy*` exercise the function indirectly but don't assert the dual-clear directly.

**Fix:** Add unit test (see SEC5-2 details).

---

## TE5-3: [LOW, NEW] `_refreshingKeys` leak scenario (DBG5-1) is uncovered by tests

**Severity:** LOW
**Confidence:** MEDIUM

**Evidence:** Existing tests cover the dedup guard (`tests/unit/api/contests-analytics-route.test.ts:142-176`) but no test asserts that `_refreshingKeys` drains to empty after a failure scenario. If the `finally` cleanup ever broke, only manual observation would catch it.

**Fix:** Add `__test_internals.isRefreshing(key)` (or expose the size of the set) and assert post-test state. Could pair with the broader CR5-2 / DBG5-1 fix that moves the add into the function.

**Exit criteria:** A test that triggers a failed refresh and then asserts that for the same key, the next stale-read CAN trigger a new refresh (proving the set drained).

---

## TE5-4: [LOW, deferred-carry] Anti-cheat retry/backoff lacks direct timing tests (carried from cycles 3-4 TE3-2)

Per cycle 3-4 plan, deferred — test setup non-trivial. Not a security/correctness blocker.

---

## TE5-5: [LOW, NEW] `anti-cheat-storage.test.ts` doesn't assert behavior when `localStorage` itself throws

**Severity:** LOW
**Confidence:** MEDIUM

**Evidence:** `tests/unit/components/anti-cheat-storage.test.ts:158-178`. Tests cover "remove when empty" and "persist as JSON" but no test verifies that `savePendingEvents` swallows a thrown `localStorage` error (e.g., quota exceeded) per the source's `try { ... } catch { /* localStorage unavailable */ }` (`anti-cheat-storage.ts:60-68`).

**Fix:** Add test using a `MemoryStorage` subclass whose `setItem` throws:
```ts
it("savePendingEvents swallows quota-exceeded error", () => {
  class FailingStorage extends MemoryStorage {
    setItem(): void { throw new Error("QuotaExceededError"); }
  }
  Object.defineProperty(globalThis, "localStorage", { ..., value: new FailingStorage() });
  expect(() => savePendingEvents("x", [{...}])).not.toThrow();
});
```

**Exit criteria:** New test confirms `savePendingEvents` never throws on storage failure.

---

## Final Sweep

- 304 test files passing, 2232 tests, 0 failures.
- Cycle 4 added `anti-cheat-storage.test.ts` (185 lines, well-structured) — great addition.
- The dispose-hook test in `contests-analytics-route.test.ts:230-248` is solid evidence that the cycle-3 lru/dispose coupling works.
- All gates green: lint 0 errors, test:unit 2232 pass, build EXIT=0.
