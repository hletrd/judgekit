# Debugger Review — RPF Cycle 48

**Date:** 2026-04-23
**Reviewer:** debugger
**Base commit:** 6831c05e

## Latent Bug Surface Analysis

### DBG-1: Judge claim `Date.now()` — premature stale detection under clock skew [MEDIUM/MEDIUM]

**File:** `src/app/api/v1/judge/claim/route.ts:122`

**Description:** The judge claim route uses `Date.now()` for `claimCreatedAt`, which gets stored as `judge_claimed_at` in the DB. The stale claim detection uses `NOW() - interval`. Under clock skew, this creates a timing mismatch.

**Failure mode:** App clock behind DB clock by N seconds. A claim is made at app time T, stored as `judge_claimed_at = T`. DB time is T + N. After `staleClaimTimeoutMs - N` milliseconds, the claim appears stale (T < T + N + (staleClaimTimeoutMs - N) - staleClaimTimeoutMs = T). The submission is re-claimable by another worker, potentially causing:
- Duplicate container starts
- Wasted compute resources
- Conflicting result writes (mitigated by SKIP LOCKED)

**Trigger condition:** NTP step correction or persistent clock drift between app and DB servers.

**Fix:** Use `getDbNowUncached()` inside the transaction.

---

### DBG-2: `rateLimitedResponse` header timing [LOW/LOW]

**File:** `src/lib/security/api-rate-limit.ts:125`

**Description:** The `X-RateLimit-Reset` header uses `Date.now()`. Under clock skew, the header may show an incorrect reset time. Not a functional bug since the DB check is authoritative, but could confuse API clients.

---

### DBG-3: SSE connection tracking — stale entries after process restart [LOW/LOW]

**File:** `src/app/api/v1/submissions/[id]/events/route.ts`

**Description:** If the process crashes and restarts, the in-memory `connectionInfoMap` is empty, but the DB may still have rate-limit entries from the previous process. The 30-minute expiry on DB entries means they will eventually be cleaned up, but during that window, new SSE connections may be rejected if the DB count is at the limit. This is a known trade-off documented in the code.

## Prior Fix Verification

All prior fixes remain intact and functional. No regressions detected.
