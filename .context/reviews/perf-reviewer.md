# Performance Review — RPF Cycle 37

**Date:** 2026-04-23
**Reviewer:** perf-reviewer
**Base commit:** 3d729cee

## Inventory of Files Reviewed

- `src/app/api/v1/submissions/[id]/events/route.ts` — SSE connection management (verified stale threshold cache)
- `src/lib/realtime/realtime-coordination.ts` — Shared realtime coordination
- `src/lib/security/in-memory-rate-limit.ts` — In-memory rate limiter
- `src/lib/plugins/chat-widget/chat-widget.tsx` — Chat widget (verified isStreamingRef)
- `src/lib/db/export.ts` — Database export streaming
- `src/lib/compiler/execute.ts` — Compiler execution
- `src/app/api/v1/contests/[assignmentId]/stats/route.ts` — Contest stats (verified CTE optimization)

## Previously Fixed Items (Verified)

- PERF-1 (SSE stale threshold caching): Fixed — 5-minute TTL at lines 84-98
- CR-1 (isStreaming ref for sendMessage): Fixed — isStreamingRef pattern used
- Contest stats CTE: `user_best` reused in `solved_problems` (line 109) to avoid double scan

## New Findings

### PERF-1: SSE shared poll timer reads `getConfiguredSettings()` on every timer creation — not cached [LOW/LOW]

**File:** `src/app/api/v1/submissions/[id]/events/route.ts:161`

**Description:** The `startSharedPollTimer()` function calls `getConfiguredSettings().ssePollIntervalMs` each time a new subscriber arrives and the timer needs to be restarted. Unlike the stale threshold (which is now cached with TTL), the poll interval is read from the config every time. However, the timer is only started when the first subscriber joins (after a period of zero subscribers), so this call happens infrequently. The performance impact is negligible.

**Concrete failure scenario:** Under normal operation, the shared poll timer is started once when the first SSE connection arrives after a quiet period, and stopped when all connections close. This might happen 5-10 times per day on a moderately loaded system.

**Fix:** Could cache the poll interval with the same TTL pattern as the stale threshold, but the ROI is minimal given the low frequency of timer restarts.

**Confidence:** Low

---

### PERF-2: SSE connection eviction scan uses linear search for oldest entry [LOW/LOW]

**File:** `src/app/api/v1/submissions/[id]/events/route.ts:44-55`

**Description:** The `addConnection` function iterates the entire `connectionInfoMap` to find the oldest entry when `MAX_TRACKED_CONNECTIONS` is exceeded. This is O(n) but bounded by `MAX_TRACKED_CONNECTIONS` (1000), making the impact minimal. This was identified in prior cycles as a deferred cosmetic issue.

**Fix:** Could use a min-heap for O(log n) eviction, but the 1000-entry cap makes this very low priority.

**Confidence:** Low
