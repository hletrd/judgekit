# RPF Cycle 3 — Code Reviewer

**Date:** 2026-04-24
**Scope:** Full repository, 567 TypeScript files
**Change surface since cycle 2:** `src/lib/judge/sync-language-configs.ts` (SKIP_INSTRUMENTATION_SYNC flag)

## Changed-File Review

### `src/lib/judge/sync-language-configs.ts` — SKIP_INSTRUMENTATION_SYNC

The guard at line 76 checks `process.env.SKIP_INSTRUMENTATION_SYNC === "1"` with strict-literal comparison, preventing accidental coercion in production. A loud `logger.warn` fires when the flag is active. The comment block (lines 69-75) documents the rationale, production-safety argument, and cross-references.

**Verdict:** Clean, well-documented, production-safe. No issues found.

## Full-Repository Sweep

### Carry-Forward Verified (No Regressions)

All previously fixed issues from cycles 37-55 remain intact:

1. Non-null assertion removals — verified `Map.get()` patterns use explicit null guards
2. DB-time usage for rate-limiting, SSE coordination, deadline enforcement — verified via grep
3. Deterministic leaderboard tie-breaking (ICPC + IOI) — verified both sorts include `userId`

### Existing Known Issues (Carry-Forward, No New Findings)

- **AGG-2:** `Date.now()` in `atomicConsumeRateLimit` hot path (line 56 of `api-rate-limit.ts`) — still present, still MEDIUM/MEDIUM, deferred per prior cycles
- **AGG-5:** `console.error` in ~15 client components — still present, LOW/MEDIUM, deferred
- **AGG-7:** Manual routes duplicate `createApiHandler` boilerplate — architectural, deferred

### New Observations (Low Signal)

None of these rise to the level of a confirmed finding; they are informational only:

1. The `atomicConsumeRateLimit` function (line 56) uses `Date.now()` for `nowMs` but this is the app-server timestamp used only for the `X-RateLimit-Reset` header and the DB writes. The `checkServerActionRateLimit` correctly uses `getDbNowUncached()` for the same purpose. This inconsistency was previously flagged as AGG-2 and deferred.

2. SSE route (`events/route.ts` line 36) uses `Date.now()` in `generateConnectionId` for connection ID uniqueness. This is fine — it's not used for any time-based comparison or security decision.

## Summary

**New findings this cycle: 0**

The only production code change is the well-documented `SKIP_INSTRUMENTATION_SYNC` guard. All prior fixes remain intact. No new code-quality, logic, SOLID, or maintainability issues found.
