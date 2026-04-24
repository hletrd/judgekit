# RPF Cycle 3 — Tracer (Causal Tracing of Suspicious Flows)

**Date:** 2026-04-24
**Scope:** Full repository — causal tracing of data flows, competing hypotheses

## Changed-File Tracing

### `src/lib/judge/sync-language-configs.ts` — SKIP_INSTRUMENTATION_SYNC

**Trace 1: Flag activation path**
1. `process.env.SKIP_INSTRUMENTATION_SYNC === "1"` → true
2. `logger.warn(...)` fires
3. Function returns `undefined` (implicit)
4. Caller (`instrumentation.ts` or startup) continues normally
5. No language configs are synced — they remain as-is from prior runs

**Hypothesis:** Could this leave the DB in an inconsistent state if language configs are missing?
**Disproof:** The flag is only used in environments where DB is unavailable (local dev, sandboxed review). In production, the DB is available and the flag is not set. Language configs are seeded during initial deployment. **No risk.**

**Trace 2: Flag NOT set (normal production path)**
1. Condition is false
2. Retry loop begins (line 87)
3. `doSync()` runs: queries existing configs, inserts/updates as needed
4. On success: function returns
5. On failure: exponential backoff, retry up to 10 times
6. After max retries: throws Error

**Hypothesis:** Could the retry loop hang forever?
**Disproof:** The loop has a hard cap of `MAX_SYNC_RETRIES = 10` iterations. The `attempt >= MAX_SYNC_RETRIES` check on line 92 throws after the last retry. **No hang risk.**

**Verdict:** Both paths are safe. No causal issues.

## Cross-System Flow Tracing

### Auth flow (login → session → API request)

1. `authorize()` in config.ts: validates credentials, checks `isActive`, verifies password with Argon2id, records login event
2. `jwt` callback: syncs token with user fields, sets `authenticatedAt`
3. `session` callback: maps token fields to session.user
4. API request: `getApiUser()` → `getToken()` → `getActiveAuthUserById()` → checks `tokenInvalidatedAt`
5. `createApiHandler()`: runs auth, CSRF, rate-limit, then handler

**Hypothesis:** Could a deactivated user still access an API endpoint between deactivation and the next JWT refresh?
**Analysis:** The `getActiveAuthUserById` checks `isActive` and `tokenInvalidatedAt` on every API request. The JWT callback also checks these on every token refresh. The gap window is the JWT refresh interval, which is controlled by `sessionMaxAgeSeconds`. For API requests (not page loads), `getApiUser` always queries the DB directly. **No access-after-deactivation gap for API routes.**

### SSE re-auth flow

1. SSE connection established
2. Every 30 seconds (`AUTH_RECHECK_INTERVAL_MS`): `getApiUser(request)` is called
3. If re-auth fails → connection closed
4. Between re-auth checks: status events are emitted

**Hypothesis:** Could a deactivated user receive up to 30 seconds of SSE events after deactivation?
**Analysis:** Yes, this is a known and accepted tradeoff. The 30-second window is documented. Reducing it would increase DB load proportionally. **Acceptable risk.**

## Summary

**New findings this cycle: 0**

All traced flows are safe and match expected behavior. The 30-second SSE re-auth window is a known, accepted tradeoff.
