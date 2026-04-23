# Performance Review — RPF Cycle 40

**Date:** 2026-04-23
**Reviewer:** perf-reviewer
**Base commit:** f030233a

## Inventory of Files Reviewed

- `src/app/api/v1/submissions/[id]/events/route.ts` — SSE connection management (verified stale threshold cache)
- `src/app/api/v1/contests/[assignmentId]/anti-cheat/route.ts` — Anti-cheat heartbeat gap detection
- `src/app/api/v1/contests/[assignmentId]/analytics/route.ts` — Contest analytics caching
- `src/app/api/v1/groups/[id]/assignments/[assignmentId]/route.ts` — Assignment PATCH
- `src/lib/compiler/execute.ts` — Compiler execution concurrency limiter
- `src/app/api/v1/groups/[id]/members/bulk/route.ts` — Bulk enrollment

## Previously Fixed Items (Verified)

- SSE stale threshold caching: Fixed — 5-minute TTL
- Contest stats CTE optimization: Fixed — `user_best` reused in `solved_problems`

## New Findings

No new performance findings. The existing deferred items remain accurate:

### Carry-Over Items

- **PERF-1:** SSE shared poll timer reads `getConfiguredSettings()` on restart (LOW/LOW, deferred)
- **PERF-2:** SSE connection eviction scan uses linear search (LOW/LOW, deferred — bounded by 1000 cap)
- **PERF-3 (from cycle 39):** Anti-cheat heartbeat gap query transfers up to 5000 rows (MEDIUM/MEDIUM, deferred — could use SQL window function)
