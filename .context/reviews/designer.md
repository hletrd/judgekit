# UI/UX Review — RPF Cycle 48

**Date:** 2026-04-23
**Reviewer:** designer
**Base commit:** 6831c05e

## UI/UX Presence Detection

The repository contains a full web frontend with Next.js, React components, Tailwind CSS, and i18n. UI/UX review is applicable.

## Findings

### DES-1: Chat widget button badge lacks ARIA announcement [LOW/LOW] (carry-over)

**Description:** The chat widget's unread badge does not announce the count to screen readers. Users relying on assistive technology will not be informed of new messages.

---

### DES-2: Contests page badge hardcoded colors [LOW/LOW] (carry-over from cycle 46)

**Description:** Badge components in the contests page use hardcoded color values instead of design tokens, making them inconsistent with dark mode theme changes.

---

### DES-3: Anti-cheat privacy notice accessibility [LOW/LOW]

**File:** `src/components/exam/anti-cheat-monitor.tsx:261`

**Description:** The privacy notice dialog has `onOpenChange={() => {}}` and `showCloseButton={false}` to prevent dismissal. The `DialogDescription` provides context, but the close prevention could trap keyboard focus. The dialog should ensure:
- The "Accept" button receives initial focus (Tab order)
- Escape key is properly handled (it should NOT close the dialog, consistent with the intent)
- Focus trap remains within the dialog

**Verification needed:** Manual testing with keyboard navigation to confirm the "Accept" button is reachable and the dialog doesn't trap focus indefinitely.

---

### Positive Observations

1. The i18n implementation is thorough with Korean language support
2. The anti-cheat privacy notice is a good UX pattern — explicit consent before monitoring
3. No custom `letter-spacing` applied to Korean text (per project rules)
4. Error boundaries are properly implemented in dashboard sections
