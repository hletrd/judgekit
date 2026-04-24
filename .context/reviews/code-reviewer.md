# Code Quality Review - Cycle 15

## Summary
Deep code quality review of judgekit. The codebase is well-structured overall with strong TypeScript types, consistent patterns, and thorough error handling. Found several issues ranging from moderate to low severity.

---

## Finding 1: Audit Buffer Data Loss on Process Crash
**File:** `src/lib/audit/events.ts:105-128`
**Severity:** Medium | **Confidence:** High

The audit event buffer (`_auditBuffer`) accumulates events and flushes them in batches (every 5 seconds or 50 events). If the process crashes between flushes, buffered events are lost. While there is a graceful shutdown handler, OOM kills or hard crashes bypass it.

**Concrete scenario:** A Node.js OOM kill or `kill -9` drops all buffered audit events. For a security-critical system, this creates gaps in the audit trail.

**Fix:** Consider write-ahead logging to a temporary file, or reduce the flush interval/buffer size for higher-priority audit events (e.g., auth failures).

---

## Finding 2: In-Memory Rate Limiter TOCTOU Between isRateLimitedInMemory and recordAttemptInMemory
**File:** `src/lib/security/in-memory-rate-limit.ts:51-92`
**Severity:** Low | **Confidence:** Medium

`consumeInMemoryRateLimit` calls `isRateLimitedInMemory` first and then `recordAttemptInMemory` separately. Since these are synchronous operations in a single-threaded Node.js event loop, there is no TOCTOU race in practice. However, the API design is fragile -- a future refactor that adds async operations between the check and record could introduce a race.

**Fix:** Consider a single atomic `checkAndRecord` function that combines both operations, matching the pattern in the DB-backed `consumeRateLimitAttemptMulti`.

---

## Finding 3: recruitingInvitations.token Column Still Exists as Plaintext
**File:** `src/lib/db/schema.pg.ts:940-941`
**Severity:** Low | **Confidence:** High

The `recruitingInvitations` table still has a `token` column (plaintext) alongside `tokenHash`. The schema comment says "Plaintext token is deprecated" and the unique index on `token` is still active. This means if an attacker gains DB read access, they can see unhashed recruiting tokens.

**Fix:** Complete the migration by dropping the `token` column and its unique index, keeping only `tokenHash`.

---

## Finding 4: Audit Event Serialization Truncates JSON String, Not Object
**File:** `src/lib/audit/events.ts:49-59`
**Severity:** Low | **Confidence:** Medium

`serializeDetails` truncates the JSON string at 4000 characters (`JSON.stringify(details).slice(0, MAX_JSON_LENGTH)`). This can produce invalid JSON (cutting in the middle of a string value). Downstream consumers that try to parse this will get a SyntaxError.

**Fix:** Truncate the input object before serialization. Recursively trim string values within the object to stay under the budget, or use a streaming JSON serializer that respects the length limit.

---

## Finding 5: Module-Level Side Effects in authConfig
**File:** `src/lib/auth/config.ts:171-175`
**Severity:** Low | **Confidence:** High

`validateAuthUrl()` and `getValidatedAuthSecret()` are called at module scope (line 171-175). If `AUTH_SECRET` or `AUTH_URL` are misconfigured, the import will throw immediately, potentially preventing the application from starting in edge cases like build time. The build-phase guard in `db/index.ts` handles this for the DB, but auth config has no such guard.

**Fix:** Move validation into the NextAuth config factory or add a build-phase guard similar to `db/index.ts`.
