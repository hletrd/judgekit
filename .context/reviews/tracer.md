# Tracer Review — RPF Cycle 48

**Date:** 2026-04-23
**Reviewer:** tracer
**Base commit:** 6831c05e

## Causal Tracing of Suspicious Flows

### TR-1: Judge claim -> stale detection clock-skew chain [MEDIUM/MEDIUM]

**File:** `src/app/api/v1/judge/claim/route.ts:122`

**Causal chain:**
1. Worker calls POST `/api/v1/judge/claim`
2. Handler captures `claimCreatedAt = Date.now()` (app-server time)
3. SQL inserts `judge_claimed_at = to_timestamp(claimCreatedAt / 1000)` (DB-stored timestamp from app time)
4. Stale detection SQL: `s.judge_claimed_at < NOW() - interval`
5. `NOW()` returns DB-server time
6. If app and DB clocks differ, the comparison is inconsistent

**Competing hypotheses:**
- **H1 (confirmed):** Clock skew causes premature stale detection. App clock behind DB -> `judge_claimed_at` is "older" than actual DB time -> stale timeout appears to expire earlier.
- **H2 (rejected):** SKIP LOCKED prevents all issues. While it prevents data corruption from concurrent updates, it does not prevent the performance waste of duplicate container starts.
- **H3 (rejected):** The impact is negligible. Under typical NTP sync (<10ms), the impact is minimal. But during NTP step corrections (seconds to minutes), the impact can be significant.

**Verdict:** H1 confirmed. Fix by using `getDbNowUncached()` inside the transaction.

---

### TR-2: Rate-limited response header accuracy chain [LOW/LOW]

**File:** `src/lib/security/api-rate-limit.ts:125`

**Causal chain:**
1. Request is rate-limited -> `rateLimitedResponse()` called
2. Header computed: `X-RateLimit-Reset = Date.now() + windowMs`
3. Actual DB reset: `windowStartedAt + windowMs` (where `windowStartedAt` may be app-time from `atomicConsumeRateLimit`)
4. Both use app time, so they're internally consistent — the header matches the DB value only if clocks are synced

**Verdict:** Internally consistent but differs from DB time under skew. Low impact since clients should respect 429 regardless.

---

### TR-3: Anti-cheat heartbeat dedup in single-instance mode [LOW/LOW] (carry-over)

**Causal chain:**
1. Anti-cheat POST handler receives heartbeat event
2. If `!usesSharedRealtimeCoordination()`, checks LRU cache with `Date.now()`
3. LRU cache decides whether to insert a DB row
4. Under clock skew, dedup window may be slightly off
5. Impact: extra or missing heartbeat rows — not security-critical
