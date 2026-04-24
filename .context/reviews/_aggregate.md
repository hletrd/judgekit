# Aggregate Review — Cycle 17

## Meta
- Reviewers: code-reviewer, security-reviewer, perf-reviewer, architect, test-engineer, debugger, verifier, critic
- Date: 2026-04-24
- Total findings: 17 (deduplicated to 6)

---

## Deduplicated Findings (sorted by severity)

### AGG-1: [MEDIUM] `hcaptchaSecret` Missing from Logger REDACT_PATHS
**Sources:** CR-1, S-1, A-1, D-1, V-1, C-1 | **Confidence:** High
**Cross-agent signal:** 6 of 8 review perspectives

The pino logger's `REDACT_PATHS` array in `src/lib/logger.ts:5-25` does not include `hcaptchaSecret`. The system settings server action (`src/lib/actions/system-settings.ts:91`) and admin API route (`src/app/api/v1/admin/settings/route.ts:44`) both handle the hCaptcha secret in plaintext before encrypting it for storage. If either code path logs the settings object at error level (e.g., during a DB write failure), the encrypted ciphertext — or in a race, the plaintext before encryption — would appear unredacted in the log output.

The inconsistency is clear: `encryptedKey` is in `REDACT_PATHS` but `hcaptchaSecret` is not, despite both being encrypted-at-rest secrets. The systemic risk is that any new secret column must be manually added to `REDACT_PATHS`, and there is no automated test to catch omissions.

**Concrete failure scenario:** Admin saves hCaptcha settings. The DB write fails due to a constraint violation. The error handler logs the full settings object at error level. Pino does not redact `hcaptchaSecret` because it is not in `REDACT_PATHS`. The hCaptcha secret (plaintext or encrypted) is now in the application log.

**Fix:**
1. Add `"hcaptchaSecret"` and `"body.hcaptchaSecret"` to `REDACT_PATHS` in `src/lib/logger.ts`
2. Add a test that validates `REDACT_PATHS` includes entries for all columns in `SANITIZED_COLUMNS` and `ALWAYS_REDACT` from `export.ts`

---

### AGG-2: [LOW] Duplicate Audit Event Pruning Systems
**Sources:** A-2, D-2, V-2 | **Confidence:** High
**Cross-agent signal:** 3 of 8 review perspectives

Two independent systems prune from the `auditEvents` table:
1. `pruneOldAuditEvents()` in `src/lib/audit/events.ts:229-250` — runs on its own 24-hour timer via `startAuditEventPruning()`
2. `pruneSensitiveOperationalData()` in `src/lib/data-retention-maintenance.ts:80-95` — also runs on a 24-hour timer via `startSensitiveDataPruning()` and includes audit event pruning via `batchedDelete`

Both use the same `DATA_RETENTION_DAYS.auditEvents` retention window and the same batched-DELETE pattern. Running both means audit events are pruned twice per day (wasteful but not harmful). The maintenance risk is that if the retention policy changes, both systems must be updated in lockstep.

**Fix:** Consolidate audit event pruning into `pruneSensitiveOperationalData()` in `data-retention-maintenance.ts` (the more comprehensive one that prunes multiple entity types) and remove the duplicate in `events.ts`. Keep `startAuditEventPruning()` as a no-op or remove its audit-event-specific pruning logic.

---

### AGG-3: [LOW] `truncateObject` Double Serialization in Array Branch
**Sources:** CR-3, P-1 | **Confidence:** High
**Cross-agent signal:** 2 of 8 review perspectives

In the array branch of `truncateObject()` (`src/lib/audit/events.ts:66-70`), each item is processed twice:
1. `JSON.stringify(truncateObject(item, remaining - 1))` — for budget check
2. `truncateObject(item, remaining - 1)` — for the actual push

For complex objects, this doubles the CPU cost. The fix is to compute the truncated item once, serialize it for budget, and push the already-computed value.

**Impact:** Low — `truncateObject` is only called during audit event serialization with a 4000-byte budget, so objects are small.

---

### AGG-4: [LOW] No Test for Logger REDACT_PATHS Coverage
**Sources:** T-1, C-4 | **Confidence:** High
**Cross-agent signal:** 2 of 8 review perspectives

There is no automated test that validates the logger's `REDACT_PATHS` array covers all known secret columns in the schema. This is the same systemic gap that existed for `SANITIZED_COLUMNS` (fixed in cycle 16 with AGG-5). If a new secret column is added to the schema, it must be manually added to `REDACT_PATHS`, and there is no test to catch omissions.

**Fix:** Add a test that validates `REDACT_PATHS` includes entries for all columns in `SANITIZED_COLUMNS` and `ALWAYS_REDACT` from `export.ts`, plus known secret fields like `hcaptchaSecret`.

---

### AGG-5: [LOW] Access Code Stored in Plaintext in `assignments` Table
**Sources:** S-2, C-3 | **Confidence:** Medium
**Cross-agent signal:** 2 of 8 review perspectives

The `assignments.accessCode` column stores access codes as plaintext. A DB compromise would expose all active access codes, allowing unauthorized contest entry. Unlike API keys and recruiting tokens (which are hashed), access codes are stored verbatim.

This is a known design tradeoff: access codes need to be displayed to instructors and compared during redemption, making hashing less straightforward. The codes are also short-lived (tied to contest deadlines) and provide limited access (contest participation only, not account takeover). Noted for the record but not requiring immediate action.

---

### AGG-6: [LOW] `sanitizeMarkdown` Has No Unit Test for Control Character Stripping
**Sources:** T-2 | **Confidence:** Medium
**Cross-agent signal:** 1 of 8 review perspectives

The `sanitizeMarkdown` function strips control characters but has no dedicated unit test. While the function is simple, null byte injection can be a security concern in downstream systems.

**Fix:** Add a unit test for `sanitizeMarkdown` that verifies: null bytes are stripped, other control characters are stripped, newlines/tabs/carriage returns are preserved, normal text passes through unchanged.

---

## Deferred Items (by policy — security/correctness findings are NOT deferrable)

All findings above are Medium or Low severity. The Medium finding (AGG-1) should be implemented this cycle. The Low findings can be addressed incrementally.

Carry-forward deferrals from prior cycles: DEFER-61 through DEFER-70 remain unchanged.

## Positive Observations

The codebase continues to demonstrate strong engineering practices:
- All cycle 16 fixes are correctly implemented and verified
- Timing-safe comparison used consistently for all token comparisons
- Atomic SQL with advisory locks prevents TOCTOU races in submissions, recruiting, and access code redemption
- DOMPurify with strict allowlist and `ALLOWED_URI_REGEXP` for HTML sanitization
- AES-256-GCM with auth tags for encryption, HKDF for key derivation
- CSP with nonces, CSRF with Origin + Sec-Fetch-Site + X-Requested-With
- DB server time used consistently across all temporal comparisons
- Comprehensive audit logging with truncation and redaction
- Properly sanitized JSON-in-script-tag for structured data (json-ld.tsx)
- Argon2id password hashing with transparent bcrypt migration

## No Agent Failures

All 8 review agents completed successfully.
