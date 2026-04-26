# Perf Reviewer — RPF Cycle 6/100

**Date:** 2026-04-26
**Cycle:** 6/100
**Lens:** performance, concurrency, CPU/memory, UI responsiveness, deploy hot-paths

---

**Cycle-5 carry-over verification:**
- PERF5-1 (drizzle-kit npm install per-deploy): UNCHANGED — carried deferred.
- PERF5-2 (`formatDetailsJson` re-parse per render): UNCHANGED — carried deferred.
- PERF5-3 (`vi.resetModules()` slow tests): UNCHANGED — carried deferred (tests pass; cosmetic).

---

## PERF6-1: [LOW, NEW] `_lastRefreshFailureAt` Map can grow unbounded in degenerate cases (cap exists indirectly via LRU cache size, but only if cache entries exist for the same keys)

**Severity:** LOW
**Confidence:** MEDIUM

**Evidence:**
- `route.ts:32`: `_lastRefreshFailureAt = new Map<string, number>()` — no maxSize.
- `route.ts:37-46`: cleanup is via `analyticsCache.dispose` which deletes the corresponding cooldown.
- Cleanup ONLY fires for keys that have a cache entry. If a refresh fails for a NEW key (no prior cache entry), the catch-block sets `_lastRefreshFailureAt[key] = Date.now()` — but `analyticsCache` never had the entry, so dispose never fires for it.

**Why it MIGHT be a problem:** The first call for a brand-new assignment ID goes through `// Cache miss` path (line 188-191), which does `analyticsCache.set(...)` AFTER `computeContestAnalytics(...)` succeeds. If `computeContestAnalytics` throws, the cache.set never runs but the catch-block in `refreshAnalyticsCacheInBackground` would set the cooldown. BUT: `refreshAnalyticsCacheInBackground` is only called from the staleness branch (line 178), which requires a cached entry. So a "first-call failure" path doesn't actually set the cooldown — it propagates the error to the caller via the unguarded `await computeContestAnalytics(...)` at line 189. The cooldown growth scenario does NOT apply for first-time keys.

**Why it's STILL a finding (defense-in-depth):** The lifecycle correctness depends on the invariant "every `_lastRefreshFailureAt.set` is preceded by a successful `analyticsCache.set` for the same key". A future contributor who adds a new failure-path that sets the cooldown without ensuring the cache has an entry will leak. Add an explicit defense: bound `_lastRefreshFailureAt` independently (e.g., via a max-size LRU map) so the invariant doesn't have to be enforced by remote-coupling.

**Fix:** Replace `Map<string, number>` with `LRUCache<string, number>({ max: 100, ttl: REFRESH_FAILURE_COOLDOWN_MS * 2 })`. The TTL is a natural bound — old cooldowns naturally expire. The dispose hook in `analyticsCache` becomes optional defense-in-depth.

**Exit criteria:** `_lastRefreshFailureAt` cannot grow beyond a configured cap. Gates green.

---

## PERF6-2: [LOW, NEW] `route.ts` `refreshAnalyticsCacheInBackground` invokes `computeContestAnalytics(assignmentId, true)` — the boolean flag is passed but undocumented

**Severity:** LOW (perf — the flag may bypass an internal cache; if not, double work)
**Confidence:** LOW (without inspecting `computeContestAnalytics` signature)

**Evidence:**
- `route.ts:82,189`: both call sites pass `true` as the second arg.
- The flag is unnamed at the call site; reader has to open `computeContestAnalytics` to know what it controls.

**Why it's a problem:** A reader can't tell from the call site whether the flag enables caching, bypasses caching, controls full-vs-summary computation, etc. If it's "force fresh / bypass internal cache", the perf cost is implicit.

**Fix:** Either (a) name the parameter at the call site by introducing a local: `const includeFullDetails = true; await computeContestAnalytics(assignmentId, includeFullDetails);`, or (b) refactor `computeContestAnalytics` to accept a named-options object: `{ forceFresh: true }`.

**Exit criteria:** Call sites are self-documenting; gates green.

---

## PERF6-3: [LOW, NEW] `deploy-docker.sh` data-loss regex is run via `grep -qiE "..." <<<"$PUSH_OUT"` — full output buffered in shell variable

**Severity:** LOW (memory; only relevant for very-long npm install + drizzle-kit output)
**Confidence:** HIGH

**Evidence:**
- `deploy-docker.sh:581-591` captures the entire stdout+stderr of the remote command into `PUSH_OUT`. For a fresh npm install, this can be hundreds of KB. The shell variable holds it all.
- `deploy-docker.sh:593`: `printf '%s\n' "$PUSH_OUT"` re-emits the captured output.

**Why it's a problem:** If the remote install hangs or emits MB of output (network errors, npm cache warnings, etc.), the bash variable holds the entire blob, which can become a memory issue on the deploy host (small VPS shells with 256 MB RAM).

**Fix:** Stream output to both stdout AND a file (`tee`), then grep the file. Avoid holding the full output in a shell variable. E.g.:
```sh
TMP=$(mktemp)
trap "rm -f $TMP" EXIT
remote "..." 2>&1 | tee "$TMP" || die "..."
if grep -qiE "..." "$TMP"; then ...; fi
```

**Exit criteria:** PUSH_OUT no longer holds the full output in memory. Gates green.

---

## Final Sweep — Performance Surfaces

- `analytics/route.ts` cache lifecycle is correct; only the unbounded `_lastRefreshFailureAt` growth scenario (PERF6-1) is worth a defense-in-depth change.
- `anti-cheat-monitor.tsx` retry timer is bounded by `MAX_RETRIES = 3`; backoff caps at 30s.
- `anti-cheat-storage.ts` cap of 200 events keeps localStorage-derived load fast.
- Deploy script: PERF6-3 is the only fresh perf concern.

**No agent failures.**
