# Cycle 8 Deep Code Review — JudgeKit

**Date:** 2026-04-19 (updated)
**Reviewer:** Comprehensive multi-angle review (code quality, security, performance, architecture, testing)
**Scope:** Full repository — `src/`, `tests/`, configuration files
**Prior cycle-8 findings status:** All 9 prior findings (F1-F9) have been verified as FIXED in prior cycles. This update contains new findings from a fresh deep review.

---

## F1: ~~[MEDIUM] `recordRateLimitFailure` uses inconsistent `consecutiveBlocks` exponent vs other call sites~~ — NOT A BUG

- **File:** `src/lib/security/rate-limit.ts:206`
- **Severity:** ~~Medium~~ NOT A BUG | **Confidence:** HIGH (verified by test)
- **Resolution:** The code is consistent across all three call sites. The increment ordering differs but the result is the same:
  - `consumeRateLimitAttemptMulti`/`recordRateLimitFailureMulti`: increment first (`consecutiveBlocks += 1`), then pass `consecutiveBlocks - 1` (gets original value)
  - `recordRateLimitFailure`: pass `consecutiveBlocks` first (original value), then increment
  - Both effectively compute `calculateBlockDuration(original_consecutiveBlocks, blockMs)`. Test at `rate-limit.test.ts:148` confirms correct behavior.

## F2: [LOW] `recordRateLimitFailure` generates explicit `nanoid()` but other insert paths rely on `$defaultFn`

- **File:** `src/lib/security/rate-limit.ts:223`
- **Severity:** Low | **Confidence:** MEDIUM
- **Description:** `consumeRateLimitAttemptMulti` (line 181) omits the `id` field on insert, relying on Drizzle's `$defaultFn`. `recordRateLimitFailure` (line 223) explicitly passes `id: nanoid()`. Both work, but the inconsistency is a maintenance hazard.
- **Impact:** No functional impact — both generate unique IDs.
- **Fix:** Remove the explicit `id: nanoid()` from line 223, matching the pattern in `consumeRateLimitAttemptMulti`.

## F3: [MEDIUM] Backup route `body` variable shadows the outer `body` in the `includeFiles` branch

- **File:** `src/app/api/v1/admin/backup/route.ts:39,87`
- **Severity:** Medium | **Confidence:** HIGH
- **Description:** Line 39 declares `let body: { password?: string }` as the parsed request body. Line 87 re-declares `const body = await streamBackupWithFiles(request.signal)` as a ReadableStream, shadowing the outer variable. Currently no runtime bug — the stream is used immediately — but this is a maintenance hazard.
- **Impact:** If someone adds logic after line 87 that references `body` expecting the request body, they would get the stream instead.
- **Fix:** Rename the stream variable on line 87 to `backupStream` or `streamBody`.

## F4: [LOW] `processImage` errors produce generic 500 instead of descriptive 400

- **File:** `src/lib/files/image-processing.ts:25`, `src/app/api/v1/files/route.ts:74`
- **Severity:** Low | **Confidence:** MEDIUM
- **Description:** `sharp(inputBuffer, { failOn: "error" })` throws on invalid images. The file upload route's outer try-catch returns `apiError("internalServerError", 500)`. Users uploading malformed images get a generic 500 instead of a helpful 400.
- **Impact:** Poor UX — user can't tell their image file is malformed.
- **Fix:** Wrap `processImage` in a try-catch and return `apiError("invalidImageFormat", 400)` for sharp errors.

## F5: [MEDIUM] `encryption.ts` `getKey()` re-parses env var on every encrypt/decrypt call

- **File:** `src/lib/security/encryption.ts:23-40`
- **Severity:** Medium | **Confidence:** MEDIUM
- **Description:** `getKey()` calls `process.env.NODE_ENCRYPTION_KEY?.trim()` and `Buffer.from(hex, "hex")` on every invocation. The key never changes at runtime. In high-throughput paths (API key validation, hCaptcha secret), this is called frequently.
- **Impact:** Unnecessary allocation and hex parsing per call. Negligible CPU cost per call but adds up in hot paths.
- **Fix:** Cache the key at module scope (lazy-initialized on first access via a closure or module-level variable).

## F6: [LOW] Community `scopeType: "solution"` thread creation has no solved-problem check

- **File:** `src/app/api/v1/community/threads/route.ts:17-30`
- **Severity:** Low | **Confidence:** MEDIUM
- **Description:** `scopeType: "solution"` is treated the same as `scopeType: "problem"` — only checks that the user can access the problem. There's no verification that the user has actually solved the problem before creating a "solution" thread. The `editorial` scope type correctly requires `community.moderate`.
- **Impact:** A user who hasn't solved a problem could create a "solution" thread, potentially misleading others. Low severity since thread content is moderated.
- **Fix:** Add a check that the user has at least one accepted submission for the problem before allowing `scopeType: "solution"`.

## F7: [LOW] `recruitingInvitations.token` deprecated column still has unique index

- **File:** `src/lib/db/schema.pg.ts:937,961`
- **Severity:** Low | **Confidence:** MEDIUM
- **Description:** The `token` column is marked as "Plaintext token is deprecated" (line 937), but `uniqueIndex("ri_token_idx").on(table.token)` (line 961) still exists. The `tokenHash` column has its own unique index. The deprecated column and index add overhead to inserts with no benefit.
- **Impact:** Minimal — the column is nullable and the index is small. Dead weight.
- **Fix:** In a future migration, drop the `ri_token_idx` unique index and the `token` column.

## F8: [MEDIUM] `waitForReadableStreamDemand` uses 10ms polling — wastes CPU during export backpressure

- **File:** `src/lib/db/export.ts:32-43`
- **Severity:** Medium | **Confidence:** MEDIUM
- **Description:** `waitForReadableStreamDemand` polls `controller.desiredSize` every 10ms when backpressure is active. For large exports with a slow consumer, this could burn CPU for extended periods while holding a REPEATABLE READ transaction open.
- **Impact:** CPU waste during large exports. The long-running transaction also holds snapshot resources.
- **Fix:** Increase the polling interval to 50ms (reduces CPU by 5x with minimal latency impact) or use a more efficient backpressure mechanism.

## F9: [LOW] `validateExport` does not check for duplicate table names

- **File:** `src/lib/db/export.ts:306-311`
- **Severity:** Low | **Confidence:** LOW
- **Description:** The export validation iterates over table entries and checks against `knownTables`, but doesn't detect if the same table name appears twice in the export data.
- **Impact:** Very low — import would likely handle duplicates. Validation gap only.
- **Fix:** Add a `Set` check for duplicate table names during validation.

## F10: [LOW] `bytesToBase64` in proxy.ts uses manual implementation — no comment explaining Edge Runtime need

- **File:** `src/proxy.ts:30-36`
- **Severity:** Low | **Confidence:** LOW
- **Description:** `bytesToBase64` manually converts bytes using `String.fromCharCode` + `btoa` instead of `Buffer.from(bytes).toString('base64')`. This is necessary because the proxy runs in the Edge Runtime where `Buffer` is unavailable, but there's no comment explaining this.
- **Impact:** No runtime issue — works correctly. Documentation gap.
- **Fix:** Add a comment: `// Edge Runtime: Buffer is not available; use btoa instead.`

---

## Verified as Fixed (prior cycle-8 findings)

| Finding | Status | Verified |
|---------|--------|----------|
| F1 (old): LIKE ESCAPE clause in public.ts | FIXED | Lines 69-70 now use `sql` with `ESCAPE '\\'` |
| F2 (old): Audit-logs action LIKE escaping | FIXED | Line 62 now uses `escapeLikePattern` + `ESCAPE '\\'` |
| F3 (old): api-rate-limit.ts column selection | FIXED | Lines 215-218 now select specific columns |
| F4 (old): rate-limit.ts getEntry column selection | FIXED | Lines 79-83 now select specific columns |
| F5 (old): SSE timer .unref() | FIXED | Both cleanup and poll timers have `.unref()` |
| F6 (old): Data retention timer .unref() | FIXED | Both `events.ts:212` and `data-retention-maintenance.ts:106` have `.unref()` |
| F7 (old): Backup Content-Disposition | FIXED | Lines 91,100 now use `contentDispositionAttachment()` |
| F8 (old): Duplicate escape functions | FIXED | `escapePracticeLike` is now a re-export of `escapeLikePattern` |
| F9 (old): cleanup.ts env var discrepancy | Still tracked as D8 in cycle-7b plan | Known deferred item |

---

## Summary Statistics

- Total new findings this cycle: 10
- Critical: 0
- High: 0
- Medium: 3 (F3, F5, F8)
- Low: 6 (F2, F4, F6, F7, F9, F10)
