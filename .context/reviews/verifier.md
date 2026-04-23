# Verifier Review — RPF Cycle 31

**Date:** 2026-04-23
**Reviewer:** verifier
**Base commit:** 198e6a63

## Previously Fixed Items (Verified in Current Code)

- AGG-1 (countdown timer setInterval): Fixed in commit 19de5cf6 — verified recursive setTimeout pattern
- AGG-2 (rate-limiter .catch() guard): Fixed in commit 7ae57906 — verified `.catch(() => null)` and null check
- AGG-3 (chat widget sendMessage stabilization): Fixed in commit ce9aa4fa — verified messagesRef pattern

## Findings

### V-1: ActiveTimedAssignmentSidebarPanel still uses `setInterval` — contradicts established pattern [MEDIUM/MEDIUM]

**File:** `src/components/layout/active-timed-assignment-sidebar-panel.tsx:63`

**Evidence:** Line 63: `const interval = window.setInterval(() => {`, line 78-79 comment says "This matches the pattern in countdown-timer.tsx" but the implementation does NOT match — countdown-timer uses recursive setTimeout. The comment is misleading.

**Fix:** Migrate to recursive `setTimeout`.

---

### V-2: Chat widget route exposes raw error messages to LLM [MEDIUM/HIGH]

**File:** `src/app/api/v1/plugins/chat-widget/chat/route.ts:431`

**Evidence:** Line 431: `toolResult = \`Error executing tool "${call.name}": ${err instanceof Error ? err.message : "unknown error"}\``. This raw error message becomes part of the LLM conversation context. The LLM system prompt does not instruct it to suppress internal details.

**Fix:** Sanitize error messages before passing to LLM.

---

### V-3: Unguarded `.json()` on three server-side sidecar success paths [LOW/MEDIUM]

**Files:** `src/lib/assignments/code-similarity-client.ts:49`, `src/lib/compiler/execute.ts:533`, `src/lib/security/hcaptcha.ts:76`

**Evidence:** All three call `response.json()` after `!response.ok` check without `.catch()`. The rate-limiter-client.ts was fixed with this pattern in cycle 30.

**Fix:** Add `.catch()` guards.
