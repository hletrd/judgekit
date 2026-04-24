# RPF Cycle 1 (loop cycle 1/100) — Security Reviewer

**Date:** 2026-04-24
**HEAD:** 8af86fab
**Reviewer:** security-reviewer

## Scope

Reviewed security-critical code across:
- `src/lib/security/csrf.ts` — CSRF validation (X-Requested-With, Sec-Fetch-Site, origin check)
- `src/lib/security/rate-limit.ts` — DB-backed rate limiting, atomic check+increment
- `src/lib/security/sanitize-html.ts` — DOMPurify sanitization
- `src/lib/security/api-rate-limit.ts` — API rate limiting
- `src/lib/security/derive-key.ts` — plugin config encryption key derivation
- `src/lib/security/ip.ts` — client IP extraction with proxy hop handling
- `src/lib/security/password.ts` — password hashing (argon2)
- `src/lib/security/in-memory-rate-limit.ts` — in-memory rate limiter
- `src/lib/api/handler.ts` — createApiHandler factory (auth, CSRF, rate limit, validation)
- `src/lib/auth/index.ts` — NextAuth + DrizzleAdapter
- `src/lib/auth/config.ts` — auth configuration, session management
- `src/components/seo/json-ld.tsx` — JSON-LD with `dangerouslySetInnerHTML`
- `src/components/problem-description.tsx` — problem description with `dangerouslySetInnerHTML`
- `src/lib/compiler/execute.ts` — Docker container execution (no eval/exec injection)
- `src/lib/docker/client.ts` — Docker CLI wrapper (execFile, not exec)
- All `process.env` reads — no secrets leaked to client
- All `dangerouslySetInnerHTML` usage — both sanitized
- `eslint-disable` / `@ts-ignore` usage — only 1 legitimate disable

## New Findings

**No new findings this cycle.**

## Security Assessment

1. **CSRF** — Multi-layered protection: `X-Requested-With: XMLHttpRequest` header, `Sec-Fetch-Site` validation, origin/host verification. API key auth correctly bypasses CSRF (no cookies). Well-designed.
2. **XSS** — Both `dangerouslySetInnerHTML` uses are sanitized: `json-ld.tsx` uses `safeJsonForScript()`, `problem-description.tsx` uses `sanitizeHtml()` which applies DOMPurify with narrow allowlist, `ALLOW_DATA_ATTR: false`, URI regex restricting to https/mailto/root-relative, and a hook that adds `rel=noopener noreferrer` and strips non-root-relative image sources.
3. **Rate limiting** — Proper use of `FOR UPDATE` row locks. `consumeRateLimitAttemptMulti` closes the TOCTOU race. Exponential backoff for block duration. The `Date.now()` usage is the known deferred item (AGG-2, MEDIUM/MEDIUM).
4. **Password hashing** — Uses argon2 (not bcrypt) for new passwords. The `FIXED_MIN_PASSWORD_LENGTH = 8` constraint is correctly enforced.
5. **Docker execution** — `execFile` (not `exec`) used in `docker/client.ts`. Arguments passed as array, not shell-interpolated. No command injection vector.
6. **Plugin encryption** — `derive-key.ts` reads `PLUGIN_CONFIG_ENCRYPTION_KEY` from env. Key derivation uses proper crypto primitives. No keys hardcoded.
7. **IP extraction** — `TRUSTED_PROXY_HOPS` env var controls how many `X-Forwarded-For` entries to trust. Production mode refuses to return a fallback IP when no forwarded-for header is present.

## Deferred Item Status (Unchanged)

- **AGG-2:** `atomicConsumeRateLimit` uses `Date.now()` — MEDIUM/MEDIUM, deferred
- **SEC-2:** Anti-cheat heartbeat dedup uses `Date.now()` for LRU cache — LOW/LOW, deferred
- **SEC-3:** Anti-cheat copies user text content — LOW/LOW, deferred
- **SEC-4:** Docker build error leaks paths — LOW/LOW, deferred

## Confidence

HIGH — no new security regressions. CSRF, XSS, injection, and auth patterns are solid.
