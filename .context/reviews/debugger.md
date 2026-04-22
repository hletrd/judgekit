# Debugger Review — RPF Cycle 3

**Date:** 2026-04-22
**Reviewer:** debugger
**Base commit:** 7b07995f

## Findings

### DBG-1: `problem-submission-form.tsx` handleSubmit: SyntaxError on non-JSON error response causes unhelpful error message [MEDIUM/HIGH]

**File:** `src/components/problem/problem-submission-form.tsx:245-247`

**Description:** When the submit endpoint returns a non-JSON error (e.g., 502 from proxy, or 413 Payload Too Large with plain text), `await response.json()` on line 245 throws a SyntaxError. This is caught by the generic catch on line 268, which shows `tCommon("error")` — a completely generic message. The user has no idea their code was not submitted.

This is the most user-impactful instance of the pattern because code submission is the core action of the application. A failed submission with a generic error is deeply confusing during a timed contest.

**Concrete failure scenario:** During a live contest, the judge worker is overloaded. The submission API returns 503 with a plain text "Service Unavailable" body. The student sees a generic "Error" toast. They may resubmit, thinking it was a network glitch, but the same error occurs. They have no feedback about whether they should wait or try something different.

**Fix:** Check `response.ok` before parsing JSON. On error, try to extract a meaningful error message from the response.

**Confidence:** HIGH

---

### DBG-2: `discussion-vote-buttons.tsx` has no try/catch around API call — unhandled rejection possible [MEDIUM/MEDIUM]

**File:** `src/components/discussions/discussion-vote-buttons.tsx:36-55`

**Description:** The `handleVote` function has no try/catch. If `apiFetch` throws a network error (not just returns a non-ok response), the resulting unhandled promise rejection will be caught by the `finally` block, but the error itself is silently swallowed. The user sees the button re-enable with no feedback.

**Fix:** Wrap the API call in try/catch and show a toast on network errors.

**Confidence:** HIGH

---

## Final Sweep

The `handleRun` function in `problem-submission-form.tsx` also has the same issue as DBG-1 but is slightly less critical since "Run" is not the primary submission path. The anti-cheat monitor's localStorage fallback is well-implemented with retry logic. The countdown timer properly validates time-sync responses with `Number.isFinite`.
