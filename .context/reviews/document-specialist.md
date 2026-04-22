# Document Specialist Review — RPF Cycle 3

**Date:** 2026-04-22
**Reviewer:** document-specialist
**Base commit:** 7b07995f

## Findings

### DOC-1: `src/lib/api/client.ts` error handling convention table is incomplete — does not mention the `response.ok` before `.json()` pattern [LOW/LOW]

**File:** `src/lib/api/client.ts:9-24`

**Description:** The JSDoc comment in `apiFetch` documents error handling conventions but does not mention the critical pattern of checking `response.ok` before calling `response.json()`. Since this is the most common bug pattern in the codebase (8+ instances), it should be documented as a required pattern.

**Fix:** Add a row to the convention table: "Non-JSON error response | Check `response.ok` before calling `.json()`; use `.json().catch(() => ({}))` on error responses".

**Confidence:** MEDIUM

---

### DOC-2: `useVisibilityPolling` JSDoc does not mention that callback should handle errors internally [LOW/LOW]

**File:** `src/hooks/use-visibility-polling.ts:6-13`

**Description:** The JSDoc for `useVisibilityPolling` does not document the expectation that the callback function should handle its own errors (try/catch with toast). Without this documentation, developers may assume the hook handles errors, leading to unhandled rejections.

**Fix:** Add a note: "The callback must handle its own errors. The hook does not catch errors thrown by the callback."

**Confidence:** LOW

---

## Final Sweep

The codebase documentation is generally good. API routes have proper JSDoc. The auth config is well-documented with inline comments explaining security decisions. The main gap is the missing pattern documentation in `apiFetch` that could prevent the recurring `response.json()` anti-pattern.
