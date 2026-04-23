# Test Engineer Review — RPF Cycle 16

**Date:** 2026-04-22
**Reviewer:** test-engineer
**Base commit:** 9379c26b

## Inventory of Review-Relevant Files

Focus: test coverage gaps, untested edge cases, test quality, and TDD opportunities. Reviewed all test files under `tests/` and compared against source files under `src/`.

## Findings

### TE-1: No unit tests for `compiler-client.tsx` — unguarded `.json()` not covered [MEDIUM/MEDIUM]

**File:** `src/components/code/compiler-client.tsx`
**Confidence:** HIGH

The compiler client has no unit tests. The unguarded `res.json()` at line 270 is a concrete bug that would be caught by a test that sends a 502 response with an HTML body. The lack of tests means this bug has persisted through multiple review cycles.

**Fix:** Add unit tests for the compiler client, including:
- Successful compilation response
- Server error (5xx) with JSON body
- Server error (5xx) with non-JSON body (this would reveal the bug)
- Network error (abort, timeout)
- Multiple concurrent runs (race condition testing)

---

### TE-2: No unit tests for `invite-participants.tsx` — race condition not covered [MEDIUM/MEDIUM]

**File:** `src/components/contest/invite-participants.tsx`
**Confidence:** HIGH

The search race condition (also flagged by perf-reviewer PERF-1, critic CRI-3, verifier V-4) would be easily caught by a test that fires two search requests in rapid succession and verifies that the results match the last query.

**Fix:** Add unit tests covering:
- Successful search with results
- Empty search results
- Debounce behavior
- Race condition: last query wins
- Invite success/failure

---

### TE-3: No unit tests for `recruiter-candidates-panel.tsx` [LOW/MEDIUM]

**File:** `src/components/contest/recruiter-candidates-panel.tsx`
**Confidence:** MEDIUM

No tests for this component. The sorting, filtering, and CSV download functionality are untested.

**Fix:** Add unit tests for sort behavior, search filter, and CSV download URL construction.

---

### TE-4: No unit tests for `access-code-manager.tsx` [LOW/MEDIUM]

**File:** `src/components/contest/access-code-manager.tsx`
**Confidence:** MEDIUM

No tests for this component. The generate, copy, and revoke flows are untested.

**Fix:** Add unit tests for the access code lifecycle.

---

### TE-5: `apiFetchJson` helper still untested — carried from TE-4 (cycle 14) [LOW/MEDIUM]

**File:** `src/lib/api/client.ts:112-123`
**Confidence:** MEDIUM

The `apiFetchJson` helper has no direct unit tests. It is tested indirectly by the components that use it, but the edge cases (non-JSON body, 401 response, network error) are not directly covered.

**Fix:** Already tracked as DEFER-56. Add direct unit tests when a dedicated test coverage improvement cycle is scheduled.

---

### TE-6: Encryption module still untested — carried from TE-3 (cycle 11) [MEDIUM/HIGH]

**File:** `src/lib/security/encryption.ts`
**Confidence:** HIGH

Already tracked as DEFER-50. The encryption module has no direct unit tests. The plaintext fallback behavior, key validation, and round-trip correctness are all untested.

**Fix:** Add unit tests for encrypt/decrypt round-trip, plaintext fallback, invalid key, and dev key behavior.

## Previously Deferred (Carried Forward)

- DEFER-50: Encryption module unit tests (from TE-3)
- DEFER-51: Unit tests for create-problem-form.tsx (from TE-4)
- DEFER-52: Unit tests for problem-export-button.tsx (from TE-5)
- DEFER-56: Unit tests for apiFetchJson helper (from TE-4)
- DEFER-57: Unit tests for recruiting-invitations-panel.tsx (from TE-5)
- TE-1 (cycle 14): No unit tests for workers-client.tsx
- TE-2 (cycle 14): No unit tests for chat-logs-client.tsx
