# RPF Cycle 3 — Aggregate Review

**Date:** 2026-04-22
**Base commit:** 7b07995f
**Review artifacts:** code-reviewer.md, perf-reviewer.md, security-reviewer.md, architect.md, critic.md, verifier.md, debugger.md, test-engineer.md, tracer.md, designer.md, document-specialist.md

## Previously Fixed Items (Verified in Current Code)

All cycle 1 aggregate findings (AGG-1 through AGG-14) and cycle 2 aggregate findings (AGG-1 through AGG-11) have been addressed. Verified by verifier (V-1).

## Deduped Findings (sorted by severity then signal)

### AGG-1: Systematic `response.json()` before `response.ok` anti-pattern across 8+ files — needs systematic fix [MEDIUM/HIGH]

**Flagged by:** code-reviewer (CR-1 through CR-5), security-reviewer (SEC-1 implicit), architect (ARCH-1), critic (CRI-1), debugger (DBG-1, DBG-2), tracer (TR-1, TR-2), verifier (V-2, V-3), test-engineer (TE-1, TE-2)
**Signal strength:** 9 of 11 review perspectives

**Files:**
- `src/components/problem/problem-submission-form.tsx:183,245`
- `src/components/discussions/discussion-vote-buttons.tsx:41`
- `src/components/discussions/discussion-post-form.tsx:43`
- `src/components/discussions/discussion-thread-form.tsx:49`
- `src/components/discussions/discussion-thread-moderation-controls.tsx:45,64`
- `src/app/(dashboard)/dashboard/groups/edit-group-dialog.tsx:86`
- `src/app/(dashboard)/dashboard/groups/[id]/assignment-form-dialog.tsx:271`
- `src/app/(dashboard)/dashboard/groups/[id]/group-members-manager.tsx:122,177`

**Description:** This is the third cycle where this pattern is flagged. Cycles 1 and 2 each fixed 1-2 instances (contest-clarifications.tsx, contest-announcements.tsx). The current review found 8+ remaining instances. The root cause is that there is no shared utility that enforces the correct pattern. When `response.json()` is called on a non-JSON body (e.g., 502 HTML from proxy), it throws SyntaxError which is either caught by a generic catch (showing a useless "Error" toast) or silently swallowed.

This is most critical in `problem-submission-form.tsx` where a failed submission during a live contest shows a generic error, and in `discussion-vote-buttons.tsx` where vote failures are completely silent.

**Concrete failure scenario:** Student submits code during a live contest. The API returns 502 with HTML from a reverse proxy. `response.json()` throws SyntaxError. The generic catch shows "Error". The student does not know whether their code was actually submitted.

**Fix:**
1. Add an `apiJson<T>(response)` helper to `src/lib/api/client.ts` that checks `response.ok` first
2. Migrate the 8+ affected files to use the helper
3. For `discussion-vote-buttons.tsx`, also add try/catch and error feedback

---

### AGG-2: `discussion-vote-buttons.tsx` silently swallows vote failures — no error feedback [MEDIUM/MEDIUM]

**Flagged by:** code-reviewer (CR-2), security-reviewer (SEC-1), critic (CRI-2), debugger (DBG-2), tracer (TR-2), verifier (V-3), designer (DES-1)
**Signal strength:** 7 of 11 review perspectives

**Files:** `src/components/discussions/discussion-vote-buttons.tsx:47-49`

**Description:** When the vote API returns `!response.ok`, the function silently returns on line 48 with no user feedback. The user's click is effectively discarded. This violates the repo's own error handling convention documented in `src/lib/api/client.ts` ("Never silently swallow errors — always surface them to the user"). Also has no try/catch around the API call, so network errors cause unhandled promise rejections.

**Concrete failure scenario:** User clicks upvote. Server returns 403. No toast, no error message. The user believes their vote was counted.

**Fix:** Add try/catch, check `response.ok` before `.json()`, and show error toast on failure.

---

### AGG-3: `participant-anti-cheat-timeline.tsx` does not use `useVisibilityPolling` — stale data during live contests [MEDIUM/MEDIUM]

**Flagged by:** code-reviewer (CR-6), perf-reviewer (PERF-1), designer (DES-3)
**Signal strength:** 3 of 11 review perspectives

**Files:** `src/components/contest/participant-anti-cheat-timeline.tsx:128-130`

**Description:** This component fetches anti-cheat events once on mount and never polls. All other contest monitoring components (leaderboard, announcements, clarifications) use `useVisibilityPolling`. During a live contest, new anti-cheat events arrive continuously, but instructors see stale data.

**Fix:** Add `useVisibilityPolling(() => { void fetchEvents(); }, 30_000)`.

---

### AGG-4: `contest-replay.tsx` uses native `<select>` instead of project's `Select` component [LOW/LOW]

**Flagged by:** perf-reviewer (PERF-2), architect (ARCH-2), designer (DES-2)
**Signal strength:** 3 of 11 review perspectives

**Files:** `src/components/contest/contest-replay.tsx:177-188`

**Description:** The playback speed selector uses a native `<select>` instead of the project's `Select` component. Same class of issue fixed in `contest-clarifications.tsx` in cycle 2.

**Fix:** Replace with the project's `Select` component family.

---

### AGG-5: `apiFetch` JSDoc missing `response.ok` before `.json()` pattern documentation [LOW/LOW]

**Flagged by:** document-specialist (DOC-1)
**Signal strength:** 1 of 11 review perspectives

**Files:** `src/lib/api/client.ts:9-24`

**Description:** The error handling convention table in `apiFetch`'s JSDoc does not mention the critical pattern of checking `response.ok` before calling `response.json()`. Since this is the most common bug pattern, it should be documented.

**Fix:** Add a row to the convention table.

---

## Previously Deferred Items (Carried Forward)

From prior cycles:
- DEFER-1: Migrate raw route handlers to `createApiHandler` (22 routes)
- DEFER-2: SSE connection tracking eviction optimization
- DEFER-3: SSE connection cleanup test coverage
- D1: JWT authenticatedAt clock skew with DB tokenInvalidatedAt (MEDIUM)
- D2: JWT callback DB query on every request — add TTL cache (MEDIUM)
- A19: `new Date()` clock skew risk in remaining routes (LOW)
- DEFER-20: Contest clarifications show raw userId instead of username
- DEFER-21: Duplicated visibility-aware polling pattern (partially addressed)
- DEFER-22: copyToClipboard dynamic import inconsistency
- DEFER-23: Practice page Path B progress filter
- DEFER-24: Invitation URL uses window.location.origin (SEC-2 also flagged access-code-manager and workers-client)
- DEFER-25: Duplicate formatTimestamp utility
- DEFER-1 (cycle 1): Add unit tests for useVisibilityPolling, SubmissionListAutoRefresh, and stats endpoint
- DEFER-2 (cycle 1): Standardize error handling pattern in useVisibilityPolling

## Agent Failures

None. All 11 review perspectives completed successfully.
