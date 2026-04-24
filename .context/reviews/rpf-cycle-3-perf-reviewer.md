# RPF Cycle 3 — Performance Reviewer

**Date:** 2026-04-24
**Scope:** Full repository

## Changed-File Review

### `src/lib/judge/sync-language-configs.ts` — SKIP_INSTRUMENTATION_SYNC

The early-return at line 76-81 prevents DB round-trips during startup when the flag is set. This is a performance *improvement* for local dev and sandboxed environments where DB is unavailable. No performance regression.

**Verdict:** No issues.

## Full-Repository Performance Sweep

### Previously Identified (Carry-Forward)

- **PERF-3 (cycle 43):** Anti-cheat heartbeat gap query transfers up to 5000 rows — MEDIUM/MEDIUM, deferred
- **AGG-6:** SSE O(n) eviction scan in `addConnection()` (events/route.ts lines 44-54) — LOW/LOW, deferred. The scan iterates `connectionInfoMap` to find the oldest entry by `createdAt`. With a cap of 1000 tracked connections, this is O(1000) worst case, acceptable.

### New Observations

1. **SSE shared poll timer** (events/route.ts line 163): The poll interval reads `getConfiguredSettings().ssePollIntervalMs` inside `startSharedPollTimer()`. Since `getConfiguredSettings()` has its own caching (reads from a cached object refreshed periodically), this is not a hot-path concern. No issue.

2. **Capability cache** (`src/lib/capabilities/cache.ts` line 66): Uses `Date.now()` for TTL check with a module-level `roleCacheLoadedAt` timestamp. The cache TTL is configurable. No performance concern — the cache prevents N+1 capability resolution queries per request.

3. **Compiler execution limiter** (execute.ts line 32): `pLimit(Math.max(cpus().length - 1, 1))` — sensible concurrency cap. No issue.

4. **Rate-limit WeakMap per-request dedup** (api-rate-limit.ts line 37): `WeakMap<NextRequest, Set<string>>` — clean pattern, no leak, O(1) lookups. No issue.

## Summary

**New findings this cycle: 0**

No new performance issues. All prior performance findings remain deferred and unchanged.
