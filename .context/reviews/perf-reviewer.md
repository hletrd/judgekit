# Performance Review — RPF Cycle 43

**Date:** 2026-04-23
**Reviewer:** perf-reviewer
**Base commit:** b0d843e7

## Inventory of Files Reviewed

- `src/app/api/v1/submissions/route.ts` — Submission creation + listing
- `src/app/api/v1/contests/[assignmentId]/anti-cheat/route.ts` — Anti-cheat heartbeat + gap detection
- `src/app/api/v1/contests/[assignmentId]/analytics/route.ts` — Contest analytics caching
- `src/app/api/v1/compiler/run/route.ts` — Compiler execution
- `src/app/api/v1/playground/run/route.ts` — Playground execution
- `src/lib/compiler/execute.ts` — Docker container management
- `src/app/api/v1/judge/claim/route.ts` — Judge claim with raw SQL
- `src/app/api/v1/submissions/[id]/events/route.ts` — SSE connection management

## Previously Fixed Items (Verified)

- SSE stale threshold caching: Fixed — 5-minute TTL
- Contest stats CTE optimization: Fixed — `user_best` reused in `solved_problems`
- Compiler execution concurrency limiter: Working — `pLimit(Math.max(cpus().length - 1, 1))`

## New Findings

No new performance findings. The existing deferred items remain accurate:

### Carry-Over Items

- **PERF-1:** SSE shared poll timer reads `getConfiguredSettings()` on restart (LOW/LOW, deferred)
- **PERF-2:** SSE connection eviction scan uses linear search (LOW/LOW, deferred — bounded by 1000 cap)
- **PERF-3 (from cycle 39):** Anti-cheat heartbeat gap query transfers up to 5000 rows (MEDIUM/MEDIUM, deferred — could use SQL window function)
