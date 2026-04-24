# RPF Cycle 19 Review Remediation Plan

**Date:** 2026-04-24
**Source:** `.context/reviews/_aggregate.md` (cycle 19)
**Status:** Complete

---

## Summary

Cycle 19 deep review produced 3 deduplicated findings plus 8 carried-forward items from cycle 18. The primary theme is export redaction coverage gaps: `systemSettings.hcaptchaSecret` is missing from both `SANITIZED_COLUMNS` and `ALWAYS_REDACT` in the export module, despite being added to the logger's `REDACT_PATHS` in cycle 17. The secondary finding is a clock-source inconsistency in the leaderboard freeze boundary check.

## Action Items This Cycle

### CR19-1: Add `hcaptchaSecret` to Export Redaction Maps + Add Coverage Test

**File:** `src/lib/db/export.ts:245-258`
**Severity:** MEDIUM
**Reviewers:** code-reviewer, security-reviewer, architect, test-engineer, debugger

**Problem:** The `systemSettings.hcaptchaSecret` column is not included in `SANITIZED_COLUMNS` or `ALWAYS_REDACT`. All backup exports (sanitized and full-fidelity) include the encrypted hCaptcha secret ciphertext. In operational disaster recovery scenarios, the backup file and `NODE_ENCRYPTION_KEY` are often co-located, making the ciphertext decryptable.

**Plan:**
1. Add `systemSettings: new Set(["hcaptchaSecret"])` to `SANITIZED_COLUMNS` in `src/lib/db/export.ts`
2. Add `systemSettings: new Set(["hcaptchaSecret"])` to `ALWAYS_REDACT` in `src/lib/db/export.ts`
3. Add a test that validates `ALWAYS_REDACT` and `SANITIZED_COLUMNS` include entries for known secret columns (`passwordHash`, `encryptedKey`, `hcaptchaSecret`)

**Progress:** [x] Committed as `5469aa0d`, pushed

---

### CR19-2: Fix `computeLeaderboard` Clock Source — Use DB Time Instead of `Date.now()`

**File:** `src/lib/assignments/leaderboard.ts:52`
**Severity:** LOW
**Reviewers:** code-reviewer, architect, debugger, test-engineer

**Problem:** `computeLeaderboard()` uses `Date.now()` for the freeze boundary check (`nowMs >= freezeAt`), while all other contest boundary checks use DB server time. Under clock skew, the leaderboard freeze can trigger too early or too late.

**Plan:**
1. Replace `const nowMs = Date.now()` with `const nowMs = await getDbNowMs()` at line 52 of `src/lib/assignments/leaderboard.ts`
2. The function is already async, so this is a drop-in replacement
3. Verify existing tests still pass

**Progress:** [x] Committed as `7460f74c`, pushed

---

### CR19-3: Optimize Proxy Auth Cache Cleanup — Only Run When Near Capacity

**File:** `src/proxy.ts:68-75`
**Severity:** LOW
**Reviewers:** perf-reviewer

**Problem:** The cycle 18b fix added expired entry cleanup in `setCachedAuthUser` that iterates ALL entries on every `set` call when `size > 0`. Under high traffic with 500+ active users, this adds per-request overhead proportional to cache size.

**Plan:**
1. Change the cleanup condition from `if (authUserCache.size > 0)` to `if (authUserCache.size >= AUTH_CACHE_MAX_SIZE * 0.9)` — only run cleanup when near capacity
2. `getCachedAuthUser` already deletes expired entries on read, so expired entries that are accessed will be cleaned up naturally
3. Verify the cache still stays bounded under the 500-entry limit

**Progress:** [x] Committed as `060c58f8`, pushed

---

## Deferred Findings (Not Implemented This Cycle)

| ID | Finding | File+Line | Severity / Confidence | Reason for Deferral |
|----|---------|-----------|----------------------|-------------------|
| CR19-D1 | Secret column redaction fragmented across 3 modules (logger, export, audit) | `src/lib/logger.ts`, `src/lib/db/export.ts`, `src/lib/actions/system-settings.ts` | LOW / HIGH | Architectural consolidation requiring a shared constant module. No correctness issue — just a maintenance risk. Current fix (CR19-1) addresses the immediate gap. |
| CR19-D2 | Anti-cheat route mixed clock sources (DB for contest boundaries, `Date.now()` for heartbeat throttle) | `src/app/api/v1/contests/[assignmentId]/anti-cheat/route.ts:63-67,92` | LOW / LOW | Heartbeat throttle is purely local and 60-second granularity makes seconds of clock skew negligible. No operational impact. |
| CR19-D3 | `batchedDelete` in data-retention-maintenance may table-scan `antiCheatEvents` on each iteration | `src/lib/data-retention-maintenance.ts:22-23` | LOW / LOW | `ace_assignment_created_idx` leading column is `assignmentId`, not `createdAt`, but the table is typically small. 24-hour pruning interval means this is not on the critical path. |

## Carried Deferred Items (from Prior Cycles)

All deferred items from prior cycle remediation plans remain unchanged. The active deferred items are tracked in `.context/reviews/rpf-cycle-18b-comprehensive-review.md` lines 119-141 and the cycle 18b aggregate carried-forward table.

## Carried-Forward Findings from Cycle 18 (Not Addressed This Cycle)

| ID | Finding | Severity | Status |
|----|---------|----------|--------|
| AGG-1(c18) | Inconsistent locale handling in number formatting | MEDIUM/MEDIUM | Deferred — requires i18n audit |
| AGG-2(c18) | Access code share link missing locale prefix | LOW/MEDIUM | Deferred — requires i18n audit |
| AGG-3(c18) | Practice page progress-filter in-JS filtering at scale | MEDIUM/MEDIUM | Deferred — requires pagination refactor |
| AGG-4(c18) | Hardcoded English error string in api-keys clipboard | LOW/MEDIUM | Deferred — requires i18n audit |
| AGG-5(c18) | `userId!` non-null assertion in practice page | LOW/MEDIUM | Deferred — requires practice page refactor |
| AGG-6(c18) | Copy-code-button no error feedback on clipboard failure | LOW/LOW | Deferred — minor UX enhancement |
| AGG-7(c18) | Practice page component exceeds 700 lines | LOW/MEDIUM | Deferred — requires practice page refactor |
| AGG-8(c18) | Recruiting invitations panel `min` date uses client time | LOW/LOW | Deferred — same as A19 clock skew |
