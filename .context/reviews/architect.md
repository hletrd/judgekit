# Architecture Review — RPF Cycle 48

**Date:** 2026-04-23
**Reviewer:** architect
**Base commit:** 6831c05e

## Inventory of Reviewed Files

- `src/lib/security/api-rate-limit.ts`
- `src/lib/security/rate-limit.ts`
- `src/lib/security/in-memory-rate-limit.ts`
- `src/lib/security/rate-limiter-client.ts`
- `src/lib/realtime/realtime-coordination.ts`
- `src/lib/assignments/leaderboard.ts`
- `src/lib/assignments/contest-scoring.ts`
- `src/lib/assignments/participant-status.ts`
- `src/app/api/v1/submissions/[id]/events/route.ts`
- `src/app/api/v1/judge/claim/route.ts` (partial)
- `src/proxy.ts`
- `src/lib/data-retention.ts`
- `src/lib/db-time.ts`

## Findings

### ARCH-1: Judge claim route clock-skew — same pattern class as prior fixes [MEDIUM/MEDIUM]

**File:** `src/app/api/v1/judge/claim/route.ts:122`

**Description:** The judge claim route is the latest instance of the `Date.now()`-inside-DB-transaction pattern that has been systematically fixed across the codebase (cycles 40-47). This represents a gap in the clock-skew remediation strategy. The codebase has an established pattern: use `getDbNowUncached()` for all temporal comparisons that interact with DB-stored timestamps. The judge claim route should follow the same pattern.

**Architectural observation:** The `Date.now()` clock-skew class of bugs keeps recurring because there is no linting or compile-time guard against it. A custom ESLint rule or a wrapper function that enforces DB time would prevent future regressions.

**Fix:** Use `getDbNowUncached()` inside the transaction. Consider adding a `no-Date-now-in-transaction` lint rule.

---

### ARCH-2: Stale-while-revalidate cache pattern duplication [LOW/LOW] (carry-over)

**Description:** The same stale-while-revalidate cache pattern is duplicated across `contest-scoring.ts` and `contests/[assignmentId]/analytics/route.ts`. A shared utility would reduce duplication.

---

### ARCH-3: Manual routes duplicate createApiHandler boilerplate [MEDIUM/MEDIUM] (carry-over)

**Description:** Several routes that cannot use `createApiHandler` (SSE streaming, custom response types) duplicate the auth/rate-limit/error-handling boilerplate.

## Carry-Over Confirmations

All prior carry-over items remain valid and unfixed.
