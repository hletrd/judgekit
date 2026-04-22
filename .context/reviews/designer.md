# UI/UX Review — RPF Cycle 3

**Date:** 2026-04-22
**Reviewer:** designer
**Base commit:** 7b07995f

## Findings

### DES-1: `discussion-vote-buttons.tsx` provides no feedback on failed votes — user confused [MEDIUM/MEDIUM]

**File:** `src/components/discussions/discussion-vote-buttons.tsx:47-49`

**Description:** When a vote request fails (network error, 403, 500), the function silently returns. The vote button re-enables with the original score unchanged. The user has no indication that their vote was not counted. This violates WCAG 2.2 SC 4.1.3 (Status Messages) — status messages must be presented to the user through role or attributes.

**Fix:** Show a toast notification on vote failure.

**Confidence:** HIGH

---

### DES-2: `contest-replay.tsx` speed selector uses native `<select>` — inconsistent styling [LOW/LOW]

**File:** `src/components/contest/contest-replay.tsx:177-188`

**Description:** The playback speed selector uses a native `<select>` with `className="h-9 rounded-md border bg-background px-3"` instead of the project's `Select` component. This creates visual inconsistency with every other dropdown in the application, which uses the Radix-based `Select` component. The native `<select>` does not support dark mode theming consistently.

**Fix:** Replace with the project's `Select` component family.

**Confidence:** MEDIUM

---

### DES-3: `participant-anti-cheat-timeline.tsx` does not auto-refresh — stale data during live monitoring [LOW/LOW]

**File:** `src/components/contest/participant-anti-cheat-timeline.tsx:128-130`

**Description:** During a live contest, instructors monitor anti-cheat events. New events arrive but are not shown until the page is manually reloaded. This is inconsistent with all other contest monitoring components (leaderboard, announcements, clarifications) which auto-refresh via `useVisibilityPolling`.

**Fix:** Add `useVisibilityPolling` with a 30-second interval.

**Confidence:** MEDIUM

---

## Final Sweep

The leaderboard table has proper skeleton loading states and responsive design. The anti-cheat dashboard uses appropriate color coding for event types. The replay component has smooth FLIP animations for rank changes. The main gaps are consistency issues (native select, missing polling) rather than fundamental UX problems.
