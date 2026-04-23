# Verifier Review — RPF Cycle 16

**Date:** 2026-04-22
**Reviewer:** verifier
**Base commit:** 9379c26b

## Inventory of Review-Relevant Files

Focus: evidence-based correctness verification against stated behavior. Checking that code does what comments/JSDoc say it does, that edge cases are handled, and that prior fixes are still in place.

## Findings

### V-1: `compiler-client.tsx` unguarded `res.json()` contradicts the documented error-handling convention [MEDIUM/HIGH]

**File:** `src/components/code/compiler-client.tsx:270`
**Confidence:** HIGH

The `apiFetch` module's JSDoc (in `src/lib/api/client.ts:25-28`) explicitly states: "CRITICAL: Always check `response.ok` before calling `response.json()`. Calling `.json()` on a non-JSON body (e.g., 502 HTML from a reverse proxy) throws a SyntaxError that bypasses error-handling logic."

The code at line 270 calls `await res.json()` inside a `try` block that checks `if (!res.ok)`. The outer `try/catch` catches the SyntaxError, but the catch handler produces a generic "Network error" message and discards the `res.statusText` which could have been used as the error message. This is a functional bug: the user gets a less informative error message than intended.

**Concrete failure scenario:**
1. Compiler runner returns a 502 Bad Gateway with HTML body
2. `res.ok` is false, entering the error branch
3. `res.json()` throws SyntaxError on HTML body
4. Outer catch produces "Network error" toast
5. User has no indication that the issue is a 502, not a network problem

**Fix:** Add `.catch(() => ({}))` to the `res.json()` call at line 270.

---

### V-2: `recruiter-candidates-panel.tsx` fallback type mismatch [LOW/MEDIUM]

**File:** `src/components/contest/recruiter-candidates-panel.tsx:54`
**Confidence:** MEDIUM

The code uses `res.json().catch(() => [])` which returns an empty array as fallback. Then `setCandidates(Array.isArray(data) ? data : [])` checks `Array.isArray`. However, the API endpoint returns `{ data: CandidateEntry[] }` (an object with a `data` property), not a bare array. So when the API returns successfully, `data` is `{ data: [...] }`, and `Array.isArray(data)` returns false, causing `setCandidates([])` instead of `setCandidates(data.data)`. But wait — looking more carefully, the response is typed as an array export endpoint: `?format=json` returns a bare array of candidates. So this works correctly when the API succeeds. But the `.catch(() => [])` fallback returns an array, and if the API returns an unexpected shape, `Array.isArray` still guards it. The type annotation is misleading but the runtime behavior is correct.

**Fix:** Low priority. Add a type assertion or use `apiFetchJson` for clarity.

---

### V-3: Previously fixed items verified as still in place

Checked the following from prior cycles:

1. **apiFetchJson helper** (`src/lib/api/client.ts:112-123`): Present and working. Signal option documented in JSDoc.
2. **recruiting-invitations-panel.tsx apiFetchJson adoption** (lines 133-137, 153-157): Present. Uses `apiFetchJson` with signal support.
3. **workers-client.tsx apiFetchJson adoption** (lines 230-233): Present. Uses `apiFetchJson` with `Promise.all`.
4. **Anti-cheat dashboard first-page comparison** (lines 134-143): Present. Skips re-render when first-page data is unchanged.
5. **Metadata remove button aria-label** (line 489): Present with `t("removeField")` i18n key.
6. **Contest-join-client variable shadowing fix**: No longer uses `error` as variable name.

All prior fixes verified.

---

### V-4: `invite-participants.tsx` search does not abort previous requests — race condition [MEDIUM/MEDIUM]

**File:** `src/components/contest/invite-participants.tsx:34-56`
**Confidence:** HIGH

Verified the race condition scenario:
1. User types "jo" — search("jo") fires after 300ms debounce
2. User types "joh" — search("joh") fires after 300ms debounce
3. If search("joh") resolves before search("jo"), results for "joh" are shown
4. Then search("jo") resolves and overwrites with results for "jo" — stale results

This is a confirmed race condition. Compare with `recruiting-invitations-panel.tsx` which properly uses AbortController.

**Fix:** Add AbortController support.

## Final Sweep

- All previously fixed items remain in place
- No regression from cycle 15 fixes
- The `compiler-client.tsx` unguarded `.json()` is the most concrete correctness bug found
