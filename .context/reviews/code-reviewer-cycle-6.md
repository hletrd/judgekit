# Code Reviewer — Cycle 6 (Loop 6/100)

**Date:** 2026-04-24
**HEAD commit:** 4ec394c2 (cycle 5 multi-agent review + remediation)

## Methodology

Full-file review of all source files under `src/`, focusing on code quality, logic correctness, SOLID principles, and maintainability. Cross-file interaction analysis for auth, rate-limiting, SSE, recruiting-token, compiler execution, and proxy paths. This is the 6th cycle; prior cycles already addressed all production-code findings.

## Findings

**No new production-code findings.** No source code has changed since cycle 5.

### Observations

1. **Cycle 5 fix verified: JWT `authenticatedAt` now uses DB server time** — `src/lib/auth/config.ts:364` now calls `Math.trunc(await getDbNowMs() / 1000)` instead of `Math.trunc(Date.now() / 1000)`. The `syncTokenWithUser` fallback at line 131 still uses `Date.now()` but this is correctly documented as a rare edge-case fallback for malformed tokens. The primary sign-in path is now clock-skew-safe. **Previously AUTH-1, now resolved.**

2. **`atomicConsumeRateLimit` still uses `Date.now()`** — `src/lib/security/api-rate-limit.ts:56` uses `const now = Date.now()` for the rate-limit window computation inside a database transaction with `SELECT FOR UPDATE`. This is a known deferred item (AGG-2 from cycle 45). The transaction guarantees atomicity (no TOCTOU between check and update), but the window boundary is based on app-server time while the `windowStartedAt` stored value is also app-server time, so the comparison is internally consistent. However, if the app server clock jumps or drifts relative to previous entries (written by a different app instance with a different clock), windows could be miscalculated. **Severity: LOW** — mitigated by the transaction and the fact that rate-limit windows are short (default 60s). **Confidence: MEDIUM** — same finding as deferred AGG-2.

3. **Leaderboard freeze uses `Date.now()`** — `src/lib/assignments/leaderboard.ts:52` uses `Date.now()` to determine whether the leaderboard is frozen. This is a known deferred item. The freeze time (`freeze_leaderboard_at`) is set by an instructor and stored in the DB. A clock-skewed comparison could cause the leaderboard to freeze/unfreeze slightly early or late. **Severity: LOW** — freeze timing is not security-critical and the window is typically minutes/hours, not seconds. **Confidence: LOW** — unlikely to cause real-world issues.

## Verified Prior Fixes

All prior fixes from cycles 1-5 and cycles 37-55 remain intact:
- `getDbNowUncached()` / `getDbNowMs()` usage in JWT callback (cycle 5), judge claim route, recruiting token, server action rate limits, realtime coordination, anti-cheat contest boundary checks
- Non-null assertion removals
- Deterministic leaderboard sorts
- Token-invalidation bypass fix (clearAuthToken sets authenticatedAt=0)
- Source-grep baseline at 121 files

## Files Reviewed

Key files examined: `src/lib/auth/config.ts`, `src/lib/auth/session-security.ts`, `src/lib/auth/recruiting-token.ts`, `src/lib/security/api-rate-limit.ts`, `src/lib/security/csrf.ts`, `src/lib/security/encryption.ts`, `src/lib/security/password-hash.ts`, `src/lib/security/ip.ts`, `src/lib/security/sanitize-html.ts`, `src/lib/api/handler.ts`, `src/lib/api/auth.ts`, `src/lib/api/api-key-auth.ts`, `src/proxy.ts`, `src/app/api/v1/submissions/[id]/events/route.ts`, `src/lib/compiler/execute.ts`, `src/lib/assignments/recruiting-invitations.ts`, `src/lib/assignments/leaderboard.ts`, `src/lib/realtime/realtime-coordination.ts`, `src/lib/files/storage.ts`, `src/lib/db-time.ts`, `src/components/seo/json-ld.tsx`, `src/lib/submissions/visibility.ts`
