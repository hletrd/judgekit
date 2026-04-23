# Verifier Review — RPF Cycle 48

**Date:** 2026-04-23
**Reviewer:** verifier
**Base commit:** 6831c05e

## Verification Method

Evidence-based correctness check against stated behavior. Each finding is verified against the actual code path, not just the comments.

## Findings

### V-1: Judge claim route `Date.now()` for `claimCreatedAt` — verified clock-skew impact [MEDIUM/MEDIUM]

**File:** `src/app/api/v1/judge/claim/route.ts:122`

**Verification:** I traced the full data flow:
1. `claimCreatedAt = Date.now()` — captures app-server time
2. SQL: `to_timestamp(@claimCreatedAt::double precision / 1000)` — converts to DB timestamp
3. Stale check: `s.judge_claimed_at < NOW() - (@staleClaimTimeoutMs || ' milliseconds')::interval`
4. The comparison is between an app-time-originated value and DB `NOW()`

**Verified failure scenario:** If the app server clock is 30 seconds behind the DB server, a claim made "just now" will appear 30 seconds old from the DB's perspective. With a 5-minute stale timeout, the claim would be detected as stale 30 seconds early. This is confirmed by tracing the SQL logic.

**Evidence:** The same pattern was fixed and verified in `realtime-coordination.ts` (cycle 46), `checkServerActionRateLimit` (cycle 47), and `validateAssignmentSubmission` (cycle 45). The fix pattern is established.

---

### V-2: Prior fixes remain intact

All fixes from cycles 37-47 were verified to still be present:
1. `checkServerActionRateLimit` uses `getDbNowUncached()` — confirmed in api-rate-limit.ts:219
2. `realtime-coordination.ts` uses `getDbNowUncached()` — confirmed in lines 94 and 157
3. No `Map.get()!` patterns remain in the codebase — confirmed via grep
4. No `as any` patterns remain in the codebase — confirmed via grep

---

### V-3: `rateLimitedResponse` X-RateLimit-Reset header accuracy [LOW/LOW]

**File:** `src/lib/security/api-rate-limit.ts:125`

**Verification:** The header value `Math.ceil((Date.now() + windowMs) / 1000)` gives an approximate reset time. The actual reset in the DB depends on `windowStartedAt + windowMs`. Under normal conditions (clocks synchronized to within milliseconds), the difference is negligible. Under extreme clock skew (seconds+), clients could retry slightly early or late. Not a correctness issue since the DB check is authoritative.
