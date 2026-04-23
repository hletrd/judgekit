# Tracer Review — RPF Cycle 31

**Date:** 2026-04-23
**Reviewer:** tracer
**Base commit:** 198e6a63

## Findings

### TR-1: ActiveTimedAssignmentSidebarPanel `setInterval` — last client-side timer using old pattern [MEDIUM/MEDIUM]

**File:** `src/components/layout/active-timed-assignment-sidebar-panel.tsx:63`

**Trace:**
1. Component mounts -> `useEffect` fires (line 53)
2. `hasActiveAssignment` check passes (line 56)
3. `window.setInterval(() => {...}, 1000)` starts (line 63)
4. Tab switches away -> browser throttles interval
5. Tab switches back -> browser fires multiple pending intervals in burst
6. Each fires `setNowMs(Date.now())` causing re-render
7. Meanwhile, `visibilitychange` handler also fires `setNowMs(Date.now())`
8. Result: multiple unnecessary re-renders in rapid succession

**Fix:** Migrate to recursive `setTimeout` with `cancelled` flag. This prevents the catch-up burst because `setTimeout` only schedules one callback at a time.

---

### TR-2: Chat widget tool error leak — trace of data flow [MEDIUM/HIGH]

**File:** `src/app/api/v1/plugins/chat-widget/chat/route.ts:431`

**Trace:**
1. User sends chat message -> `POST /api/v1/plugins/chat-widget/chat`
2. LLM responds with tool call (e.g., `get_submission_detail`)
3. `executeTool()` throws error (e.g., database connection error with message "connect ECONNREFUSED 127.0.0.1:5432")
4. Catch block on line 429-431 constructs: `Error executing tool "get_submission_detail": connect ECONNREFUSED 127.0.0.1:5432`
5. This string is passed to `provider.formatToolResult()` as `toolResult`
6. The result message is pushed to `fullMessages`
7. LLM receives this as a tool result in its conversation
8. LLM may relay the error details to the user in its next response

**Fix:** Sanitize error message at step 4 — return generic message, log full error server-side.
