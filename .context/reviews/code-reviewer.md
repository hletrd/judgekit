# Code Review — RPF Cycle 48

**Date:** 2026-04-23
**Reviewer:** code-reviewer
**Base commit:** 6831c05e

## Inventory of Reviewed Files

- `src/lib/security/api-rate-limit.ts` (full)
- `src/lib/security/rate-limit.ts` (full)
- `src/lib/security/rate-limiter-client.ts` (full)
- `src/lib/security/in-memory-rate-limit.ts` (full)
- `src/lib/assignments/leaderboard.ts` (full)
- `src/lib/assignments/contest-scoring.ts` (full)
- `src/lib/assignments/participant-status.ts` (full)
- `src/lib/assignments/recruiting-invitations.ts` (partial)
- `src/lib/assignments/exam-sessions.ts` (partial)
- `src/app/api/v1/submissions/[id]/events/route.ts` (full)
- `src/app/api/v1/contests/[assignmentId]/anti-cheat/route.ts` (full)
- `src/app/api/v1/judge/claim/route.ts` (partial)
- `src/lib/realtime/realtime-coordination.ts` (full)
- `src/proxy.ts` (full)
- `src/lib/data-retention.ts` (full)
- `src/components/exam/anti-cheat-monitor.tsx` (full)
- `src/app/(public)/practice/page.tsx` (partial)
- `src/lib/db-time.ts` (reference)
- All server action files referencing `checkServerActionRateLimit`

## Findings

### CR-1: Judge claim route uses `Date.now()` for `claimCreatedAt` — clock-skew in stale claim detection [MEDIUM/MEDIUM]

**File:** `src/app/api/v1/judge/claim/route.ts:122`

**Description:** The judge claim route captures `const claimCreatedAt = Date.now()` and uses it in the SQL query `to_timestamp(@claimCreatedAt::double precision / 1000)` to set `judge_claimed_at`. The stale claim detection then uses `s.judge_claimed_at < NOW() - interval` — comparing the app-time-based timestamp against DB `NOW()`. This is the same clock-skew class fixed in `realtime-coordination.ts` (cycle 46), `validateAssignmentSubmission` (cycle 45), the assignment PATCH route (cycle 40), and `checkServerActionRateLimit` (cycle 47).

**Concrete failure scenario (premature stale detection):** App clock 30 seconds behind DB. A worker claims a submission at app time 10:00:00 (DB time 10:00:30). `judge_claimed_at` is stored as 10:00:00. The stale timeout is 5 minutes. After 4m30s of DB time, `NOW()` returns 10:05:00, and `10:00:00 < 10:05:00 - 5min` = `10:00:00 < 10:00:00` = false (barely not stale yet). After 4m31s, the claim is marked stale — 30 seconds earlier than intended. With larger clock drift, the window shrinks further. In extreme cases (e.g., NTP correction), a freshly claimed submission could be immediately eligible for re-claim by another worker, causing duplicate judging.

**Fix:** Use `getDbNowUncached()` inside the transaction:
```typescript
const now = (await getDbNowUncached()).getTime();
const claimCreatedAt = now;
```

---

### CR-2: `rateLimitedResponse` uses `Date.now()` for `X-RateLimit-Reset` header [LOW/LOW]

**File:** `src/lib/security/api-rate-limit.ts:125`

**Description:** The `rateLimitedResponse` function computes the `X-RateLimit-Reset` header as `Math.ceil((Date.now() + windowMs) / 1000)`. Under clock skew, this could give clients an incorrect reset timestamp. The actual DB-stored `windowStartedAt + windowMs` may differ from `Date.now() + windowMs`.

**Concrete failure scenario:** App clock 5 seconds ahead of DB. A client is rate-limited at DB time 10:00:00 with a 60s window. The header says reset at 10:01:05 (app time), but the actual DB reset is at 10:01:00. The client waits 5 extra seconds before retrying. Not harmful but inaccurate.

**Fix:** Use the `windowStartedAt` value from the DB transaction to compute the reset time, or use `getDbNowUncached()` for consistency.

---

### CR-3: Practice page `resolvedSearchParams?.sort as SortOption` — unsafe type assertion (carried from cycle 47) [LOW/LOW]

**File:** `src/app/(public)/practice/page.tsx:128-129`

**Description:** The code casts `resolvedSearchParams?.sort` as `SortOption` before the `includes` check validates it. The `includes` check does validate the runtime value, so this is safe in practice, but the type assertion is misleading.

**Fix:** Cosmetic — use a more type-safe approach: `const currentSort = (SORT_VALUES as readonly string[]).includes(resolvedSearchParams?.sort ?? '') ? (resolvedSearchParams?.sort as SortOption) : "number_asc";`

## Carry-Over Confirmations

All previously identified carry-over items remain unfixed and are still valid:
- Leaderboard freeze uses `Date.now()` (LOW/LOW)
- Console.error in client components (LOW/MEDIUM)
- SSE O(n) eviction scan (LOW/LOW)
- Manual routes duplicate boilerplate (MEDIUM/MEDIUM)
- Global timer HMR pattern duplication (LOW/MEDIUM)
- Stale-while-revalidate cache pattern duplication (LOW/LOW)
