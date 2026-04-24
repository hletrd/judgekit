# RPF Cycle 3 — Security Reviewer

**Date:** 2026-04-24
**Scope:** Full repository — OWASP top 10, secrets, unsafe patterns, auth/authz

## Changed-File Review

### `src/lib/judge/sync-language-configs.ts` — SKIP_INSTRUMENTATION_SYNC

**Security assessment of the new flag:**

- Strict-literal `=== "1"` check prevents accidental truthy coercion (e.g., `"true"`, `"yes"`, empty string). **Good.**
- Loud `logger.warn` fires when the flag is active. **Good.**
- The flag only skips the language-config startup sync; it does NOT bypass any auth, rate-limit, or data-access control. **No security boundary crossed.**
- Production `.env.deploy.algo` and `docker-compose.production.yml` do not set this variable. Verified in prior cycles. **Good.**
- Comment explicitly states "DO NOT use this in production." **Good.**

**Verdict:** No security issue with the change.

## Full-Repository Security Sweep

### Authentication & Authorization

1. **Auth handler** (`src/lib/api/auth.ts`): Dual auth path (session cookie + API key) is correctly implemented. Session user lookup validates `isActive` and `tokenInvalidatedAt`. **No issue.**

2. **JWT callback** (`src/lib/auth/config.ts` line 377-388): Refreshes user from DB on every JWT refresh, checks `isActive` and `tokenInvalidatedAt`. **No issue.**

3. **Token invalidation** (`session-security.ts` line 65): Sets `authenticatedAt = 0` instead of deleting, preventing fallback to `iat` which could bypass revocation. **Good fix from prior cycles.**

4. **CSRF protection** (`handler.ts` lines 140-148): Correctly skipped for API-key-authenticated requests (no cookies involved). Mutation methods require CSRF by default. **No issue.**

5. **Capability-based auth** (`handler.ts` lines 129-135): Supports both `requireAllCapabilities: true` (default) and `false` (any). **No issue.**

6. **DUMMY_PASSWORD_HASH** (`config.ts` line 50-51): Pre-computed Argon2id hash for timing-safe comparison when user doesn't exist, preventing user-enumeration via timing. **Good.**

### SQL Injection

Grep for raw SQL templates found only parameterized queries using Drizzle's `sql` tagged template with bound parameters. No string interpolation into SQL. **No injection risk.**

Examples:
- `sql\`lower(${users.username}) = lower(${identifier})\`` — parameterized, safe
- `sql\`DELETE FROM ${table} WHERE ctid IN (...)\`` — parameterized via Drizzle, safe

### XSS

1. **dangerouslySetInnerHTML** — only 2 usages found:
   - `json-ld.tsx` line 21: uses `safeJsonForScript()` sanitizer — safe
   - `problem-description.tsx` line 51: uses `sanitizeHtml()` from DOMPurify — safe

2. No `innerHTML` assignments found. **No XSS risk.**

### Secrets & Credentials

- `process.env` references are all for configuration (DB URL, auth secret, runner URL). No hardcoded secrets.
- `RUNNER_AUTH_TOKEN` validation at module level (execute.ts lines 58-66) throws in production if missing. **Good.**
- `PLUGIN_CONFIG_ENCRYPTION_KEY` used for encryption at rest. **Good.**

### Previously Identified (Carry-Forward)

- **SEC-2 (cycle 43):** Anti-cheat heartbeat dedup uses `Date.now()` for LRU cache — LOW/LOW, deferred
- **SEC-3:** Anti-cheat copies user text content — LOW/LOW, deferred
- **SEC-4:** Docker build error leaks paths — LOW/LOW, deferred

## Summary

**New findings this cycle: 0**

No new security issues. The `SKIP_INSTRUMENTATION_SYNC` flag is production-safe. All prior security findings remain deferred and unchanged.
