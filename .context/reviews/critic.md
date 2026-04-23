# Critic Review — RPF Cycle 29

**Date:** 2026-04-23
**Reviewer:** critic
**Base commit:** a51772ae

## Previously Fixed Items (Verified)

- Code editor i18n: Fixed (commit 5c387c7b)
- Contest replay setInterval: Fixed (commit 9cc30d51)
- All prior cycle findings verified as fixed

## CRI-1: Clarification quick-answer buttons embed locale-specific text into shared data [MEDIUM/HIGH]

**File:** `src/components/contest/contest-clarifications.tsx:290-296`

This is the most significant finding this cycle. The quick-answer buttons pass hardcoded English text ("Yes", "No", "No comment") as the answer content to the API. This text is stored in the database and shown to all participants regardless of their locale.

From a multi-perspective critique:

1. **i18n perspective:** The codebase is consistent in using i18n for all user-facing strings. These 3 strings break that consistency.
2. **Data integrity perspective:** The `answerType` field already encodes the semantic meaning. The `answer` text field is redundant for quick answers and should contain localized display text.
3. **UX perspective:** Korean contest organizers see Korean UI but produce English answer text that is shown to Korean participants.
4. **Consistency perspective:** The i18n keys `quickYes`, `quickNo`, `quickNoComment` exist for the *button labels* but not for the *answer content*.

**Fix:** Add i18n keys for the answer content strings and use them instead of hardcoded English.

---

## CRI-2: `useVisibilityPolling` inconsistency with established timer patterns [LOW/LOW]

**File:** `src/hooks/use-visibility-polling.ts:55`

The codebase has converged on recursive `setTimeout` as the standard pattern for timer-based effects. The shared `useVisibilityPolling` hook still uses `setInterval`. This is a minor architectural inconsistency but functionally safe.

**Fix:** Migrate to recursive `setTimeout` for consistency.

---

## Critic Findings (carried/deferred)

### CRI-CARRIED-1: Contest layout forced navigation — carried from DEFER-18
