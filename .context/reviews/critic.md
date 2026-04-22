# Critic Review — RPF Cycle 3

**Date:** 2026-04-22
**Reviewer:** critic
**Base commit:** 7b07995f

## Findings

### CRI-1: The `response.json()` before `response.ok` pattern keeps re-appearing — reactive patching is insufficient [MEDIUM/HIGH]

**Description:** This is the third cycle where this pattern is flagged. Cycles 1 and 2 each fixed 1-2 instances. The current review found 8+ remaining instances. The root cause is that there is no shared utility that enforces the correct pattern. Each new component written from scratch will reintroduce the bug until a centralized solution exists.

**Concrete failure scenario:** A developer adds a new API-consuming component. Without a shared helper, they naturally write `const data = await response.json()` then `if (!response.ok) ...` — the same pattern. The cycle of finding and fixing one file at a time never ends.

**Fix:** Add a typed `apiJson<T>(response)` helper to `src/lib/api/client.ts` that checks `response.ok` first and returns a discriminated union.

**Confidence:** HIGH

---

### CRI-2: `discussion-vote-buttons.tsx` silently fails — user expectation violated [MEDIUM/MEDIUM]

**File:** `src/components/discussions/discussion-vote-buttons.tsx:47-49`

**Description:** When a vote fails, the function returns on line 48 with no user feedback whatsoever. The user's click is silently discarded. This violates the basic UX principle of acknowledging user actions. Every other write operation in the codebase shows at least a toast on failure.

**Fix:** Add error feedback (toast) for failed votes.

**Confidence:** HIGH

---

## Final Sweep

The codebase is in good shape overall. The fixes from cycles 1 and 2 were properly implemented. The remaining issues are primarily about systematic consistency rather than individual bugs.
