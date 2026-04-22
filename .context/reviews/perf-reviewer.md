# Performance Review — RPF Cycle 3

**Date:** 2026-04-22
**Reviewer:** perf-reviewer
**Base commit:** 7b07995f

## Findings

### PERF-1: `participant-anti-cheat-timeline.tsx` does not poll — stale data during live contests [MEDIUM/MEDIUM]

**File:** `src/components/contest/participant-anti-cheat-timeline.tsx:128-130`

**Description:** This component fetches anti-cheat events once on mount and never polls for updates. During a live contest, new anti-cheat events arrive continuously, but the instructor must manually reload the page to see them. All other contest components use `useVisibilityPolling`.

**Fix:** Replace the manual `useEffect` with `useVisibilityPolling(() => { void fetchEvents(); }, 30_000)`.

**Confidence:** HIGH

---

### PERF-2: `contest-replay.tsx` speed selector uses native `<select>` — inconsistent with project UI [LOW/LOW]

**File:** `src/components/contest/contest-replay.tsx:177-188`

**Description:** The playback speed selector uses a native `<select>` element with manual Tailwind classes instead of the project's `Select` component. This creates visual inconsistency with the rest of the UI. Same class of issue flagged as AGG-5 in cycle 2 for `contest-clarifications.tsx`.

**Fix:** Replace the native `<select>` with the project's `Select` component.

**Confidence:** LOW

---

## Final Sweep

The `useVisibilityPolling` hook is well-implemented with jitter to prevent thundering herd. The `SubmissionListAutoRefresh` correctly implements exponential backoff. The `initFetchPolling` in `use-submission-polling.ts` properly uses `AbortController` and visibility-based scheduling. No new critical performance issues found.
