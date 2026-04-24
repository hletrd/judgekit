# RPF Cycle 12 Aggregate Review — JudgeKit (Loop 12/100)

**Date:** 2026-04-24
**HEAD commit:** d13c700b (cycle 11 — CR11-1 fix)
**Reviewers:** code-reviewer, security-reviewer, perf-reviewer, architect, critic, debugger, verifier, test-engineer, tracer, document-specialist

## Summary

**2 new findings this cycle.** The CR11-1 fix from cycle 11 is verified correct but introduces a residual risk: `isEncryptedPluginSecret` only checks the prefix, allowing malformed `enc:v1:` values to pass through and cause silent secret loss on read. Additionally, the `decrypt()` function in `encryption.ts` has a plaintext fallback in production that could silently bypass encryption.

### New Findings

| ID | Finding | File+Line | Severity / Confidence | Reviewers Agreeing |
|----|---------|-----------|----------------------|-------------------|
| CR12-1 | `isEncryptedPluginSecret` prefix-only check allows malformed `enc:v1:` values to bypass storage encryption, causing silent secret loss on read | `src/lib/plugins/secrets.ts:10-12, 132-136` | MEDIUM / HIGH | code-reviewer, security-reviewer, critic, debugger, verifier, tracer, test-engineer |
| CR12-2 | `decrypt()` in `encryption.ts` silently returns plaintext in production when value lacks `enc:` prefix — silent encryption bypass | `src/lib/security/encryption.ts:79-88` | MEDIUM / HIGH | code-reviewer, security-reviewer, critic |

### Deferred-This-Cycle Findings

| ID | Finding | File+Line | Severity / Confidence | Reason for Deferral |
|----|---------|-----------|----------------------|-------------------|
| CR12-D1 | `in-memory-rate-limit.ts` FIFO eviction is O(n log n) on overflow | `src/lib/security/in-memory-rate-limit.ts:41-46` | LOW / HIGH | Performance optimization, not a correctness or security issue. In-memory limiter is a fallback path. |
| CR12-D2 | `rate-limit.ts` `getEntry()` uses `FOR UPDATE` for read-only checks | `src/lib/security/rate-limit.ts:83` | LOW / HIGH | Performance optimization, not a correctness issue. The lock is correctly scoped within a transaction. |
| CR12-D3 | SSE connection cleanup linear scan for oldest | `src/app/api/v1/submissions/[id]/events/route.ts:44-55` | LOW / HIGH | Performance optimization. MAX_TRACKED_CONNECTIONS=1000 limits impact. |
| CR12-D4 | `sharedPollTick` no batch-size limit on IN clause | `src/app/api/v1/submissions/[id]/events/route.ts:172-203` | LOW / MEDIUM | Low-severity perf issue. Practical subscriber count is bounded by MAX_GLOBAL_SSE_CONNECTIONS=500. |
| CR12-D5 | `getTrustedAuthHosts()` queries DB on every call without caching | `src/lib/security/env.ts:111-139` | LOW / MEDIUM | Performance optimization. Server action calls are not high-frequency. |
| CR12-D6 | Dual encryption modules (`encryption.ts` and `secrets.ts`) diverge in key derivation and error handling | `src/lib/security/encryption.ts`, `src/lib/plugins/secrets.ts` | LOW / HIGH | Architectural refactor, not a bug. Both modules work correctly for their intended use cases. Consolidation is a future improvement. |
| CR12-D7 | Three rate-limiting modules with overlapping responsibilities | `src/lib/security/rate-limit.ts`, `api-rate-limit.ts`, `in-memory-rate-limit.ts` | LOW / MEDIUM | Architectural smell, not a bug. All three modules work correctly for their intended use cases. |
| CR12-D8 | `atomicConsumeRateLimit` uses `Date.now()` while `checkServerActionRateLimit` uses DB time | `src/lib/security/api-rate-limit.ts:56 vs 223` | LOW / MEDIUM | Clock skew is typically sub-second in well-configured deployments. Not a correctness issue in practice. |
| CR12-D9 | Missing test for `isEncryptedPluginSecret` prefix-only validation gap | `src/lib/plugins/secrets.ts:10-12` | LOW / HIGH | Test gap, not a code bug. Addressed by CR12-1 fix. |
| CR12-D10 | Missing test for `decrypt()` plaintext fallback in production | `src/lib/security/encryption.ts:79-88` | LOW / MEDIUM | Test gap, not a code bug. Addressed by CR12-2 fix. |
| CR12-D11 | SSE connection tracking module lacks unit tests | `src/app/api/v1/submissions/[id]/events/route.ts` | LOW / MEDIUM | Test gap. SSE route is tested via component/integration tests. |
| CR12-D12 | `isEncryptedPluginSecret` lacks JSDoc | `src/lib/plugins/secrets.ts:10-12` | LOW / HIGH | Documentation gap. Addressed by CR12-1 fix. |
| CR12-D13 | `decrypt()` plaintext fallback has no migration deadline or disable mechanism | `src/lib/security/encryption.ts:75-78` | LOW / HIGH | Documentation/policy gap. Addressed by CR12-2 fix. |
| CR12-D14 | `api-rate-limit.ts` lacks TOCTOU documentation for two-tier strategy | `src/lib/security/api-rate-limit.ts` | LOW / MEDIUM | Documentation gap. Sidecar-DB race is inherent to the design and documented in the function comments. |
| CR12-D15 | SSE `onPollResult` async IIFE flow complexity | `src/app/api/v1/submissions/[id]/events/route.ts:397-438` | LOW / LOW | Code quality concern. Multiple `closed` flag guards prevent actual bugs. |
| CR12-D16 | In-memory rate limiter is per-instance, not multi-instance safe | `src/lib/security/in-memory-rate-limit.ts:17` | LOW / MEDIUM | By design — the in-memory limiter is a fallback. Primary rate limiting uses the PostgreSQL-backed module. |

### Cross-Agent Agreement

- **CR12-1**: Flagged by 7 out of 10 reviewers (code-reviewer, security-reviewer, critic, debugger, verifier, tracer, test-engineer). The causal trace from tracer confirms the exact failure path. HIGH signal.
- **CR12-2**: Flagged by 3 out of 10 reviewers (code-reviewer, security-reviewer, critic). The plaintext fallback is a known design choice but has security implications. MEDIUM signal.

### Verified Prior Fixes

All 6 prior fixes from cycles 7-11 remain present and verified:

| ID | Finding | Status | Evidence |
|----|---------|--------|----------|
| F1 | `json_extract()` SQLite function in PostgreSQL path | FIXED | Grep returns no matches |
| F2 | `DELETE ... LIMIT` invalid PostgreSQL syntax | FIXED | All use `ctid IN (SELECT ctid ... LIMIT)` |
| CR9-CR1 | Auth field mapping duplication across 3 locations | FIXED | `mapUserToAuthFields()` centralizes |
| CR9-SR1 | SSE re-auth race — fire-and-forget allows one more event | FIXED | Re-auth awaits before processing |
| CR9-SR3 | Tags route lacks rate limiting | FIXED | Uses `createApiHandler` with `rateLimit: "tags:read"` |
| CR11-1 | `preparePluginConfigForStorage` encryption bypass via `enc:v1:` prefix | FIXED | Checks `isEncryptedPluginSecret` before encrypting |

### Deferred Items Carried Forward

The 21-item deferred registry from cycle 4 is carried forward intact. No additions, no removals, no severity downgrades. The new deferred items (CR12-D1 through CR12-D16) are added this cycle.

## Agent Failures

None. All 10 review agents completed successfully.
