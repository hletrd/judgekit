# Document Specialist Review — RPF Cycle 13

**Date:** 2026-04-22
**Reviewer:** document-specialist
**Base commit:** 38206415

## Previously Fixed Items (Verified)

- apiFetch JSDoc example: Updated to show i18n-first error pattern (cycle 11)

## Findings

### DOC-1: `apiFetch` JSDoc does not document success-path `.json()` safety pattern [LOW/MEDIUM]

**File:** `src/lib/api/client.ts` (apiFetch JSDoc)

**Description:** The `apiFetch` JSDoc documents the error-path pattern (use `.json().catch(() => ({}))` on error paths) but does not provide guidance for the success path. The codebase has inconsistent success-path handling — some components use `.catch()` and others don't. The JSDoc should document the recommended pattern for both paths.

**Fix:** Update the JSDoc to include a success-path example:
```typescript
// Success path — also use .catch() for resilience:
const { data } = await res.json().catch(() => ({ data: null }));
if (!data) { /* handle parse failure */ }
```

**Confidence:** MEDIUM

---

### DOC-2: `encryption.ts` plaintext fallback is documented but lacks migration guidance [LOW/LOW]

**File:** `src/lib/security/encryption.ts:73-76`

**Description:** The JSDoc for `decrypt()` documents the plaintext fallback: "If the value does not start with `enc:`, it is returned as-is (plaintext fallback for data that was stored before encryption was enabled)." However, there is no documentation about:
1. When the plaintext fallback can be deprecated
2. How to migrate existing plaintext data
3. What security implications the fallback has

This is a documentation gap that makes it harder for future developers to understand the security trade-offs.

**Fix:** Add migration guidance to the JSDoc or create a separate migration document.

**Confidence:** LOW

---

## Final Sweep

The documentation is generally good. The main gap is the lack of success-path `.json()` guidance in the `apiFetch` JSDoc, which contributes to the inconsistent patterns found by the code-reviewer and critic. The encryption module documentation could benefit from migration guidance.
