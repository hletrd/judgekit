# Aggregate Review - Cycle 15

## Meta
- Reviewers: code-reviewer, security-reviewer, perf-reviewer, architect
- Date: 2026-04-24
- Total findings: 16 (deduplicated to 14)

---

## Deduplicated Findings (sorted by severity)

### AGG-1: [MEDIUM] Plaintext recruitingInvitations.token Column (Data-at-Rest)
**Sources:** CR-3, S-1 | **Confidence:** High

The `recruitingInvitations` table retains both `token` (plaintext) and `tokenHash` columns. The unique index on `token` is still active. A DB compromise exposes all active recruiting tokens in cleartext.

**Fix:** Drop the `token` column and `ri_token_idx` index after confirming no code path reads `token` from the DB.

---

### AGG-2: [MEDIUM] Audit Buffer Data Loss on Process Crash
**Sources:** CR-1 | **Confidence:** High

The audit event buffer accumulates events in memory and flushes every 5s/50 events. Hard process crashes (OOM, kill -9) lose buffered events, creating audit trail gaps.

**Fix:** Reduce flush interval for high-priority events, or add write-ahead logging.

---

### AGG-3: [MEDIUM] In-Memory Rate Limiter FIFO Eviction is O(n log n)
**Sources:** P-1 | **Confidence:** Medium

When over capacity, eviction sorts all entries to find the oldest. This is O(n log n) and allocates on every call that exceeds capacity.

**Fix:** Replace the sorted eviction with simple FIFO eviction from Map's insertion order (O(1)).

---

### AGG-4: [MEDIUM] Dual Rate Limiting Systems Without Unified Interface
**Sources:** A-1 | **Confidence:** Medium

Two independent rate limiting systems (DB-backed and in-memory) with different APIs and key formats make it hard to reason about rate limiting behavior globally.

**Fix:** Create a unified `RateLimiter` interface with pluggable backends.

---

### AGG-5: [MEDIUM] Proxy Mixing Auth, CSP, Locale, and Caching Logic
**Sources:** A-2 | **Confidence:** Medium

The 340-line `proxy` function handles 6 different concerns. Changes to one concern risk breaking others.

**Fix:** Split into composable middleware functions (`withAuth`, `withSecurityHeaders`, `withLocale`, `withCaching`).

---

### AGG-6: [LOW] RUNNER_AUTH_TOKEN Falls Back to JUDGE_AUTH_TOKEN
**Sources:** S-2 | **Confidence:** High

Fallback in `docker/client.ts` violates unique-credentials-per-service principle.

**Fix:** Remove the fallback, require `RUNNER_AUTH_TOKEN` explicitly when `COMPILER_RUNNER_URL` is set.

---

### AGG-7: [LOW] Dev Encryption Key Hardcoded in Source
**Sources:** S-3 | **Confidence:** High

Hardcoded dev encryption key in `encryption.ts` could be used accidentally in non-production.

**Fix:** Generate random dev key on first use and store locally, or require explicit opt-in env var.

---

### AGG-8: [LOW] Legacy secretToken Column in judgeWorkers Schema
**Sources:** S-4 | **Confidence:** Medium

`judgeWorkers.secretToken` column still exists alongside `secretTokenHash`.

**Fix:** Drop `secretToken` column after all workers are migrated.

---

### AGG-9: [LOW] SEC-FETCH-SITE "none" Allowed in CSRF Check
**Sources:** S-5 | **Confidence:** Medium

CSRF check allows `sec-fetch-site: none`, reducing defense-in-depth value.

**Fix:** Remove the exception or document the rationale.

---

### AGG-10: [LOW] Audit Event Serialization Truncates JSON String
**Sources:** CR-4, P-5 | **Confidence:** High

`JSON.stringify(details).slice(0, 4000)` can produce invalid JSON.

**Fix:** Truncate the input object before serialization, not the serialized string.

---

### AGG-11: [LOW] Module-Level Side Effects in authConfig
**Sources:** CR-5 | **Confidence:** High

`validateAuthUrl()` and `getValidatedAuthSecret()` called at module scope with no build-phase guard.

**Fix:** Add build-phase guard or move validation into the NextAuth config factory.

---

### AGG-12: [LOW] In-Memory Rate Limiter TOCTOU Design Fragility
**Sources:** CR-2 | **Confidence:** Medium

`isRateLimitedInMemory` + `recordAttemptInMemory` are separate calls; API could lead to future race conditions.

**Fix:** Create a combined `checkAndRecord` atomic function.

---

### AGG-13: [LOW] Encryption Key Management Spread Across Multiple Files
**Sources:** A-3 | **Confidence:** Medium

Two separate key derivation mechanisms with different env vars.

**Fix:** Consolidate key management, or document why two keys are needed.

---

### AGG-14: [LOW] Auth User Cache Lacks TTL-Based Eviction
**Sources:** P-2 | **Confidence:** Medium

Expired entries only removed on read; cache could fill with stale entries under low traffic.

**Fix:** Add periodic sweep for expired entries.

---

## Deferred Items (by policy -- security/correctness findings are NOT deferrable)

All findings above are Low or Medium severity. No High/Critical findings were discovered this cycle. The Medium findings (AGG-1 through AGG-5) should be scheduled for implementation. The Low findings can be addressed incrementally.

## Positive Observations

The codebase demonstrates strong engineering practices:
- Comprehensive security posture (CSP, CSRF, encryption, sandboxing)
- Well-structured DB schema with proper indexes and constraints
- Consistent error handling and audit logging
- Type-safe database queries via Drizzle ORM
- Proper auth flow with timing-safe comparisons and user enumeration prevention
- Data retention with legal hold support
- Defense-in-depth approach to Docker sandboxing

## No Agent Failures

All review agents completed successfully.
