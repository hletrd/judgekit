# Document Specialist Review — RPF Cycle 48

**Date:** 2026-04-23
**Reviewer:** document-specialist
**Base commit:** 6831c05e

## Findings

### DOC-1: Judge claim route lacks clock-skew comment [LOW/LOW]

**File:** `src/app/api/v1/judge/claim/route.ts:122`

**Description:** The `Date.now()` usage for `claimCreatedAt` has no comment explaining the clock-skew implications. Other locations in the codebase that still use `Date.now()` in DB contexts have been documented with comments explaining why (e.g., `atomicConsumeRateLimit` in `api-rate-limit.ts:55` has no explicit comment either, but the pattern is well-established). Adding a `// TODO(clock-skew)` comment would make it discoverable during future sweeps.

**Fix:** If the issue is fixed (using `getDbNowUncached()`), no comment needed. If deferred, add a `// TODO(clock-skew): use getDbNowUncached() for consistency with other DB-stored timestamps` comment.

---

### DOC-2: SSE route ADR [LOW/LOW] (carry-over)

**Description:** The SSE route was not migrated to `createApiHandler` and lacks an Architectural Decision Record explaining the trade-off.

---

### DOC-3: Docker client dual-path docs [LOW/LOW] (carry-over)

**Description:** The Docker client has dual execution paths (local vs. remote) that are not documented.

## Positive Observations

1. The `getDbNowUncached()` function has clear JSDoc explaining when to use it
2. The rate-limit code has good inline documentation
3. The proxy.ts has detailed comments explaining security constraints
4. The SSE route header comment explains why it wasn't migrated to `createApiHandler`
