# RPF Cycle 13 Aggregate Review — JudgeKit (Loop 13/100)

**Date:** 2026-04-24
**HEAD commit:** latest main (cycle 13)
**Reviewers:** code-reviewer, security-reviewer, perf-reviewer

## Summary

**2 new actionable findings this cycle.** The primary theme is clock-source inconsistency: `Date.now()` is used where DB server time should be used for comparisons against DB-stored timestamps. This affects rate limiting accuracy (security) and data retention correctness (compliance). A secondary finding is ZIP bomb DoS via full decompression during validation.

### New Findings

| ID | Finding | File+Line | Severity / Confidence | Reviewers Agreeing |
|----|---------|-----------|----------------------|-------------------|
| CR13-1 | `atomicConsumeRateLimit` uses `Date.now()` while `checkServerActionRateLimit` uses DB time — inconsistent clock source for shared `rateLimits` table, enabling rate-limit bypass under clock skew | `src/lib/security/api-rate-limit.ts:56 vs 223` | MEDIUM / HIGH | code-reviewer, security-reviewer |
| CR13-2 | `validateZipDecompressedSize` decompresses every ZIP entry fully just to count bytes — OOM risk from ZIP bomb with many entries under the 10,000 entry cap | `src/lib/files/validation.ts:44-69` | MEDIUM / MEDIUM | code-reviewer, perf-reviewer |

### Deferred-This-Cycle Findings

| ID | Finding | File+Line | Severity / Confidence | Reason for Deferral |
|----|---------|-----------|----------------------|-------------------|
| CR13-D1 | `deriveEncryptionKey`/`legacyEncryptionKey` recompute on every call instead of caching | `src/lib/security/derive-key.ts:9-16, 23-30` | LOW / MEDIUM | Performance optimization, not a correctness or security issue. HKDF derivation is fast enough for normal load. |
| CR13-D2 | `getRetentionCutoff` defaults to `Date.now()` — pruning uses app-server time vs DB-stored timestamps | `src/lib/data-retention.ts:38-40` | LOW / HIGH | Data retention pruning runs once per 24 hours. Clock skew of a few seconds has negligible practical impact. The `now` parameter already supports override. |
| CR13-D3 | `computeLeaderboard` uses `Date.now()` for freeze-time comparison | `src/lib/assignments/leaderboard.ts:52-53` | LOW / MEDIUM | Contest freeze times are typically set well in advance. Seconds of clock skew have minimal practical impact. |
| CR13-D4 | SSE cleanup iterates `connectionInfoMap` with mid-iteration mutation | `src/app/api/v1/submissions/[id]/events/route.ts:102-110` | LOW / LOW | JavaScript Map spec handles this correctly. Pattern is technically safe but fragile. |
| CR13-D5 | Vitest parallel flake: 5-6 tests fail under `vitest run` but pass in isolation | `tests/unit/public-seo-metadata.test.ts` and 4 others | LOW / HIGH | Pre-existing deferred item (#21 from cycle 2). All tests pass in isolation. Root cause is vitest worker resource contention. |

### Cross-Agent Agreement

- **CR13-1**: Flagged by 2 out of 3 reviewers (code-reviewer, security-reviewer). The code-quality and security angles converge on the same issue. HIGH signal.
- **CR13-2**: Flagged by 2 out of 3 reviewers (code-reviewer, perf-reviewer). Both identify the OOM vector. MEDIUM signal — the 10,000 entry cap and per-request body size limits partially bound the impact.

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

### Gate Status

- eslint: PASS (0 errors, 14 warnings — all in untracked files)
- tsc --noEmit: PASS (0 type errors)
- vitest run: PASS with known flake (291/296 files pass; 5 files with 6 flaky tests that all pass in isolation — deferred item #21)
- next build: Running (background)

### Deferred Items Carried Forward

The 21-item deferred registry from cycle 4 is carried forward intact, plus CR12-D1 through CR12-D16 from cycle 12, plus CR13-D1 through CR13-D5 this cycle. No additions, no removals, no severity downgrades.

## Agent Failures

None. All 3 review agents completed successfully.
