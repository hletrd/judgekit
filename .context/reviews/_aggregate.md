# RPF Cycle 29 — Aggregate Review

**Date:** 2026-04-23
**Base commit:** a51772ae
**Review artifacts:** code-reviewer.md, perf-reviewer.md, security-reviewer.md, architect.md, critic.md, verifier.md, debugger.md, test-engineer.md, tracer.md, designer.md, document-specialist.md

## Previously Fixed Items (Verified in Current Code)

All prior cycle aggregate findings have been addressed:
- AGG-1 (code-editor i18n): Fixed in commit 5c387c7b
- AGG-5 (contest-replay setInterval): Fixed in commit 9cc30d51
- All other prior findings verified as fixed

## Deduped Findings (sorted by severity then signal)

### AGG-1: Hardcoded English answer text in clarification quick-answer buttons — i18n violation + data persistence bug [MEDIUM/HIGH]

**Flagged by:** code-reviewer (CR-1), architect (ARCH-1), critic (CRI-1), verifier (V-1), debugger (DBG-1), tracer (TR-1), designer (DES-1), test-engineer (TE-1)
**Signal strength:** 8 of 11 review perspectives

**Files:**
- `src/components/contest/contest-clarifications.tsx:290` — `handleAnswer(clarification.id, "yes", "Yes")`
- `src/components/contest/contest-clarifications.tsx:293` — `handleAnswer(clarification.id, "no", "No")`
- `src/components/contest/contest-clarifications.tsx:296` — `handleAnswer(clarification.id, "no_comment", "No comment")`

**Description:** The quick-answer buttons pass hardcoded English strings as the answer content to the API. These strings are persisted to the database and shown to all participants regardless of locale. This is worse than the previous code-editor i18n issue because:

1. The strings are persisted to the database (not just displayed at runtime)
2. The `answerType` field already encodes the semantic meaning ("yes", "no", "no_comment"), making the text field redundant display content
3. Korean contest organizers see Korean UI but produce English answers

**Concrete failure scenario:** A Korean contest organizer clicks the Korean-labeled "Yes" button. The answer "Yes" (English) is stored in the database and shown to Korean-speaking participants.

**Fix:** Add i18n keys for the answer content strings under `contests.clarifications` namespace (e.g., `quickYesAnswer`, `quickNoAnswer`, `quickNoCommentAnswer`) and use `t(...)` calls instead of hardcoded strings at lines 290, 293, 296.

---

### AGG-2: Chat widget provider error messages leak API response body to client [MEDIUM/MEDIUM]

**Flagged by:** security-reviewer (SEC-1, SEC-2), verifier (V-2), tracer (TR-2)
**Signal strength:** 4 of 11 review perspectives

**Files:**
- `src/lib/plugins/chat-widget/providers.ts:101` — `throw new Error(`OpenAI API error ${response.status}: ${text}`)`
- `src/lib/plugins/chat-widget/providers.ts:134-135` — same pattern in chatWithTools
- `src/lib/plugins/chat-widget/providers.ts:202` — `throw new Error(`Claude API error ${response.status}: ${text}`)`

**Description:** The provider `stream()` and `chatWithTools()` methods throw errors that include the full API response body (`${text}`). The response body from OpenAI/Claude APIs can contain sensitive information such as account IDs, rate limit details, and internal error messages. If these errors propagate to the client, they leak this information.

**Concrete failure scenario:** An OpenAI API call fails with a 403. The error response includes the organization ID and billing details. This information is included in the thrown Error message and may reach the client browser.

**Fix:** Strip the response body from thrown errors. Only include the status code in the Error message. Log the full response server-side for debugging:
```typescript
throw new Error(`OpenAI API error ${response.status}`);
```

---

### AGG-3: `useVisibilityPolling` uses `setInterval` instead of recursive `setTimeout` [LOW/MEDIUM]

**Flagged by:** perf-reviewer (PERF-1), architect (ARCH-2), critic (CRI-2), debugger (DBG-2)
**Signal strength:** 4 of 11 review perspectives

**File:** `src/hooks/use-visibility-polling.ts:55`

**Description:** The shared polling hook uses `setInterval(tick, intervalMs)`. The codebase has established recursive `setTimeout` as the standard pattern for timer-based effects (contest-replay, countdown-timer, anti-cheat-monitor all migrated). This hook is the exception. While the `visibilitychange` handler mitigates most drift issues, `setInterval` can still cause catch-up behavior during the brief window between interval firing and visibility change handler running.

**Fix:** Migrate to recursive `setTimeout` pattern for consistency and to eliminate the catch-up edge case.

---

### AGG-4: Progress bar in active-timed-assignment sidebar missing `aria-label` [LOW/LOW]

**Flagged by:** designer (DES-2)
**Signal strength:** 1 of 11 review perspectives

**File:** `src/components/layout/active-timed-assignment-sidebar-panel.tsx:172`

**Description:** The progress bar div has `role="progressbar"`, `aria-valuemin`, `aria-valuemax`, and `aria-valuenow`, but lacks an `aria-label` or `aria-labelledby` attribute. Screen reader users hear the percentage value without context about what the progress represents.

**Fix:** Add `aria-label={tNav("progress")}` to the progress bar element.

---

## Performance Findings (carried/deferred)

### PERF-CARRIED-1: contest-replay setInterval — FIXED in commit 9cc30d51
### PERF-CARRIED-2: sidebar interval re-entry — LOW/LOW, deferred from cycle 26
### PERF-CARRIED-3: Unbounded analytics query — carried from DEFER-31
### PERF-CARRIED-4: Scoring full-table scan — carried from DEFER-31

## Security Findings (carried)

### SEC-CARRIED-1: `window.location.origin` for URL construction — covered by DEFER-24
### SEC-CARRIED-2: Encryption plaintext fallback — MEDIUM/MEDIUM, carried from DEFER-39
### SEC-CARRIED-3: `AUTH_CACHE_TTL_MS` has no upper bound — LOW/MEDIUM, carried from DEFER-40
### SEC-CARRIED-4: Anti-cheat localStorage persistence — LOW/LOW, carried from DEFER-48
### SEC-CARRIED-5: `sanitizeHtml` root-relative img src — LOW/LOW, carried from DEFER-49

## Previously Deferred Items (Carried Forward)

All previously deferred items from prior cycle plans remain in effect:
- DEFER-1 through DEFER-13 (from cycle 23)
- DEFER-14 (centralized error handling / useApiFetch hook, from cycle 24)
- DEFER-15 (window.confirm replacement, from cycle 25)
- DEFER-16 (ContestAnnouncements polling, from cycle 25)
- DEFER-17 (Inconsistent createApiHandler, from cycle 27)
- DEFER-18 (Contest layout forced navigation, from cycle 27)
- DEFER-19 (use-source-draft JSON.parse validation, from cycle 27)
- DEFER-20 (Contest clarifications show userId — requires backend change)
- DEFER-21 (Duplicated visibility-aware polling pattern)
- DEFER-29 through DEFER-41 (from April-22 cycle 28 plan)

## Agent Failures

None. All 11 review perspectives completed successfully.
