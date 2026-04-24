# RPF Cycle 11 — Code Reviewer

**Date:** 2026-04-24
**Reviewer:** code-reviewer
**Scope:** Full codebase — logic, maintainability, SOLID, cross-file interactions

## Inventory of Files Reviewed

- `src/lib/security/api-rate-limit.ts` — Rate limiting (API + server actions)
- `src/lib/auth/index.ts`, `config.ts`, `permissions.ts` — Auth system
- `src/lib/security/csrf.ts`, `env.ts`, `password.ts`, `password-hash.ts`, `timing.ts`, `ip.ts` — Security primitives
- `src/lib/security/derive-key.ts`, `encryption.ts` — Encryption infrastructure
- `src/lib/security/sanitize-html.ts` — HTML/Markdown sanitization
- `src/lib/api/handler.ts`, `auth.ts`, `api-key-auth.ts` — API framework
- `src/lib/plugins/secrets.ts`, `registry.ts` — Plugin system
- `src/lib/assignments/recruiting-invitations.ts` — Recruiting token flow
- `src/lib/auth/recruiting-token.ts` — Recruiting token auth
- `src/lib/auth/session-security.ts` — Session invalidation
- `src/lib/realtime/realtime-coordination.ts` — SSE coordination
- `src/app/api/v1/submissions/[id]/events/route.ts` — SSE events
- `src/app/api/v1/contests/[assignmentId]/anti-cheat/route.ts` — Anti-cheat
- `src/proxy.ts` — Middleware (CSP, auth, locale)
- `src/lib/db/schema.pg.ts`, `queries.ts`, `index.ts`, `export.ts`, `cleanup.ts` — DB layer
- `src/lib/data-retention.ts`, `data-retention-maintenance.ts` — Data lifecycle
- `src/lib/compiler/execute.ts` — Docker execution
- `src/lib/judge/auth.ts` — Judge auth
- `src/lib/files/storage.ts` — File I/O
- `src/lib/submissions/visibility.ts` — Submission sanitization
- `src/lib/recruiting/access.ts` — Recruiting access
- `src/lib/db-time.ts` — DB time primitives
- `src/components/seo/json-ld.tsx` — JSON-LD XSS surface
- `src/lib/anti-cheat/review-model.ts` — Anti-cheat tiers

## Findings

### CR11-CR1: `preparePluginConfigForStorage` encryption bypass via crafted `enc:v1:` prefix

**File:** `src/lib/plugins/secrets.ts`, lines 132-136
**Severity:** LOW
**Confidence:** MEDIUM

```typescript
const encrypted = encryptPluginSecret(incomingValue);
prepared[key] = isEncryptedPluginSecret(incomingValue)
  ? incomingValue
  : (encrypted ?? incomingValue);
```

The function encrypts the value first (line 132), then checks whether the *original* `incomingValue` starts with the `enc:v1:` prefix (line 133). If it does, the original (unencrypted) value is kept instead of the newly encrypted one. The intent is to prevent double-encryption when an already-encrypted value is round-tripped.

However, if an admin or API caller submits a value that starts with `enc:v1:` but is NOT valid ciphertext, the value bypasses encryption and is stored as plaintext in the database. When `decryptPluginSecret()` later processes this row, it will fail (invalid IV/tag/ciphertext), causing the plugin to malfunction.

**Failure scenario:** Admin enters `enc:v1:not-real-ciphertext` in a plugin secret config field. The value is stored without encryption. Later, `decryptPluginSecret()` tries to parse it, fails the GCM authentication check, and throws. The plugin becomes unusable until the secret is re-entered.

**Mitigating factors:**
- Plugin configuration is admin-only
- `redactPluginConfigForRead` clears secret fields to `""` before sending to the UI, so normal round-trips never produce `enc:v1:` prefixed input
- No data exfiltration — only a denial-of-use for the specific plugin config key
- The decrypt failure is caught and logged, not silently swallowed

**Fix:** Check `isEncryptedPluginSecret(incomingValue)` *before* encrypting, and skip the encryption call entirely for already-encrypted values. This avoids the unnecessary encryption work and makes the intent clearer:

```typescript
if (isEncryptedPluginSecret(incomingValue)) {
  prepared[key] = incomingValue;
} else {
  const encrypted = encryptPluginSecret(incomingValue);
  prepared[key] = encrypted ?? incomingValue;
}
```

This preserves the double-encryption guard while ensuring that the encrypt call is only made when truly needed.

## No Other New Findings

The codebase is mature and well-hardened after 10 previous review cycles. All critical paths exhibit:

- Consistent use of DB server time (`getDbNowUncached()`) for temporal comparisons in auth/rate-limiting/assignment flows
- Proper timing-safe comparison (`safeTokenCompare`) for all token validation
- Atomic SQL claims with `NOW()` for TOCTOU-safe recruiting token redemption
- Proper path traversal protection in `resolveStoredPath()`
- Well-structured `createApiHandler` wrapper ensuring auth, CSRF, and rate limiting on all API routes
- Argon2id password hashing with bcrypt migration path
- HKDF key derivation for encryption with legacy key fallback

The 21-item deferred registry from cycle 4 is accurately carried forward. No code changes have been made since the last cycle.
