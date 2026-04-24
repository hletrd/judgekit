# RPF Cycle 1 (loop cycle 1/100) — Code Reviewer

**Date:** 2026-04-24
**Base commit:** 8af86fab (cycle 4 gate results + deferred finding #21)
**HEAD commit:** 8af86fab
**Reviewer:** code-reviewer

## Scope

Reviewed the full `src/**` tree plus generator scripts in the repo root and `scripts/**`. Specifically examined:

- `src/lib/judge/sync-language-configs.ts` — the `SKIP_INSTRUMENTATION_SYNC` short-circuit (only production code change since cycle 55)
- `src/lib/db/schema.pg.ts` — full schema integrity, indexes, constraints, foreign keys
- `src/lib/security/rate-limit.ts` — rate limiting logic, `Date.now()` usage (deferred AGG-2)
- `src/lib/security/csrf.ts` — CSRF validation, origin checking
- `src/lib/api/handler.ts` — `createApiHandler` factory, middleware pipeline
- `src/lib/auth/index.ts` — NextAuth + DrizzleAdapter setup
- `src/lib/security/sanitize-html.ts` — DOMPurify sanitization with allowed tags/attributes
- `src/lib/realtime/realtime-coordination.ts` — SSE coordination, pg_advisory_lock
- All `tracking-*` usage under `src/` — Korean letter-spacing guard compliance
- All `console.error/warn` in client components — (deferred AGG-5)
- All `process.env` reads in production paths — no secrets leaked
- `eslint-disable` / `@ts-ignore` usage — only one legitimate eslint-disable (plugin config)

## New Findings

**No new findings this cycle.** The diff from cycle 55 HEAD (`64522fe9`) to current HEAD (`8af86fab`) contains only docs (cycle 4 gate results + plan + user-injected cleanup) plus the `SKIP_INSTRUMENTATION_SYNC` short-circuit which was already reviewed and confirmed safe in cycle 55.

## Code Quality Observations

1. **`createApiHandler` pattern** — well-structured factory with proper middleware ordering: rate-limit -> auth -> CSRF -> body parsing -> handler. Error handling wraps everything. Good.
2. **Schema design** — comprehensive indexing strategy. The `submissions` table has 9 indexes including composite ones for leaderboard queries and data retention. Check constraints on `judge_workers.active_tasks >= 0` and `assignments.late_penalty >= 0` are good defensive measures.
3. **CSRF protection** — multi-layered: `X-Requested-With` header check, `Sec-Fetch-Site` validation, origin/host verification. API key auth correctly skips CSRF. Well-designed.
4. **HTML sanitization** — DOMPurify with narrow allowlist, `ALLOW_DATA_ATTR: false`, URI regex restricting to https/mailto/root-relative. Hook adds `rel=noopener noreferrer` and strips non-root-relative image sources. Solid.
5. **Rate limiting** — proper use of `FOR UPDATE` row locks in `getEntry()`, exponential backoff for blocks, `consumeRateLimitAttemptMulti` for atomic check+increment. The `Date.now()` usage is the known deferred item (AGG-2).

## Verification of Prior Fixes (All Still Intact)

- `src/lib/leaderboard/icpc.ts` deterministic userId tie-breaker — intact (cycle 49)
- `src/lib/leaderboard/ioi.ts` deterministic tie-breaker — intact (cycle 46)
- `src/app/api/v1/judge/claim/route.ts` DB-time for claim — intact (cycle 47)
- `src/lib/recruiting/token.ts` `computeExpiryFromDays` — intact (cycle 41)
- `src/lib/judge/sync-language-configs.ts` SKIP_INSTRUMENTATION_SYNC — safe (strict-literal `"1"`)

## Confidence

HIGH — the codebase is in a mature, stable state. Five consecutive cycles (51-55) plus cycle 4 confirm no new production-code findings.
