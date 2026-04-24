# Security Review - Cycle 15

## Summary
Comprehensive security review of the judgekit platform. The codebase demonstrates strong security posture overall: CSP headers, CSRF protection, encrypted secrets, timing-safe comparisons, input validation, and Docker sandboxing. Found a few issues and areas for hardening.

---

## Finding S1: Plaintext recruitingInvitations.token Column (Data-at-Rest)
**File:** `src/lib/db/schema.pg.ts:940-941, 961`
**Severity:** Medium | **Confidence:** High

The `recruitingInvitations` table has both `token` (plaintext, nullable) and `tokenHash` (varchar(64)). The unique index `ri_token_idx` is on the plaintext `token` column. If a database backup or read-only compromise occurs, all active recruiting tokens are exposed in cleartext.

**Concrete scenario:** An SQL injection in a different part of the application (or a compromised DB replica) exposes `recruitingInvitations.token` values. An attacker can use these tokens to impersonate recruiting candidates.

**Fix:** Drop the `token` column and `ri_token_idx` index. The `tokenHash` column and `ri_token_hash_idx` already support all lookup operations. Before dropping, ensure no code path reads `token` from the DB.

---

## Finding S2: RUNNER_AUTH_TOKEN Falls Back to JUDGE_AUTH_TOKEN
**File:** `src/lib/docker/client.ts:8`
**Severity:** Low | **Confidence:** High

`const RUNNER_AUTH_TOKEN = process.env.RUNNER_AUTH_TOKEN || process.env.JUDGE_AUTH_TOKEN || "";`

This fallback means if `RUNNER_AUTH_TOKEN` is not set, the judge auth token is used for the runner endpoint. While both are internal services, this violates the principle of unique credentials per service. A compromise of the runner endpoint would also compromise judge worker authentication.

**Fix:** Remove the fallback. Require `RUNNER_AUTH_TOKEN` explicitly when `COMPILER_RUNNER_URL` is set (already partially enforced in execute.ts lines 58-63, but the fallback in client.ts undermines it).

---

## Finding S3: Dev Encryption Key Hardcoded in Source
**File:** `src/lib/security/encryption.ts:14-17`
**Severity:** Low | **Confidence:** High

The `DEV_ENCRYPTION_KEY` is hardcoded as `000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f`. While only used in development, if someone accidentally runs the app with `NODE_ENV` not set to `production` and `NODE_ENCRYPTION_KEY` unset, all encrypted data uses this known key.

**Fix:** Generate a random dev key on first use and store it in a local file, or require explicit opt-in via an env var like `ALLOW_DEV_ENCRYPTION_KEY=1`.

---

## Finding S4: Legacy Plaintext secretToken Still Present in judgeWorkers Schema
**File:** `src/lib/db/schema.pg.ts:419`
**Severity:** Low | **Confidence:** Medium

`judgeWorkers.secretToken` is still defined in the schema (though `secretTokenHash` is the preferred column). The auth logic in `isJudgeAuthorizedForWorker` (auth.ts:76-81) already rejects workers that have no `secretTokenHash`, logging a migration warning. But the column still exists and could be read if someone adds a query that includes it.

**Fix:** Drop the `secretToken` column from the schema once all workers have been migrated to `secretTokenHash`.

---

## Finding S5: SEC-FETCH-SITE "none" Allowed in CSRF Check
**File:** `src/lib/security/csrf.ts:49-51`
**Severity:** Low | **Confidence:** Medium

The CSRF check allows `sec-fetch-site: none`, which browsers send for top-level navigations (e.g., clicking a link). While the `X-Requested-With: XMLHttpRequest` check prevents cross-origin form submissions, the combination of `sec-fetch-site: none` + `X-Requested-With: XMLHttpRequest` is unusual (browsers don't normally send this header on top-level navigations). This is technically safe but reduces the defense-in-depth value of the sec-fetch-site check.

**Fix:** Consider removing the `sec-fetch-site === "none"` exception, or document why it is needed (likely for compatibility with certain browser extensions or APIs that set X-Requested-With).

---

## Positive Security Observations
- Strong CSP with nonce-based scripts (proxy.ts:192-204)
- Comprehensive Docker sandboxing: --network=none, --cap-drop=ALL, --read-only, --pids-limit, seccomp (execute.ts:332-363)
- Shell command validation with denylist matching Rust worker (execute.ts:159-163)
- Timing-safe token comparisons throughout (timing.ts)
- User enumeration prevention with dummy password hash (config.ts:51-52)
- Proper Argon2id password hashing with rehash on login
- DB-backed rate limiting with exponential backoff
- Anti-cheat user-agent hashing for session binding
- Path traversal protection in file storage (storage.ts:19-26)
- HTML sanitization with DOMPurify and strict allowlists
- Encryption at rest with AES-256-GCM
