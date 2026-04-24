# RPF Cycle 1 (loop cycle 1/100) — Tracer

**Date:** 2026-04-24
**HEAD:** 8af86fab
**Reviewer:** tracer

## Scope

Traced suspicious data flows and causal chains across:
- Rate limit check-then-act flows (CSRF -> auth -> rate limit -> handler)
- Judge claim flow (submission -> claim -> poll -> result)
- SSE connection lifecycle (acquire slot -> heartbeat -> eviction)
- Anti-cheat heartbeat gap detection
- Recruiting token redemption flow
- Docker container lifecycle (create -> compile -> run -> cleanup)

## Causal Traces

### Trace 1: Rate Limit TOCTOU (Known Deferred AGG-2)

Flow: `isRateLimited()` (read-only, inside transaction) -> separate `recordRateLimitFailure()` (write, separate transaction)

The `consumeRateLimitAttemptMulti` function was specifically designed to close this TOCTOU race by performing check+increment in a single transaction with `FOR UPDATE` row locks. However, `isRateLimited()` and `recordRateLimitFailure()` still exist as separate functions with explicit JSDoc warnings not to use them for gating write operations. This is a known deferred item (AGG-2, MEDIUM/MEDIUM).

**Hypothesis:** A future developer might ignore the JSDoc warning and use `isRateLimited()` to gate a write, creating a TOCTOU race. **Likelihood:** Low — the warning is clear and the atomic alternative exists.

### Trace 2: SKIP_INSTRUMENTATION_SYNC Bypass

Flow: `syncLanguageConfigsOnStartup()` -> checks `process.env.SKIP_INSTRUMENTATION_SYNC === "1"` -> returns early

If a developer sets `SKIP_INSTRUMENTATION_SYNC=1` in production (e.g., to speed up startup), language configs won't be synced to the DB. This would cause the judge to use stale DB config for compile/run commands. The strict-literal `"1"` check prevents accidental activation via truthy coercion, and the loud `logger.warn` makes it visible in logs. Not present in `.env.deploy.algo` or `docker-compose.production.yml`.

**Hypothesis:** An operator adds this to production .env to "fix" a slow startup. **Likelihood:** Very low — the warning message is explicit and the flag is not documented as a production tool.

### Trace 3: SSE O(n) Eviction (Known Deferred AGG-6)

Flow: `acquireSharedSseConnectionSlot()` -> `tx.delete(rateLimits).where(...)` with LIKE pattern

The SSE connection slot acquisition deletes all expired SSE keys before inserting a new one. Under high concurrency with many SSE connections, this becomes an O(n) scan where n = total SSE entries in the rate_limits table. This is the known deferred item (AGG-6, LOW/LOW).

**Hypothesis:** Under 1000+ concurrent SSE connections with frequent connect/disconnect, the eviction scan could cause DB latency spikes. **Likelihood:** Low for current deployment scale.

## New Findings

**No new findings this cycle.** All traced flows behave as expected. Known deferred items remain the open causal risks.

## Confidence

HIGH — causal chains are well-understood. The TOCTOU risk in rate limiting is the most impactful open item, but it is mitigated by the existence of the atomic alternative (`consumeRateLimitAttemptMulti`).
