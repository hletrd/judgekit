# Critic Review — RPF Cycle 31

**Date:** 2026-04-23
**Reviewer:** critic
**Base commit:** 198e6a63

## Findings

### CRI-1: ActiveTimedAssignmentSidebarPanel `setInterval` — incomplete migration [MEDIUM/MEDIUM]

**File:** `src/components/layout/active-timed-assignment-sidebar-panel.tsx:63`

**Description:** This is the last remaining client-side `setInterval`. The codebase has systematically migrated all other timers. The comment on line 78-79 explicitly says "This matches the pattern in countdown-timer.tsx" but the component still uses `setInterval`. This looks like an oversight rather than a deliberate decision.

**Fix:** Migrate to recursive `setTimeout`.

---

### CRI-2: Chat widget tool error messages leak internals to LLM [MEDIUM/HIGH]

**File:** `src/app/api/v1/plugins/chat-widget/chat/route.ts:431`

**Description:** The tool execution error handler passes raw `err.message` into the LLM conversation context. The LLM has no instruction to suppress internal error details and may relay them to the user. This violates the principle of not exposing internal system details through AI-generated responses.

**Fix:** Return a sanitized error message to the LLM; log the real error server-side only.
