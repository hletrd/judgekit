# RPF Cycle 1 (loop cycle 1/100) — Performance Reviewer

**Date:** 2026-04-24
**HEAD:** 8af86fab
**Reviewer:** perf-reviewer

## Scope

Reviewed performance-relevant code across:
- `src/lib/security/rate-limit.ts` — DB-backed rate limiting with `FOR UPDATE` row locks
- `src/lib/security/in-memory-rate-limit.ts` — in-memory LRU rate limiter
- `src/lib/security/api-rate-limit.ts` — API rate limiting with X-RateLimit headers
- `src/lib/realtime/realtime-coordination.ts` — SSE connection coordination
- `src/lib/compiler/execute.ts` — Docker container execution
- `src/lib/db/schema.pg.ts` — index design for query performance
- `src/lib/capabilities/cache.ts` — role capabilities caching with TTL
- `src/lib/system-settings-config.ts` — settings cache with TTL
- `src/proxy.ts` — auth user cache with TTL

## New Findings

**No new findings this cycle.** All previously identified performance items remain in the deferred list.

## Deferred Item Status (Unchanged)

- **AGG-2:** `atomicConsumeRateLimit` uses `Date.now()` in hot path — MEDIUM/MEDIUM, deferred
- **AGG-6:** SSE O(n) eviction scan — LOW/LOW, deferred
- **PERF-3:** Anti-cheat heartbeat gap query transfers up to 5000 rows — MEDIUM/MEDIUM, deferred
- **ARCH-3:** Stale-while-revalidate cache pattern duplication — LOW/LOW, deferred
- **AGG-8:** Global timer HMR pattern duplication — LOW/MEDIUM, deferred

## Performance Observations

1. **Rate limit eviction** — `evictStaleEntries()` runs on a 60-second `setInterval` with `unref()`, not on every check. Good design to reduce write contention.
2. **`FOR UPDATE` row locks** — `getEntry()` uses `.for("update")` which is correct for atomic check+increment in `consumeRateLimitAttemptMulti`. Per-key serialization under high contention is acceptable for login rate limiting.
3. **Schema indexing** — The `submissions` table has 9 indexes appropriate for the query patterns. The `submissions_retention_idx` on `(submittedAt, status)` correctly places the range-scan column first.
4. **SSE coordination** — Uses `pg_advisory_xact_lock` for global connection slot acquisition. Good pattern for distributed coordination without persistent lock rows.
5. **Capability cache** — Module-level cache with TTL pattern. `Date.now()` vs DB time for TTL expiry is acceptable since it is a cache, not a security boundary.

## Confidence

HIGH
