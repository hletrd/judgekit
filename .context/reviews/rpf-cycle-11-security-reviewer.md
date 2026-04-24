# RPF Cycle 11 — Security Reviewer

**Date:** 2026-04-24
**Reviewer:** security-reviewer
**Scope:** OWASP Top 10, secrets, unsafe patterns, auth/authz

## Inventory of Security-Critical Files Reviewed

- `src/lib/security/api-rate-limit.ts` — API and server-action rate limiting
- `src/lib/security/csrf.ts` — CSRF validation (X-Requested-With + Origin)
- `src/lib/security/env.ts` — Auth secret validation
- `src/lib/security/password.ts`, `password-hash.ts` — Password policy and Argon2id
- `src/lib/security/derive-key.ts` — HKDF key derivation
- `src/lib/security/encryption.ts` — AES-256-GCM encryption
- `src/lib/security/timing.ts` — Timing-safe comparison
- `src/lib/security/ip.ts` — IP extraction with proxy hop validation
- `src/lib/security/sanitize-html.ts` — DOMPurify HTML sanitization
- `src/lib/auth/config.ts` — NextAuth credentials provider
- `src/lib/auth/session-security.ts` — Token invalidation
- `src/lib/auth/recruiting-token.ts` — Recruiting token flow
- `src/lib/auth/permissions.ts` — Permission checks
- `src/lib/api/api-key-auth.ts` — API key auth with expiry
- `src/lib/api/handler.ts` — API route middleware
- `src/lib/api/auth.ts` — Session + API key auth
- `src/lib/plugins/secrets.ts` — Plugin config encryption
- `src/lib/assignments/recruiting-invitations.ts` — Atomic token redemption
- `src/lib/judge/auth.ts` — Judge worker auth
- `src/proxy.ts` — Middleware (CSP, HSTS, auth, locale)
- `src/lib/files/storage.ts` — File upload path traversal
- `src/app/api/v1/submissions/[id]/events/route.ts` — SSE auth re-check
- `src/lib/realtime/realtime-coordination.ts` — SSE connection management
- `src/lib/db/queries.ts` — Raw SQL with named parameter binding
- `src/components/seo/json-ld.tsx` — JSON-LD XSS surface
- `src/lib/compiler/execute.ts` — Docker execution

## Findings

### CR11-SR1: `preparePluginConfigForStorage` encryption bypass via crafted prefix

**File:** `src/lib/plugins/secrets.ts`, lines 132-136
**Severity:** LOW
**Confidence:** MEDIUM

If an admin supplies a plugin secret value that starts with `enc:v1:`, the `isEncryptedPluginSecret()` check on line 133 causes the original (unencrypted) value to be stored, bypassing the `encryptPluginSecret()` call on line 132. The encrypted result is computed but discarded.

**Security impact:** The secret value is stored in plaintext in the database instead of being encrypted. This is NOT exploitable by external attackers (admin-only endpoint). The practical impact is a denial-of-use for the plugin when `decryptPluginSecret()` fails on the invalid ciphertext.

**Mitigating factors:**
- Admin-only endpoint; no unauthenticated exploit path
- UI redacts secret fields (`redactPluginConfigForRead` sets them to `""`), so normal form submissions never trigger this
- Decrypt failure is logged and handled gracefully (empty string returned)
- No data exfiltration vector

**Recommendation:** Reorder the check before the encryption call to make the logic clearer and avoid unnecessary crypto work.

## Verified Security Controls

| Control | Status | Evidence |
|---------|--------|----------|
| Timing-safe comparison for tokens | VERIFIED | `safeTokenCompare()` uses HMAC + `timingSafeEqual` for all token checks |
| CSRF protection | VERIFIED | `X-Requested-With` + Origin validation; skipped for API key auth |
| Path traversal | VERIFIED | `resolveStoredPath()` rejects `/`, `\\`, `..` in filenames |
| SQL injection | VERIFIED | All raw SQL uses Drizzle tagged template `sql` or named parameter binding; no string concatenation |
| XSS prevention | VERIFIED | `sanitizeHtml()` uses DOMPurify; `safeJsonForScript()` escapes `</script` and `<!--`; React auto-escapes |
| Session invalidation | VERIFIED | `clearAuthToken()` sets `authenticatedAt=0`; `isTokenInvalidated()` checks against DB |
| Rate limiting | VERIFIED | Two-tier (sidecar + DB) with `SELECT FOR UPDATE` for TOCTOU safety |
| Recruiting token race | VERIFIED | Atomic SQL claim with `NOW()` + `status='pending'` WHERE clause |
| Password hashing | VERIFIED | Argon2id (19 MiB, t=2, p=1) with bcrypt→argon2 migration |
| Encryption | VERIFIED | AES-256-GCM with HKDF-SHA256 key derivation per domain |
| CSP headers | VERIFIED | Strict CSP with nonce; no `unsafe-inline` in production |
| HSTS | VERIFIED | 1-year max-age with includeSubDomains |
| Data retention | VERIFIED | Legal hold support; batched deletion with ctid pagination |
