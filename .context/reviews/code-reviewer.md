# Code Review — RPF Cycle 29

**Date:** 2026-04-23
**Reviewer:** code-reviewer
**Base commit:** a51772ae

## Previously Fixed Items (Verified in Current Code)

All prior cycle aggregate findings have been addressed:
- AGG-1 (code-editor i18n): Fixed in commit 5c387c7b
- AGG-5 (contest-replay setInterval): Fixed in commit 9cc30d51
- All other prior findings verified as fixed

## CR-1: Hardcoded English strings in clarification quick-answer buttons [MEDIUM/HIGH]

**File:** `src/components/contest/contest-clarifications.tsx:290-296`

The quick-answer buttons pass hardcoded English strings as the `answerText` argument to `handleAnswer`:

- Line 290: `handleAnswer(clarification.id, "yes", "Yes")`
- Line 293: `handleAnswer(clarification.id, "no", "No")`
- Line 296: `handleAnswer(clarification.id, "no_comment", "No comment")`

These strings are sent directly to the API as the answer text and stored in the database. When Korean users click the quick-answer buttons, the answer stored and displayed will be "Yes", "No", or "No comment" instead of Korean translations.

**Concrete failure scenario:** A Korean contest organizer clicks the "Yes" quick-answer button on a clarification. The answer "Yes" is stored and shown to all Korean-speaking participants.

**Fix:** Replace hardcoded English strings with i18n keys:
- `"Yes"` -> `t("quickYesAnswer")` or similar
- `"No"` -> `t("quickNoAnswer")`
- `"No comment"` -> `t("quickNoCommentAnswer")`

Add corresponding keys to `messages/en.json` and `messages/ko.json` under `contests.clarifications`.

---

## CR-2: `handleAnswer` quick-answer text bypasses answer draft state [LOW/MEDIUM]

**File:** `src/components/contest/contest-clarifications.tsx:133-154`

When a user clicks a quick-answer button (yes/no/no_comment), the `answerText` parameter is passed directly to the API. However, when `answerType === "custom"`, the code falls through to `answerDrafts[id] ?? ""`. This means:

1. The quick-answer text is not reflected in the textarea (answerDrafts)
2. If the user clicks a quick-answer, then later opens the same clarification to add a custom answer, the textarea shows stale draft content, not the previously submitted answer.

This is a minor UX inconsistency but could confuse contest organizers.

**Fix:** After a successful answer submission, the `answerDrafts` entry for that clarification should be cleared (already done on line 149). The real issue is that quick-answer text is sent to the API but not stored locally for UI consistency. Consider using the existing `clarification.answer` from the re-fetched data instead of local draft state for display.

---

## Verified Safe / No Issue

- All `.json()` patterns follow "parse once, then branch" or use `apiFetchJson`
- `localStorage` write operations all have try/catch guards
- `console.error` calls all gated behind `process.env.NODE_ENV === "development"`
- No `as any`, `@ts-ignore`, or `@ts-expect-error` in production code
- No silently swallowed catch blocks
- Korean letter-spacing compliance maintained
- Code editor i18n fix from cycle 28 verified (commit 5c387c7b)
- Contest replay setInterval->setTimeout fix verified (commit 9cc30d51)
