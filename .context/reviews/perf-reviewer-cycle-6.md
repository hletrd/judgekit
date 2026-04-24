# Performance Reviewer — Cycle 6 (Loop 6/100)

**Date:** 2026-04-24
**HEAD commit:** 4ec394c2 (cycle 5 multi-agent review + remediation)

## Methodology

Review of performance-critical paths: rate limiting, SSE connection management, compiler execution, database queries, caching patterns, and concurrency control. Focus on CPU/memory usage, response latency, and scalability.

## Findings

**No new performance findings.** No source code has changed since cycle 5.

### Performance-Critical Paths Reviewed

1. **Rate limiting**: Two-tier strategy (sidecar pre-check + PostgreSQL transaction) is efficient. The sidecar pre-check avoids a DB transaction per request when the limit is already exceeded. `atomicConsumeRateLimit` uses `SELECT FOR UPDATE` which serializes per-key but is necessary for correctness.

2. **SSE connection tracking**: Per-user connection counts via `userConnectionCounts` Map avoids O(n) iteration on each connection check. Stale connection cleanup runs every 60 seconds. O(n) eviction scan in `addConnection` is bounded by `MAX_TRACKED_CONNECTIONS = 1000` — known deferred item (AGG-6).

3. **Compiler execution**: Module-level `pLimit` caps parallel Docker containers to `cpus() - 1`. Orphan container cleanup runs on each execution request. Container age check uses `Date.now()` vs `docker inspect` output — acceptable for non-transactional cleanup.

4. **Proxy auth cache**: FIFO with 2-second TTL and max 500 entries. Cache key includes `authenticatedAt` for prompt invalidation. Negative results (user not found) are not cached — correct for security but means every unauthenticated request hits the DB. This is acceptable given the short TTL and small cache size.

5. **Analytics/leaderboard caching**: Stale-while-revalidate pattern with 5-second TTL. Refresh is async and does not block the current request. Failure cooldown prevents thundering herd on repeated DB errors.

### Observations

- **PERF-3 (from cycle 43) still open**: Anti-cheat heartbeat gap query transfers up to 5000 rows. The query uses `ORDER BY DESC LIMIT 5000` and then reverses in JS — this is efficient for the DB but the data transfer could be significant for very long contests. **Severity: MEDIUM/MEDIUM**.

- **AGG-6 still open**: SSE O(n) eviction scan — bounded by 1000 entries, runs only when capacity is reached. LOW/LOW.

## Carry-Over

All deferred performance items from cycle 5 aggregate remain valid and unchanged.
