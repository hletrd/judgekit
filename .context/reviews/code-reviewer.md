# Code Reviewer — RPF Cycle 6/100

**Date:** 2026-04-26
**Cycle:** 6/100
**Lens:** code quality, logic, SOLID, maintainability, naming, dead code

---

**Cycle-5 carry-over verification:**
- CR5-1 (`cacheClear` removed): VERIFIED at `route.ts:115-130`. `grep -rn cacheClear src/ tests/` returns no hits.
- CR5-2 (`_refreshingKeys` co-location): VERIFIED at `route.ts:75-99`. The function is the single owner.
- CR5-3 (`MIN_INTERVAL_MS` placement): UNCHANGED at `anti-cheat-monitor.tsx:41` (carried-deferred).
- CR5-4 (`lastEventRef` Record bound): UNCHANGED at `anti-cheat-monitor.tsx:40,127-129` (carried-deferred).

---

## CR6-1: [LOW, NEW] `setCooldown` parameter `valueMs` is named ambiguously — caller-side usage suggests it's a timestamp, not a duration

**Severity:** LOW (naming clarity)
**Confidence:** HIGH

**Evidence:**
- `route.ts:117,125-127`:
  ```ts
  setCooldown: (key: string, valueMs: number) => void;
  ...
  setCooldown: (key: string, valueMs: number): void => {
    _lastRefreshFailureAt.set(key, valueMs);
  },
  ```
- Caller in test (`tests/unit/api/contests-analytics-route.test.ts:257`): `__test_internals.setCooldown(ASSIGNMENT_ID, Date.now())` — passes a timestamp.
- Production code (`route.ts:95`): `_lastRefreshFailureAt.set(cacheKey, Date.now())` — also a timestamp.
- The map is named `_lastRefreshFailureAt` and stores Date.now() values.

**Why it's a problem:** The parameter name `valueMs` is misleading. `Ms` suffix idiomatically means "duration in milliseconds" (e.g., `REFRESH_FAILURE_COOLDOWN_MS = 5_000` = 5 seconds). But the value stored is an absolute timestamp from `Date.now()`. A future contributor might pass `5_000` thinking they're setting "5s of cooldown" and instead anchor the cooldown 1745702281 ms in the past, defeating the failure throttle.

**Fix:**
1. Rename the parameter to `failureAtMs` or `timestampMs`:
   ```ts
   setCooldown: (key: string, failureAtMs: number) => void;
   ```
2. Update the test caller to use the same name.

**Exit criteria:** No `valueMs` in `route.ts` or its tests; gates green.

---

## CR6-2: [LOW, NEW] `__test_internals` block has 3 of 3 methods that wrap a single line each — `setCooldown` uses block-body, others use expression-body (inconsistent)

**Severity:** LOW (cosmetic; non-blocking)
**Confidence:** HIGH

**Evidence:**
- `route.ts:121-130`:
  ```ts
  ? {
      hasCooldown: (key: string): boolean => _lastRefreshFailureAt.has(key),
      setCooldown: (key: string, valueMs: number): void => {
        _lastRefreshFailureAt.set(key, valueMs);
      },
      cacheDelete: (key: string): boolean => analyticsCache.delete(key),
    }
  ```
- `setCooldown` uses block-body, the other two use expression-body. Inconsistent style within the same object literal.

**Fix:** Make all three expression-body. Type narrowing is unaffected because the return types are pinned by `TestInternals`. Note `Map.set` returns `Map`, not `void`; preserve `void` return by wrapping with `{ _lastRefreshFailureAt.set(...); }` OR use the void operator. Cleanest is to keep block-body but make the styling consistent the other way (block-body all three). Either approach works — pick whichever is more readable.

**Exit criteria:** Style is consistent across the three methods; gates green.

---

## CR6-3: [LOW, NEW] `0021_lethal_black_tom.sql` filename is auto-generated nonsense and not self-documenting

**Severity:** LOW (operator readability)
**Confidence:** HIGH

**Evidence:**
- `drizzle/pg/0021_lethal_black_tom.sql` content: `ALTER TABLE "tags" ADD COLUMN "updated_at" timestamp with time zone;`.
- The filename is drizzle-kit's default random-tag-generator. Other migrations in the journal have meaningful names (`0018_add_late_penalty_check`, `0020_drop_judge_workers_secret_token`).

**Why it's a problem:** Operators reading `git log` or browsing `drizzle/pg/` need to open `0021_lethal_black_tom.sql` to see what it does. By contrast, `0021_add_tags_updated_at.sql` is self-documenting.

**Fix:** Rename to `0021_add_tags_updated_at.sql` AND update `meta/_journal.json` entry (`tag` field). The snapshot file `meta/0021_snapshot.json` is keyed by index, not name; verify drizzle-kit handles this rename cleanly (likely safe as the snapshot file name matches the index).

**Exit criteria:** All `0021` references use the descriptive name; gates green.

---

## CR6-4: [LOW, NEW] `deploy-docker.sh:596` data-loss regex is broad

**Severity:** LOW (false-positive risk in deploy log scanning)
**Confidence:** MEDIUM

**Evidence:**
- `deploy-docker.sh:596`:
  ```sh
  if grep -qiE "data loss|are you sure|warning:.*destructive|please confirm" <<<"$PUSH_OUT"; then
  ```
- The pattern `warning:.*destructive` would also match if any of the npm install output includes the word "destructive". Likewise `please confirm` matches a wide variety of npm prompts.

**Why it's a problem:** A false positive triggers `warn` and prevents the success log, even when drizzle-kit actually applied the schema. This makes deploy "noisy yellow" instead of "definitive green/red".

**Fix:** Anchor patterns more specifically to drizzle-kit's actual output. Prefer narrower patterns: `grep -qiE "you're about to delete|dropping a column|data-loss"` — narrower, less surface area.

**Exit criteria:** Pattern matches actual drizzle-kit prompts (verify via test in a sandbox) but does not match common npm warnings. Gates green.

---

## Final Sweep — Style + Naming

- `analytics/route.ts` is 193 lines, well-structured. No dead exports.
- `anti-cheat-monitor.tsx` consistent with cycle 4-5 conventions.
- `anti-cheat-storage.ts` is small and well-tested.
- `proxy.ts` not modified this cycle.
- `judge/auth.ts` clean.

**No agent failures.**
