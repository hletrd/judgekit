# Test Engineer Review — RPF Cycle 3

**Date:** 2026-04-22
**Reviewer:** test-engineer
**Base commit:** 7b07995f

## Findings

### TE-1: No unit tests for `discussion-vote-buttons.tsx` — silent failure mode untested [MEDIUM/MEDIUM]

**File:** `src/components/discussions/discussion-vote-buttons.tsx`

**Description:** The vote buttons component has no unit tests. The silent failure on `!response.ok` (line 47-49) and the lack of try/catch around the API call are exactly the kind of bugs that tests catch. There are also no tests for the optimistic UI update behavior (score state).

**Fix:** Add unit tests covering: successful vote, failed vote (error toast expected), network error, disabled state, concurrent vote prevention.

**Confidence:** HIGH

---

### TE-2: No unit tests for `problem-submission-form.tsx` response handling — SyntaxError on non-JSON error untested [MEDIUM/MEDIUM]

**File:** `src/components/problem/problem-submission-form.tsx`

**Description:** The submission form has no tests for the API response handling in `handleRun` and `handleSubmit`. The SyntaxError path when the server returns non-JSON is completely untested.

**Fix:** Add integration tests for the submission flow with mocked API responses, including non-JSON error responses.

**Confidence:** HIGH

---

### TE-3: `participant-anti-cheat-timeline.tsx` has no polling — test would catch stale data [LOW/LOW]

**File:** `src/components/contest/participant-anti-cheat-timeline.tsx`

**Description:** The lack of polling in this component would be caught by a test that verifies the component re-fetches data when the page becomes visible again. The `useVisibilityPolling` hook is tested, but the component's integration with it is not.

**Fix:** Add tests after migrating to `useVisibilityPolling`.

**Confidence:** LOW

---

## Final Sweep

Test coverage for the core hooks (use-submission-polling, useVisibilityPolling) was flagged as a gap in cycle 2 and deferred. The most impactful new test gaps are in the discussion components and the problem submission form, which are user-facing features with zero test coverage for error handling paths.
