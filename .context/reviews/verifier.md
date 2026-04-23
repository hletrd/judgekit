# Verifier Review — RPF Cycle 37

**Date:** 2026-04-23
**Reviewer:** verifier
**Base commit:** 3d729cee

## Evidence-Based Correctness Check

This review validates that the stated behavior of each recently-fixed item matches the actual code.

### Verified Fixes (All Pass)

1. **AGG-1 (PATCH invitation NaN guard)** — Fixed in commit 733e648d
   - Line 119: `if (!Number.isFinite(expiresAtUpdate.getTime()))` — PASS
   - Returns `apiError("invalidExpiryDate", 400)` — PASS
   - Consistent with POST routes — PASS

2. **AGG-2 (Password rehash consolidation)** — Fixed in commit bae86159
   - `src/lib/security/password-hash.ts:51-70`: `verifyAndRehashPassword` with audit logging — PASS
   - `src/app/api/v1/admin/backup/route.ts:63`: Uses `verifyAndRehashPassword` — PASS
   - `src/app/api/v1/admin/migrate/export/route.ts:57`: Uses `verifyAndRehashPassword` — PASS
   - `src/lib/auth/config.ts:268`: Uses `verifyAndRehashPassword` — PASS
   - `src/lib/assignments/recruiting-invitations.ts:387`: Uses `verifyAndRehashPassword` — PASS

3. **AGG-3 (LIKE pattern escaping)** — Fixed in commit f7c8f7a1
   - Line 150: `escapeLikePattern(groupId)` used — PASS
   - ESCAPE clause present — PASS

4. **AGG-4 (Chat textarea aria-label)** — Fixed in commit 4b5b3e42
   - Line 369: `aria-label={t("placeholder")}` — PASS

5. **CR-1 (isStreaming ref)** — Fixed in commit e72cb327
   - Line 36-37: `isStreamingRef` declared and synced — PASS
   - Line 164: `isStreamingRef.current` used in sendMessage guard — PASS
   - Line 91: `isStreamingRef.current` used in scrollToBottom — PASS
   - Line 243: `isStreaming` removed from sendMessage dependency array — PASS

6. **CR-2 (TABLE_MAP derived from TABLE_ORDER)** — Fixed in commit b0481ae6
   - Lines 19-22: `TABLE_MAP` derived by iterating `TABLE_ORDER` — PASS
   - No manual `TABLE_MAP` entries that could drift — PASS

7. **PERF-1 (SSE stale threshold caching)** — Fixed in commit f96a65f4
   - Lines 84-98: 5-minute TTL cache — PASS
   - Fallback of 30,030,000ms preserved — PASS

8. **Import JSON body deprecation** — Fixed in commit f7d9fdbf
   - Sunset header with Nov 2026 date — PASS

9. **Import silent skip test** — Fixed in commit d7576aa7
   - Test verifies TABLE_MAP/TABLE_ORDER consistency — PASS

## New Findings

### V-1: quick-create route Date construction lacks NaN guard — inconsistent with recruiting routes [MEDIUM/MEDIUM]

**File:** `src/app/api/v1/contests/quick-create/route.ts:31-34`

**Description:** The recruiting invitation routes (single, bulk, PATCH) all have `Number.isFinite()` guards after `new Date(body.expiryDate)T23:59:59Z`) construction. The quick-create route constructs `new Date(body.startsAt)` and `new Date(body.deadline)` without this guard. If either produces Invalid Date, the comparison at line 36 (`startsAt.getTime() >= deadline.getTime()`) evaluates to false for NaN, which would pass the validation (the error case is when startsAt >= deadline, so false = "valid").

**Confidence:** Medium
