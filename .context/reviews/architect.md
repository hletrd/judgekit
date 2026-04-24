# Architecture Review - Cycle 15

## Summary
Architectural review of the judgekit platform. The codebase follows solid Next.js App Router conventions with clear separation of concerns. Found several architectural observations.

---

## Finding A1: Dual Rate Limiting Systems (In-Memory + DB) Without Unified Interface
**Files:** `src/lib/security/in-memory-rate-limit.ts`, `src/lib/security/rate-limit.ts`, `src/lib/security/api-rate-limit.ts`
**Severity:** Medium | **Confidence:** Medium

The codebase has two independent rate limiting systems:
1. **DB-backed** (`rate-limit.ts`): PostgreSQL-backed, used for login auth
2. **In-memory** (`in-memory-rate-limit.ts`): Map-based, used for API rate limiting

They have different APIs, different eviction strategies, and different key formats. This creates confusion about which rate limiter to use where and makes it harder to reason about rate limiting behavior globally.

**Fix:** Create a unified `RateLimiter` interface with pluggable backends (in-memory for dev/fast paths, DB for persistent/critical paths). This would also make it easier to add a Redis backend later.

---

## Finding A2: Proxy (middleware.ts) Mixing Auth, CSP, Locale, and Caching Logic
**File:** `src/proxy.ts`
**Severity:** Medium | **Confidence:** Medium

The `proxy` function (Next.js middleware) handles:
1. Authentication and session validation
2. CSP header generation
3. Locale resolution and cookie setting
4. API response caching headers
5. User-agent mismatch auditing
6. HSTS header management

This is a single 340-line function with mixed concerns. While it works, any change to one concern (e.g., CSP) requires careful review to avoid breaking auth or locale logic.

**Fix:** Split into composable middleware functions: `withAuth`, `withSecurityHeaders`, `withLocale`, `withCaching`. The main `proxy` function would chain them. This also makes each piece independently testable.

---

## Finding A3: Encryption Key Management Spread Across Multiple Files
**Files:** `src/lib/security/encryption.ts`, `src/lib/security/derive-key.ts`
**Severity:** Low | **Confidence:** Medium

Two separate encryption key derivation mechanisms exist:
1. `encryption.ts`: Uses `NODE_ENCRYPTION_KEY` directly (or dev key) for AES-256-GCM
2. `derive-key.ts`: Uses HKDF from `PLUGIN_CONFIG_ENCRYPTION_KEY` for domain-separated keys

They read from different env vars and use different derivation strategies. If both are needed (which they are -- one for general encryption, one for plugin secrets), they should share a common key management module to avoid confusion.

**Fix:** Consolidate into a single key management module that reads from a single env var (or clearly documents why two separate keys are needed) and provides domain-separated derivation via HKDF for all use cases.

---

## Finding A4: Schema Exports Through Re-export Barrel
**File:** `src/lib/db/schema.ts`
**Severity:** Low | **Confidence:** Low

`schema.ts` re-exports everything from `schema.pg.ts`. This is fine now but could become a maintenance issue. The barrel file is now an unnecessary indirection.

**Fix:** Rename `schema.pg.ts` to `schema.ts` directly, or at minimum add a comment explaining why the indirection is kept (presumably for backwards compatibility with imports).
