# Architecture Review — RPF Cycle 29

**Date:** 2026-04-23
**Reviewer:** architect
**Base commit:** a51772ae

## Previously Fixed Items (Verified)

- Code editor i18n: Fixed (commit 5c387c7b)
- Contest replay setInterval: Fixed (commit 9cc30d51)

## ARCH-1: Hardcoded English answer text in clarifications breaks i18n architectural consistency [MEDIUM/HIGH]

**File:** `src/components/contest/contest-clarifications.tsx:290-296`

The codebase has a strong architectural convention of i18n-first design — all user-facing strings go through `useTranslations()`. The quick-answer buttons ("Yes", "No", "No comment") violate this convention by passing hardcoded English strings as API payloads. This is architecturally worse than the previous code-editor issue (AGG-1 from cycle 28) because:

1. The strings are not just displayed — they are **persisted to the database** as answer content
2. They become the canonical answer shown to all participants, regardless of locale
3. The `answerType` enum ("yes", "no", "no_comment") already encodes the semantic meaning — the text is redundant display content that should be localized

**Fix:** Add i18n keys for the answer text. The `answerType` field determines the semantic meaning; the `answer` field should contain the localized human-readable text.

---

## ARCH-2: `useVisibilityPolling` is the only shared hook still using `setInterval` [LOW/LOW]

**File:** `src/hooks/use-visibility-polling.ts:55`

The codebase has established a convention of using recursive `setTimeout` for timer-based effects (contest-replay, countdown-timer, anti-cheat-monitor). The `useVisibilityPolling` hook is the exception, still using `setInterval`. While functionally correct (the visibility change handler mitigates drift), this creates an inconsistency in the timer architecture pattern.

**Fix:** Migrate to recursive `setTimeout` for architectural consistency. This also improves the jitter mechanism's effectiveness since each tick would independently schedule the next.

---

## Architectural Findings (carried/deferred)

### ARCH-CARRIED-1: Inconsistent createApiHandler usage — carried from DEFER-17
### ARCH-CARRIED-2: Duplicated visibility-aware polling pattern — carried from DEFER-21
