# Performance Review — RPF Cycle 48

**Date:** 2026-04-23
**Reviewer:** perf-reviewer
**Base commit:** 6831c05e

## Inventory of Reviewed Files

- `src/lib/security/api-rate-limit.ts`
- `src/lib/security/in-memory-rate-limit.ts`
- `src/lib/security/rate-limiter-client.ts`
- `src/lib/assignments/contest-scoring.ts`
- `src/app/api/v1/submissions/[id]/events/route.ts`
- `src/lib/assignments/leaderboard.ts`
- `src/app/api/v1/contests/[assignmentId]/anti-cheat/route.ts`
- `src/lib/compiler/execute.ts` (partial — container cleanup)

## Findings

### PERF-1: Judge claim route `Date.now()` for `claimCreatedAt` could cause premature re-claims under clock skew [MEDIUM/MEDIUM]

**File:** `src/app/api/v1/judge/claim/route.ts:122`

**Description:** Performance impact of the clock-skew issue: if claims are prematurely detected as stale due to clock drift, multiple workers may attempt to claim and judge the same submission simultaneously, wasting compute resources (container startup, compilation, execution). The `FOR UPDATE SKIP LOCKED` pattern prevents actual duplicate judging, but the wasted container starts are a real performance cost.

**Fix:** Use `getDbNowUncached()` as described in code-reviewer CR-1.

---

### PERF-2: Anti-cheat heartbeat gap query still transfers up to 5000 rows [MEDIUM/MEDIUM] (carry-over)

**File:** `src/app/api/v1/contests/[assignmentId]/anti-cheat/route.ts:195-204`

**Description:** The heartbeat gap detection fetches up to 5000 rows in application memory and iterates them sequentially. For long-running contests, this is expensive and delays the API response. This is a carry-over from prior cycles.

**Fix suggestion:** Move gap detection into a SQL window function to compute gaps server-side, reducing the transferred data to only the gap records.

---

### PERF-3: SSE connection tracking linear scan for oldest entry [LOW/LOW] (carry-over)

**File:** `src/app/api/v1/submissions/[id]/events/route.ts:44-49`

**Description:** The `addConnection` function does an O(n) linear scan through `connectionInfoMap` to find the oldest entry when over capacity. This is triggered when `MAX_TRACKED_CONNECTIONS` (1000) is reached. In practice, this is rare and the map is bounded.

**Fix suggestion:** Maintain a sorted structure or use `Map` insertion-order properties for FIFO eviction.

---

### PERF-4: In-memory rate limiter FIFO eviction is O(n log n) [LOW/LOW] (carry-over)

**File:** `src/lib/security/in-memory-rate-limit.ts:42`

**Description:** The `maybeEvict` function sorts all entries by `lastAttempt` when evicting excess entries. This is O(n log n) where n is up to `MAX_ENTRIES` (10000). Acceptable for periodic cleanup but not optimal.

## Carry-Over Confirmations

- Anti-cheat heartbeat gap query (MEDIUM/MEDIUM)
- SSE O(n) eviction scan (LOW/LOW)
- `atomicConsumeRateLimit` uses `Date.now()` in hot path (MEDIUM/MEDIUM) — deferred for performance reasons
