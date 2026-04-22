# Code Quality Review — RPF Cycle 3

**Date:** 2026-04-22
**Reviewer:** code-reviewer
**Base commit:** 7b07995f

## Findings

### CR-1: `problem-submission-form.tsx` calls `response.json()` before `response.ok` check — same class of bug fixed twice already [MEDIUM/HIGH]

**File:** `src/components/problem/problem-submission-form.tsx:183-184,245-247`

**Description:** Both `handleRun` (line 183) and `handleSubmit` (line 245) call `await response.json()` before checking `response.ok`. This is the exact same pattern that was identified and fixed in `contest-clarifications.tsx` and `contest-announcements.tsx` in prior cycles. When the server returns a non-JSON error body (e.g., 502 from a proxy), `response.json()` throws a SyntaxError, which is caught by the generic catch block and surfaces as a generic "error" toast instead of the server's actual error message.

In `handleRun` (line 183): `const payload = await response.json()` is called unconditionally, then `!response.ok` is checked on line 184.
In `handleSubmit` (line 245): same pattern — `const payload = await response.json()` on line 245, then `!response.ok` on line 247.

**Concrete failure scenario:** User submits code while the API server is restarting. The reverse proxy returns a 502 HTML page. `response.json()` throws SyntaxError. The catch block shows a generic error toast. The user has no idea whether their submission was actually created.

**Fix:** Move `response.json()` after the `!response.ok` check. When `!response.ok`, attempt `.json()` inside a `.catch()` to extract error codes.

**Confidence:** HIGH

---

### CR-2: `discussion-vote-buttons.tsx` calls `response.json()` before `response.ok` check — silent failure on error [MEDIUM/MEDIUM]

**File:** `src/components/discussions/discussion-vote-buttons.tsx:41-49`

**Description:** Line 41 calls `const payload = await response.json() as {...}` before checking `!response.ok` on line 47. On error responses, the entire `as {...}` type cast may fail or produce undefined data. Also, when `!response.ok` on line 47, the function silently returns without showing any error feedback to the user.

**Concrete failure scenario:** User clicks upvote. Server returns 403 (not authorized). The JSON parse fails or succeeds on the error body. If it fails, the catch is never reached because there is no try/catch. The function returns silently and the vote button stays in the same state with no feedback.

**Fix:** Check `response.ok` first, parse JSON only on success, and show error feedback on failure.

**Confidence:** HIGH

---

### CR-3: `discussion-post-form.tsx`, `discussion-thread-form.tsx`, `discussion-thread-moderation-controls.tsx` all parse JSON before checking `response.ok` [MEDIUM/MEDIUM]

**Files:**
- `src/components/discussions/discussion-post-form.tsx:43-44`
- `src/components/discussions/discussion-thread-form.tsx:49-50`
- `src/components/discussions/discussion-thread-moderation-controls.tsx:45-46,64-65`

**Description:** All three discussion components follow the same anti-pattern: `const payload = await response.json()` then `if (!response.ok) throw new Error(payload.error || ...)`. While these components at least attempt to use the error body, they will throw an unhandled SyntaxError if the error response body is not valid JSON (e.g., 502 from a proxy).

**Concrete failure scenario:** User posts a discussion reply. The server returns a 502 with HTML. `response.json()` throws SyntaxError, which is caught and shown as raw "SyntaxError" in a toast — not user-friendly.

**Fix:** Wrap `.json()` in `.catch()` for error responses, or use try/catch around the JSON parse step.

**Confidence:** HIGH

---

### CR-4: `edit-group-dialog.tsx` and `assignment-form-dialog.tsx` parse JSON before `response.ok` [MEDIUM/MEDIUM]

**Files:**
- `src/app/(dashboard)/dashboard/groups/edit-group-dialog.tsx:86-88`
- `src/app/(dashboard)/dashboard/groups/[id]/assignment-form-dialog.tsx:271-273`

**Description:** Same `response.json()` before `response.ok` pattern. `edit-group-dialog.tsx` line 86 calls `await response.json()`, then checks `!response.ok` on line 88. `assignment-form-dialog.tsx` line 271 same.

**Concrete failure scenario:** Group edit returns 502 from proxy. JSON parse fails. Generic error shown.

**Fix:** Move JSON parsing after response.ok check.

**Confidence:** HIGH

---

### CR-5: `group-members-manager.tsx` parses JSON before `response.ok` in add/bulk-add handlers [LOW/MEDIUM]

**Files:**
- `src/app/(dashboard)/dashboard/groups/[id]/group-members-manager.tsx:122-124`
- `src/app/(dashboard)/dashboard/groups/[id]/group-members-manager.tsx:177-179`

**Description:** Same pattern — JSON is parsed before `response.ok` check. The delete handler (line 215) correctly uses `.json().catch(() => ({}))`, but the add and bulk-add handlers do not.

**Fix:** Apply the same `.catch()` pattern or restructure.

**Confidence:** HIGH

---

### CR-6: `participant-anti-cheat-timeline.tsx` does not use `useVisibilityPolling` — manual fetch with no polling [LOW/LOW]

**File:** `src/components/contest/participant-anti-cheat-timeline.tsx:128-130`

**Description:** This component uses a plain `useEffect` with `fetchEvents` as the only data fetch — no polling at all. Other contest components (announcements, clarifications, leaderboard) use `useVisibilityPolling` for real-time updates. The anti-cheat timeline data can change during a live contest (new events arrive), but users see stale data until they manually reload.

**Fix:** Add `useVisibilityPolling` with a reasonable interval (e.g., 30s).

**Confidence:** MEDIUM

---

## Final Sweep

All source files in the `src/` directory were examined. The `response.json()` before `response.ok` pattern is the most widespread systematic issue. The fix applied in prior cycles to `contest-clarifications.tsx` and `contest-announcements.tsx` was not applied systematically. There are at least 8 additional files with the same pattern.
