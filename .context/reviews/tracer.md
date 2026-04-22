# Tracer Review — RPF Cycle 3

**Date:** 2026-04-22
**Reviewer:** tracer
**Base commit:** 7b07995f

## Findings

### TR-1: Causal trace of `response.json()` before `response.ok` — SyntaxError propagates to generic catch, hides real error [MEDIUM/HIGH]

**Trace path:** `problem-submission-form.tsx:handleSubmit` -> `apiFetch` -> server returns 502 with HTML -> `response.json()` throws SyntaxError -> catch block on line 268 -> `toast.error(tCommon("error"))` -> user sees "Error"

**Description:** The SyntaxError from `response.json()` on a non-JSON body bypasses the intended error handling path (lines 247-249 which extract `payload.error`). The user gets a generic error instead of the server's actual error message. In a timed contest, this is the difference between "the submission was rejected because the code is too long" and a meaningless "Error".

**Fix:** Check `response.ok` before calling `.json()`. On error, use `.text()` or `.json().catch()` to extract the error message.

**Confidence:** HIGH

---

### TR-2: `discussion-vote-buttons.tsx` — vote failure silently returns, no error path traced [MEDIUM/MEDIUM]

**Trace path:** `handleVote` -> `apiFetch` -> server returns 403 -> `!response.ok` on line 47 -> `return` on line 48 -> button re-enables, score unchanged, no toast

**Description:** Tracing the failure path shows that when the server rejects a vote, the function returns on line 48 with zero user feedback. The user's click is effectively discarded. There is no toast, no state change, no aria-live announcement.

**Fix:** Add error toast and aria-live announcement for vote failures.

**Confidence:** HIGH

---

## Final Sweep

The `useSubmissionPolling` hook's SSE-to-fetch-polling fallback is well-traced with proper cleanup. The anti-cheat monitor's localStorage persistence and retry logic is correctly traced. The countdown timer's time-sync validation properly prevents NaN propagation. The main tracing concern is the number of code paths where `response.json()` can throw SyntaxError and the error is either silently swallowed or surfaced as a generic message.
