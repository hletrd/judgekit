# UI/UX Review — RPF Cycle 29

**Date:** 2026-04-23
**Reviewer:** designer
**Base commit:** a51772ae

## Previously Fixed Items (Verified)

- Code editor i18n (fullscreen/exit labels): Fixed (commit 5c387c7b)
- Korean letter-spacing compliance: Maintained across codebase

## DES-1: Clarification quick-answer buttons produce English text for Korean users [MEDIUM/HIGH]

**File:** `src/components/contest/contest-clarifications.tsx:290-296`

**UX impact:** When a Korean-speaking contest organizer clicks the "Yes" quick-answer button (which is labeled with the Korean `t("quickYes")` key), the answer stored and displayed to participants is the English word "Yes" instead of the Korean equivalent. This creates a jarring language-switch experience for Korean participants reading clarifications.

**Accessibility concern:** Screen readers in Korean locale will announce the English answer text, creating a language-switch announcement that disrupts the reading flow. WCAG 2.2 SC 3.1.2 (Language of Parts) requires that the human language of each passage can be programmatically determined.

**Fix:** Add i18n keys for the answer content and use them in the `handleAnswer` calls.

---

## DES-2: `active-timed-assignment-sidebar-panel` progress bar missing accessible label update [LOW/LOW]

**File:** `src/components/layout/active-timed-assignment-sidebar-panel.tsx:172`

The progress bar has `aria-valuenow={progressPercent}` but the `aria-valuenow` value is a number (percentage) without context. The progress bar's purpose is not described in an `aria-label` or `aria-labelledby` attribute. A screen reader user would hear a percentage value without knowing what it represents.

**Fix:** Add `aria-label={tNav("progress")}` to the progress bar div to provide context for the percentage value.

---

## Designer Findings (carried/deferred)

### DES-CARRIED-1: Dialog semantics for submission overview — carried from DEFER-41
