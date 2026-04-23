# Debugger Review — RPF Cycle 31

**Date:** 2026-04-23
**Reviewer:** debugger
**Base commit:** 198e6a63

## Findings

### DBG-1: ActiveTimedAssignmentSidebarPanel `setInterval` — catch-up behavior on tab switch [MEDIUM/MEDIUM]

**File:** `src/components/layout/active-timed-assignment-sidebar-panel.tsx:63`

**Description:** Using `setInterval` instead of recursive `setTimeout` means that when a tab is backgrounded, the browser may throttle the interval. When the tab becomes visible again, multiple pending interval callbacks can fire in rapid succession before the `visibilitychange` handler runs. This causes a burst of `setNowMs(Date.now())` calls and re-renders.

The `visibilitychange` handler on line 80-84 provides the correct immediate update, making the catch-up interval callbacks redundant and wasteful.

**Fix:** Migrate to recursive `setTimeout` to prevent catch-up behavior.

---

### DBG-2: Chat widget tool error messages leak raw `err.message` into LLM conversation [MEDIUM/HIGH]

**File:** `src/app/api/v1/plugins/chat-widget/chat/route.ts:431`

**Description:** When tool execution fails, the raw `err.message` is included in the tool result string sent back to the LLM. Internal errors from database queries, file system operations, or network calls can contain sensitive infrastructure details. The LLM may relay these to the user.

**Fix:** Sanitize error messages.
