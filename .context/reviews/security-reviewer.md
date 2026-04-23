# Security Review — RPF Cycle 48

**Date:** 2026-04-23
**Reviewer:** security-reviewer
**Base commit:** 6831c05e

## Inventory of Reviewed Files

- `src/lib/security/api-rate-limit.ts`
- `src/lib/security/rate-limit.ts`
- `src/lib/security/rate-limiter-client.ts`
- `src/lib/security/in-memory-rate-limit.ts`
- `src/lib/security/ip.ts`
- `src/proxy.ts`
- `src/lib/assignments/recruiting-invitations.ts`
- `src/app/api/v1/contests/[assignmentId]/anti-cheat/route.ts`
- `src/app/api/v1/judge/claim/route.ts` (partial)
- `src/lib/realtime/realtime-coordination.ts`
- `src/lib/auth/config.ts` (partial)
- `src/components/exam/anti-cheat-monitor.tsx`
- `src/lib/data-retention.ts`

## Findings

### SEC-1: Judge claim route `Date.now()` for `claimCreatedAt` — stale claim manipulation risk [MEDIUM/MEDIUM]

**File:** `src/app/api/v1/judge/claim/route.ts:122`

**Description:** The judge claim route uses `Date.now()` to set `judge_claimed_at` in the database. The stale claim detection compares this against `NOW()`. If an attacker can influence the app server's clock (via NTP spoofing on a shared network) or if there's natural clock drift, submissions could be prematurely re-claimed, leading to:
1. Duplicate judging of the same submission (wasting resources)
2. Potential race condition if the first worker's result arrives after the second worker starts

While `FOR UPDATE SKIP LOCKED` prevents actual data corruption, the security concern is that a clock-skew attack could amplify resource consumption by causing repeated claim/judge cycles for the same submissions.

**Fix:** Use `getDbNowUncached()` inside the transaction for `claimCreatedAt`.

---

### SEC-2: Anti-cheat heartbeat dedup uses `Date.now()` for LRU cache in single-instance mode [LOW/LOW] (carry-over)

**File:** `src/app/api/v1/contests/[assignmentId]/anti-cheat/route.ts:92`

**Description:** When `usesSharedRealtimeCoordination()` is false, the heartbeat dedup uses `Date.now()` for the LRU cache timestamp. Under clock skew (e.g., NTP step correction), the dedup window could be shortened or extended. The impact is limited: a shortened window means extra DB inserts (more heartbeat rows); an extended window means fewer inserts (missed heartbeat records).

**Fix:** When shared coordination is available, this path is not used. For single-instance mode, the impact is minimal. Defer.

---

### SEC-3: Anti-cheat client copies user text content [LOW/LOW] (carry-over)

**File:** `src/components/exam/anti-cheat-monitor.tsx:206-209`

**Description:** The `describeElement` function captures up to 80 characters of `el.textContent` and sends it to the server in the anti-cheat event details. This could inadvertently capture sensitive data (passwords, personal information) from text content near copy/paste events.

**Fix suggestion:** Strip or truncate the text content, or only send the element tag/class without the text.

---

### SEC-4: Docker build error leaks paths [LOW/LOW] (carry-over)

**Description:** Docker build errors in the judge worker may leak internal filesystem paths in error messages returned to the API.

## Security Positive Observations

1. `checkServerActionRateLimit` now uses `getDbNowUncached()` (fixed in cycle 47)
2. `realtime-coordination.ts` uses `getDbNowUncached()` consistently (fixed in cycle 46)
3. All SQL queries use parameterized inputs via Drizzle ORM or `rawQueryOne`/`rawQueryAll`
4. `escapeLikePattern` is used consistently for LIKE queries
5. CSP headers are properly set with nonce-based script-src
6. HSTS is properly configured
7. Recruiting tokens are stored as SHA-256 hashes, not plaintext
8. API key bearer auth bypasses session-level checks correctly
9. Rate limiting has both sidecar and DB-backed fallback paths
10. Proxy correctly clears session cookies on auth failure
