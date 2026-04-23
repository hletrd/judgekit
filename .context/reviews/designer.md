# UI/UX Review — RPF Cycle 23

**Date:** 2026-04-22
**Reviewer:** designer
**Base commit:** 429d1b86

## DES-1: `submission-overview.tsx` custom dialog lacks focus trap and scroll lock [MEDIUM/HIGH]

**File:** `src/components/lecture/submission-overview.tsx:152`

**Confidence:** HIGH

The component renders a `div` with `role="dialog" aria-modal="true"` and a custom Escape handler, but:
1. **No focus trap**: Keyboard users can Tab past the dialog to interact with background elements, violating WCAG 2.1 SC 2.4.3
2. **No scroll lock**: The page body scrolls behind the dialog, which can be disorienting
3. **No overlay click-to-close**: Clicking outside the dialog does not dismiss it (unlike all other dialogs in the app)
4. **Custom Escape handler** uses `e.preventDefault()` which may block browser-level dialog behavior

The shared `Dialog` component from `@/components/ui/dialog` provides all these features out of the box and is used consistently throughout the rest of the application.

**Fix:** Refactor to use the shared `Dialog` component, which includes proper focus trapping, scroll lock, overlay click-to-close, and Escape key handling.

---

## DES-2: `contest-quick-stats.tsx` displays misleading "0.0" avgScore when no data exists [MEDIUM/MEDIUM]

**File:** `src/components/contest/contest-quick-stats.tsx:110`

**Confidence:** MEDIUM

When no submissions exist, the avgScore displays as "0.0" instead of a meaningful empty state like "---". This is misleading because 0.0 is a valid average score (all submissions scored zero), while the actual state is "no data available."

**Fix:** Track `avgScore` as `number | null`. Display "---" or "N/A" when null.

---

## DES-3: `recruiting-invitations-panel.tsx` icon-only buttons all have proper `aria-label` and `title` [INFO/N/A]

**File:** `src/components/contest/recruiting-invitations-panel.tsx:551,562,586,607`

**Confidence:** N/A

Verified that all icon-only buttons (copy link, reset password, revoke, delete) have both `title` and `aria-label` attributes. No accessibility gaps found in this file.
