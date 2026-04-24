# Security Reviewer — Cycle 6 (Loop 6/100)

**Date:** 2026-04-24
**HEAD commit:** 4ec394c2 (cycle 5 multi-agent review + remediation)

## Methodology

OWASP Top 10 focused review of authentication, authorization, session management, injection vectors, secrets handling, and data protection. All API routes, middleware, and security-critical library modules examined. Cross-file interaction analysis for auth flows, CSRF, rate-limiting, encryption, file storage, and XSS vectors.

## Findings

**No new security findings.** No source code has changed since cycle 5.

### Security Posture Assessment

1. **Authentication**: Argon2id password hashing with OWASP-recommended parameters (19 MiB, t=2, p=1). Bcrypt-to-Argon2id migration with transparent rehashing. JWT session strategy with DB-time `authenticatedAt` (fixed in cycle 5). Token invalidation via `authenticatedAt < tokenInvalidatedAt` comparison. Recruiting tokens use SHA-256 hashed storage (no plaintext in DB).

2. **Authorization**: `createApiHandler` factory centralizes auth/CSRF/rate-limit/validation middleware. Role-based and capability-based authorization supported. API key auth with Bearer token pattern. Proxy-level auth check with 2-second in-process cache (acceptable tradeoff).

3. **CSRF**: Dual-layer CSRF protection — `X-Requested-With: XMLHttpRequest` header check + origin/sec-fetch-site validation. API key requests exempted (no cookies involved). Production host validation for origin checks.

4. **Injection**: All SQL uses parameterized queries via Drizzle ORM. Raw SQL queries use parameterized `@param` syntax via `rawQueryOne`/`rawQueryAll`. HTML uses DOMPurify sanitization. Markdown uses control-character stripping only (safe because react-markdown handles HTML with `skipHtml`). JSON-LD uses `safeJsonForScript` with `</script` escaping.

5. **File storage**: Path traversal protection in `resolveStoredPath` — rejects `..`, `/`, `\` in stored filenames.

6. **Encryption**: AES-256-GCM for sensitive plugin config values. Production enforces `NODE_ENCRYPTION_KEY` env var. Fixed dev-only key with clear warning comments.

7. **Rate limiting**: Two-tier strategy (sidecar + PostgreSQL). Atomic `SELECT FOR UPDATE` transactions prevent TOCTOU. Per-IP and per-username rate limits on login. Server action rate limits keyed on userId + action name.

8. **Secrets**: No secrets hardcoded. Production requires `AUTH_SECRET`, `JUDGE_AUTH_TOKEN`, `RUNNER_AUTH_TOKEN` (when `COMPILER_RUNNER_URL` set). Dummy Argon2 hash used for user-enumeration protection on login.

### Observations (Known Deferred Items)

- **AGG-2**: `atomicConsumeRateLimit` uses `Date.now()` — internally consistent but cross-instance drift risk. LOW/MEDIUM.
- **SEC-2**: Anti-cheat heartbeat LRU cache uses `Date.now()` — client-side dedup only, not security-critical. LOW/LOW.
- **SEC-3**: Anti-cheat copies user text content — design tradeoff, not a vulnerability. LOW/LOW.
- **SEC-4**: Docker build error leaks paths — build-time only, not runtime. LOW/LOW.

## Verified Prior Fixes

All security fixes from prior cycles remain intact:
- DB-time usage in transaction-critical paths (JWT, judge claim, recruiting token, server actions, realtime coordination, anti-cheat)
- Token-invalidation bypass fix (authenticatedAt=0 in clearAuthToken)
- Path-traversal protection in file storage
- User-enumeration protection via dummy hash
- API key auth bypass prevention in proxy
