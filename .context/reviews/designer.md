# UI/UX Review — RPF Cycle 37

**Date:** 2026-04-23
**Reviewer:** designer
**Base commit:** 3d729cee

## Inventory of UI Files Reviewed

- `src/lib/plugins/chat-widget/chat-widget.tsx` — Chat widget component
- `src/app/globals.css` — Global styles (prefers-reduced-motion section)
- `src/components/ui/` — UI components (select, dialog, sheet, etc.)
- Chat widget animate-in classes (line 294)

## Previously Fixed Items (Verified)

- DES-1 (Chat widget entry animation + prefers-reduced-motion): The `globals.css` at lines 138-145 includes a `@media (prefers-reduced-motion: reduce)` rule that sets `animation-duration: 0.01ms !important` and `animation-iteration-count: 1 !important` for all elements. This covers the `animate-in fade-in slide-in-from-bottom-4` on the chat widget container (line 294), making the separate `motion-safe:` prefix unnecessary. PASS.

- DES-2 (Chat textarea aria-label): Fixed at line 369 — `aria-label={t("placeholder")}` added. PASS.

## New Findings

### DES-1: Chat widget button badges use absolute positioning without proper ARIA announcement [LOW/LOW]

**File:** `src/lib/plugins/chat-widget/chat-widget.tsx:284-288`

**Description:** The minimized chat button shows a badge with the count of assistant messages. The badge is purely visual — there is no `aria-label` on the badge or the button indicating the count. When the chat is minimized, screen reader users won't know how many messages are waiting.

**Concrete failure scenario:** A screen reader user minimizes the chat widget. They hear "Chat" button but not that there are 3 unread messages.

**Fix:** Add an `aria-label` that includes the message count:
```tsx
<button
  onClick={() => setIsMinimized(false)}
  aria-label={messages.length > 0 ? `${t("name")} - ${messages.filter(m => m.role === "assistant").length} ${t("messages")}` : t("name")}
  ...
>
```

Or add `aria-label` to the badge span itself with a visually-hidden text.

**Confidence:** Low
