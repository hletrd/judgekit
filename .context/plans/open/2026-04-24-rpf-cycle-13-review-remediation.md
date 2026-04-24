# RPF Cycle 13 Review Remediation Plan

**Date:** 2026-04-24
**Source:** `.context/reviews/_aggregate.md` (cycle 13)
**Status:** CR13-1 DONE, CR13-2 DONE

## Summary

Cycle 13 deep review produced 2 actionable findings plus 5 deferred items. The primary theme is clock-source inconsistency between `Date.now()` and DB server time in rate limiting, which has security implications. The secondary finding is a ZIP bomb DoS vector in file validation.

## Action Items This Cycle

### CR13-1: Fix `atomicConsumeRateLimit` clock source — use DB time instead of `Date.now()`

**File:** `src/lib/security/api-rate-limit.ts:56`
**Severity:** MEDIUM / HIGH
**Reviewers:** code-reviewer, security-reviewer

**Problem:** `atomicConsumeRateLimit()` uses `Date.now()` for rate-limit window computation while `checkServerActionRateLimit()` uses `(await getDbNowUncached()).getTime()`. Both write to the same `rateLimits` table, creating a clock-source inconsistency that can allow rate-limit bypass under clock skew.

**Plan:**
1. Change `atomicConsumeRateLimit` to fetch DB time at the start of the function using `getDbNowUncached()`.
2. The `nowMs` return value is already returned to callers for `rateLimitedResponse` headers — ensure it remains consistent.
3. Update tests if any mock `Date.now()` expectations break.

**Implementation (DONE):** Replaced `Date.now()` with `await getDbNowMs()` in `atomicConsumeRateLimit`. Updated test mocks to use `MOCK_DB_NOW_MS` consistently and added `getDbNowMs` mock. Committed as `80ddadb4`.

**File:** `src/lib/files/validation.ts:44-69`
**Severity:** MEDIUM / MEDIUM
**Reviewers:** code-reviewer, perf-reviewer

**Problem:** The function fully decompresses each ZIP entry into memory just to count its size. A ZIP bomb with many entries (under the 10,000 entry cap) can cause OOM.

**Plan:**
1. Add a per-entry decompressed size cap (e.g., 50 MB). If any single entry exceeds this, reject the ZIP immediately.
2. This prevents a single entry from consuming excessive memory while still allowing legitimate large files.
3. Update tests if needed.

**Implementation (DONE):** Added `MAX_SINGLE_ENTRY_DECOMPRESSED_BYTES = 50 MB` constant. After decompressing each entry, check if `content.length > MAX_SINGLE_ENTRY_DECOMPRESSED_BYTES` before accumulating. Committed as `5b8db497`.

## Deferred Findings (Not Implemented This Cycle)

| ID | Finding | File+Line | Severity / Confidence | Reason for Deferral |
|----|---------|-----------|----------------------|-------------------|
| CR13-D1 | `deriveEncryptionKey`/`legacyEncryptionKey` recompute on every call | `src/lib/security/derive-key.ts:9-16, 23-30` | LOW / MEDIUM | Performance optimization. HKDF derivation is fast enough for normal load. |
| CR13-D2 | `getRetentionCutoff` defaults to `Date.now()` | `src/lib/data-retention.ts:38-40` | LOW / HIGH | Pruning runs once per 24h. Seconds of clock skew negligible. `now` parameter supports override. |
| CR13-D3 | `computeLeaderboard` uses `Date.now()` for freeze time | `src/lib/assignments/leaderboard.ts:52-53` | LOW / MEDIUM | Freeze times set well in advance. Seconds of clock skew minimal impact. |
| CR13-D4 | SSE cleanup mid-iteration mutation | `src/app/api/v1/submissions/[id]/events/route.ts:102-110` | LOW / LOW | JS Map spec handles this correctly. Technically safe. |
| CR13-D5 | Vitest parallel flake (5-6 tests) | Multiple test files | LOW / HIGH | Pre-existing deferred item #21. All pass in isolation. Root cause is worker resource contention. |

## Gate Status (Pre-Implementation)

- eslint: PASS (0 errors, 14 warnings — all in untracked files)
- tsc --noEmit: PASS (0 type errors)
- vitest run: PASS with known flake (5 files with 6 flaky tests that pass in isolation)
- next build: Running
