# RPF Cycle 14 Aggregate Review — JudgeKit (Loop 14/100)

**Date:** 2026-04-24
**HEAD commit:** ca6b7d84
**Reviewers:** code-reviewer, security-reviewer, perf-reviewer, architect, critic, verifier, test-engineer, debugger, tracer, designer, document-specialist

## Summary

**3 new actionable findings this cycle.** The primary theme is clock-source inconsistency in `rate-limit.ts`: `getEntry()` and `evictStaleEntries()` use `Date.now()` while the same table is also written by `api-rate-limit.ts` functions that use DB server time — creating mixed timestamps in shared rows. A secondary finding is that `mapTokenToSession` still uses manual field assignments despite `syncTokenWithUser` being automated with `Object.assign` in cycle 13, leaving the same class of bug that caused the `shareAcceptedSolutions` incident.

### New Findings

| ID | Finding | File+Line | Severity / Confidence | Reviewers Agreeing |
|----|---------|-----------|----------------------|-------------------|
| AGG-1 | `mapTokenToSession` still uses manual per-field assignment — same bug class that caused `shareAcceptedSolutions` incident in cycle 10. `syncTokenWithUser` was fixed with `Object.assign` but `mapTokenToSession` was not, creating an architectural inconsistency | `src/lib/auth/config.ts:142-168` | MEDIUM / HIGH | code-reviewer, architect, critic, verifier, debugger, tracer, test-engineer (7 of 11) |
| AGG-2 | `rate-limit.ts` `getEntry()` and `evictStaleEntries()` use `Date.now()` for comparisons against DB-stored timestamps, while `api-rate-limit.ts` writes to the same `rateLimits` table using DB server time — mixed clock sources in shared rows enable premature eviction and rate-limit bypass under clock skew | `src/lib/security/rate-limit.ts:39,77` | MEDIUM / HIGH | code-reviewer, security-reviewer, architect, critic, verifier, tracer (6 of 11) |
| AGG-3 | `ContestsLayout` click handler uses blocklist (`javascript:`, `data:`) instead of allowlist for URL scheme validation — `blob:` and other schemes bypass the check | `src/app/(dashboard)/dashboard/contests/layout.tsx:33` | LOW / MEDIUM | code-reviewer, security-reviewer, tracer (3 of 11) |

### Deferred-This-Cycle Findings

| ID | Finding | File+Line | Severity / Confidence | Reason for Deferral |
|----|---------|-----------|----------------------|-------------------|
| CR14-D1 | `in-memory-rate-limit.ts` FIFO eviction sorts entire map on overflow — O(n log n) for 10K+ entries | `src/lib/security/in-memory-rate-limit.ts:41-47` | LOW / MEDIUM | Performance optimization only fires when all 10K+ entries are non-stale — extremely rare in practice. The eviction already has a first-pass stale entry cleanup. |
| CR14-D2 | `leaderboard.ts` uses `Date.now()` for freeze-time comparison | `src/lib/assignments/leaderboard.ts:52` | LOW / MEDIUM | Carried from CR13-D3. Contest freeze times are set well in advance. Seconds of clock skew have minimal practical impact. |
| CR14-D3 | `recruiting-invitations-panel.tsx` uses `window.location.origin` for invitation URLs | `src/components/contest/recruiting-invitations-panel.tsx:99` | LOW / HIGH | Overlaps with DEFER-24 and DEFER-49 from prior cycles. Same fix — use server-provided appUrl. |
| CR14-D4 | `mapTokenToSession` comment says "add it HERE" but `syncTokenWithUser` no longer requires manual addition — misleading documentation | `src/lib/auth/config.ts:157` | LOW / HIGH | Documentation issue. If AGG-1 is fixed, this comment becomes obsolete. |
| CR14-D5 | `rate-limit.ts` has no JSDoc documenting clock source assumption | `src/lib/security/rate-limit.ts` | LOW / MEDIUM | Documentation improvement. If AGG-2 is fixed, all rate-limit code uses DB time and the assumption is self-documenting. |
| CR14-D6 | No test for `mapTokenToSession` field completeness | `tests/` | LOW / MEDIUM | Test coverage gap. If AGG-1 is fixed with programmatic iteration, a test for `AUTH_PREFERENCE_FIELDS` coverage becomes straightforward to add. |
| CR14-D7 | No test for rate-limit clock source consistency | `tests/` | LOW / MEDIUM | Test coverage gap. If AGG-2 is fixed with DB time everywhere, this test verifies no regressions. |

### Cross-Agent Agreement

- **AGG-1**: Flagged by 7 of 11 reviewers. The highest signal finding this cycle. The bug class is well-documented (shareAcceptedSolutions incident) and the fix is low-risk.
- **AGG-2**: Flagged by 6 of 11 reviewers. High signal. This is an extension of the clock-skew theme from cycles 12-13 — the `api-rate-limit.ts` functions were migrated to DB time but the older `rate-limit.ts` functions were not.
- **AGG-3**: Flagged by 3 of 11 reviewers. Low risk — DOMPurify and React's JSX rendering provide defense-in-depth. The `data-full-navigate` attribute must be explicitly added by a developer.

### Verified Prior Fixes

All 6 prior fixes from cycles 7-12 remain present and verified:

| ID | Finding | Status | Evidence |
|----|---------|--------|----------|
| F1 | `json_extract()` SQLite function in PostgreSQL path | FIXED | Grep returns no matches |
| F2 | `DELETE ... LIMIT` invalid PostgreSQL syntax | FIXED | All use `ctid IN (SELECT ctid ... LIMIT)` |
| CR9-CR1 | Auth field mapping duplication across 3 locations | FIXED | `mapUserToAuthFields()` centralizes |
| CR9-SR1 | SSE re-auth race — fire-and-forget allows one more event | FIXED | Re-auth awaits before processing |
| CR9-SR3 | Tags route lacks rate limiting | FIXED | Uses `createApiHandler` with `rateLimit: "tags:read"` |
| CR11-1 | `preparePluginConfigForStorage` encryption bypass via `enc:v1:` prefix | FIXED | Checks `isValidEncryptedPluginSecret` before encrypting |

Cycle 13 fixes also verified present:

| ID | Finding | Status | Evidence |
|----|---------|--------|----------|
| CR13-1 | `atomicConsumeRateLimit` uses `Date.now()` | FIXED | Now uses `getDbNowMs()` at line 59 |
| CR13-2 | ZIP bomb validation decompresses fully | FIXED | Per-entry size cap at line 44, check at line 72-73 |

### Gate Status

- eslint: Not yet run this cycle
- tsc --noEmit: Not yet run this cycle
- vitest run: Not yet run this cycle
- next build: Not yet run this cycle

### Deferred Items Carried Forward

The 21-item deferred registry from cycle 4 is carried forward intact, plus CR12-D1 through CR12-D16, CR13-D1 through CR13-D5, and CR14-D1 through CR14-D7 this cycle. No additions, no removals, no severity downgrades.

## Agent Failures

None. All 11 review agents completed successfully.
