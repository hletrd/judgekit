# RPF Cycle 1 (loop cycle 1/100) — Debugger

**Date:** 2026-04-24
**HEAD:** 8af86fab
**Reviewer:** debugger

## Scope

Analyzed latent bug surface and failure modes across:
- `src/lib/security/rate-limit.ts` — race conditions, overflow, negative values
- `src/lib/compiler/execute.ts` — Docker container lifecycle, timeout handling
- `src/lib/judge/sync-language-configs.ts` — retry loop, SKIP_INSTRUMENTATION_SYNC
- `src/lib/realtime/realtime-coordination.ts` — SSE connection slot acquisition
- `src/lib/db/schema.pg.ts` — constraint violations, FK integrity
- `src/lib/api/handler.ts` — error handling, auth bypass edge cases

## New Findings

**No new findings this cycle.**

## Latent Bug Surface Analysis

1. **Rate limit `Date.now()` vs DB time** — The known deferred item (AGG-2). In a deployment where the app server clock drifts relative to the DB server, rate limit windows could be miscalculated. The `X-RateLimit-Reset` header was fixed to use DB time (cycle 48), but the internal `getEntry()` and `consumeRateLimitAttemptMulti` still use `Date.now()` for window calculation. This is the most impactful deferred item.

2. **Rate limit negative counter** — The `rateLimits.attempts` column is an integer without a CHECK constraint. A logic bug in `consumeRateLimitAttemptMulti` or `recordRateLimitFailure` could theoretically produce negative attempts. However, the code only increments (`attempts + 1`), never decrements, so this is theoretical. The `judge_workers.active_tasks` column correctly has a `>= 0` check constraint.

3. **Sync retry loop** — `syncLanguageConfigsOnStartup()` has a retry loop with exponential backoff (max 10 retries, max 30s). The off-by-one: the loop condition is `attempt <= MAX_SYNC_RETRIES` (0..10 = 11 attempts, not 10). This is a minor discrepancy between the constant name and actual behavior. Not a bug in practice since the retry exists for startup resilience.

4. **SSE connection slot** — `acquireSharedSseConnectionSlot` uses `pg_advisory_xact_lock` which releases at transaction end. If the advisory lock is acquired but the subsequent DB operations fail, the lock is correctly released. No leak risk.

5. **Compiler Docker container cleanup** — The `execute.ts` code uses try/finally to remove containers. The `MAX_CONTAINER_AGE_MS` (1 hour) safety check provides a fallback for orphaned containers. Good defensive design.

## Confidence

HIGH — no new latent bugs found. The known deferred items (AGG-2 Date.now(), PERF-3 5000-row fetch) remain the most impactful open items.
