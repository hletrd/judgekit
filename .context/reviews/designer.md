# UI/UX Review — RPF Cycle 16

**Date:** 2026-04-22
**Reviewer:** designer
**Base commit:** 9379c26b

## Inventory of Review-Relevant Files

Focus: accessibility (WCAG 2.2), keyboard navigation, ARIA, responsive design, loading/empty/error states, i18n, dark mode. The repo contains web frontend (Next.js + React + Tailwind), so UI/UX review applies.

## Findings

### DES-1: `file-management-client.tsx` icon-only buttons missing `aria-label` [LOW/MEDIUM]

**File:** `src/app/(dashboard)/dashboard/admin/files/file-management-client.tsx:199-210`
**Confidence:** HIGH

Also flagged by code-reviewer (CR-5), critic (CRI-4). The "Copy URL" button (line 199) and "Delete" button (line 214) both use `variant="ghost" size="sm"` with only `title` attributes. The `title` attribute is not reliably announced by screen readers. These are icon-only buttons (Copy and Trash2 icons with no visible text) that need `aria-label` for WCAG 2.2 compliance (SC 4.1.2 Name, Role, Value).

**Fix:** Add `aria-label` to both buttons.

---

### DES-2: `recruiter-candidates-panel.tsx` sort buttons lack keyboard focus indicators [LOW/LOW]

**File:** `src/components/contest/recruiter-candidates-panel.tsx:139-157`
**Confidence:** LOW

The sortable column headers use `Button variant="ghost" size="sm"` which may not have visible focus indicators on all browsers. The `Button` component from the UI library should provide focus indicators, but ghost variants sometimes suppress them for visual reasons. Without manual testing (which would require running the app), this is flagged as a risk.

**Fix:** Verify focus indicators are visible on ghost buttons. If not, add `focus-visible:ring` styles.

---

### DES-3: `recruiter-candidates-panel.tsx` CSV download uses `window.open` — no loading/progress feedback [LOW/LOW]

**File:** `src/components/contest/recruiter-candidates-panel.tsx:90-98`
**Confidence:** LOW

The CSV download uses `window.open()` which opens a new tab briefly before the download starts. There is no loading indicator or feedback that the download has started. For large exports, the user may click multiple times. This is a minor UX issue.

**Fix:** Consider using an `<a>` element with `download` attribute, or adding a brief loading indicator.

---

### DES-4: Anti-cheat dashboard `showPrivacyNotice` dialog lacks focus trap [LOW/MEDIUM]

**File:** `src/components/exam/anti-cheat-monitor.tsx:252-278`
**Confidence:** MEDIUM

The privacy notice uses a fixed overlay with `role="dialog"` and `aria-modal="true"`, but it does not implement a focus trap. When the dialog is open, the user can tab out of it to elements behind the overlay. This violates WCAG 2.2 SC 2.4.3 Focus Order (for modal dialogs). The component uses raw `div` elements instead of the project's `Dialog` component from `@/components/ui/dialog`, which would handle focus trapping automatically.

**Fix:** Use the `Dialog` component from the UI library, which handles focus trapping, or implement a custom focus trap.

---

### DES-5: `countdown-timer.tsx` threshold announcements use `aria-live="assertive"` — may be disruptive [LOW/LOW]

**File:** `src/components/exam/countdown-timer.tsx:151-153`
**Confidence:** LOW

The threshold announcement span uses `aria-live="assertive"`, which interrupts whatever the screen reader is currently saying. While this is appropriate for critical time warnings (1 minute remaining), it may be disruptive for the 15-minute warning. Consider using `aria-live="polite"` for the 15-minute and 5-minute warnings, reserving `assertive` for the 1-minute warning.

**Fix:** Change `aria-live` to `polite` for non-critical announcements.

## Previously Deferred (Carried Forward)

- Korean letter-spacing rule from CLAUDE.md is being followed — no violations found
- All previously fixed aria-label issues from cycles 11-13 remain in place

## Final Sweep

- Checked all icon-only buttons across the codebase for `aria-label` coverage
- Verified that the `recruiting-invitations-panel.tsx` metadata remove button fix (cycle 15) is still in place
- Dark mode classes are used consistently (dark: prefix patterns)
- No RTL/i18n layout issues detected (Korean text has no letter-spacing applied, per CLAUDE.md rule)
