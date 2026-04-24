# RPF Cycle 32 Review Remediation Plan

**Date:** 2026-04-23
**Base commit:** 086a2b09
**Review artifacts:** All per-agent reviews in `.context/reviews/` + `.context/reviews/_aggregate.md`

## Previously Completed Tasks (Verified in Current Code)

All cycle 31 tasks are complete:
- [x] Task A: Sidebar setInterval migration — Fixed in commit 092dd688
- [x] Task B: Chat tool error sanitization — Fixed in commit 6b1d3ee7
- [x] Task C: Sidecar .catch() guards — Fixed in commit fd265c61
- [x] Task D: Triple find extraction — Fixed in commit 0d27ecac

## Tasks (priority order)

### Task A: Fix chat widget auto-analysis stale `sendMessage` closure [MEDIUM/HIGH]

**From:** AGG-1 (7 reviewers), CR-1, CRI-1, V-1, DBG-1, TR-1, TE-1
**Severity / confidence:** MEDIUM / HIGH
**File:** `src/lib/plugins/chat-widget/chat-widget.tsx:121-135`

**Problem:** The auto-analysis `useEffect` calls `sendMessage` but does not include it in the dependency array — the missing dependency is suppressed with `eslint-disable-next-line react-hooks/exhaustive-deps`. The `sendMessage` callback depends on `sessionId`, so when a session is established (via `X-Chat-Session-Id` response header), the auto-analysis effect still holds the old closure with `sessionId = null`. Subsequent auto-analysis messages create a new chat session instead of continuing the existing one, losing conversation context.

**Plan:**
1. Add a `sendMessageRef` ref that tracks the latest `sendMessage` callback
2. Add a `useEffect` to keep `sendMessageRef.current` synchronized with `sendMessage`
3. In the auto-analysis effect (line 132), replace `sendMessage(apiPrompt, displayText)` with `sendMessageRef.current(apiPrompt, displayText)`
4. Remove the `eslint-disable-next-line react-hooks/exhaustive-deps` comment since the ref is stable
5. Verify all gates pass

**Status:** DONE (commit 9691d3de)

---

### Task B: Sanitize Docker client error messages in build, pull, and remove operations [LOW/MEDIUM]

**From:** AGG-2 (5 reviewers), SEC-1, SEC-2, V-2, DBG-2, TR-2
**Severity / confidence:** LOW / MEDIUM
**Previously:** DEFER-43 from cycle 31, now promoted since it keeps being flagged
**Files:**
- `src/lib/docker/client.ts:174` (build spawn error)
- `src/lib/docker/client.ts:112` (pull error)
- `src/lib/docker/client.ts:204` (remove error)

**Problem:** Raw Node.js `err.message` / `error.message` strings are returned in response objects. Docker operations can fail with errors containing host file paths, container IDs, or other infrastructure details. All endpoints are admin-only, reducing risk, but the leak is unnecessary.

**Plan:**
1. In `buildDockerImageLocal` (line 172-175): log the full error and return `"Build process failed to start"`
2. In `pullDockerImageLocal` (line 111-114): log the full error and return `"Failed to pull Docker image"`
3. In `removeDockerImageLocal` (line 204-207): log the full error and return `"Failed to remove Docker image"`
4. Verify all gates pass

**Status:** DONE (commit db77565d)

---

### Task C: Add `prefers-reduced-motion` support for chat widget typing indicator [MEDIUM/MEDIUM]

**From:** AGG-3 (2 reviewers), DES-1, CRI-2
**Severity / confidence:** MEDIUM / MEDIUM
**File:** `src/lib/plugins/chat-widget/chat-widget.tsx:316-319`

**Problem:** The typing indicator uses `animate-bounce` without respecting the `prefers-reduced-motion` media query. WCAG 2.2 requires respecting this preference for users with vestibular disorders.

**Plan:**
1. Replace `className="animate-bounce"` with `className="motion-safe:animate-bounce"` on each dot span
2. Verify that when `prefers-reduced-motion: reduce` is active, the dots are static
3. Verify all gates pass

**Status:** DONE (commit 9691d3de)

---

### Task D: Refactor files route POST handler to use `createApiHandler` [LOW/MEDIUM]

**From:** AGG-4 (2 reviewers), CR-3, ARCH-2
**Severity / confidence:** LOW / MEDIUM
**File:** `src/app/api/v1/files/route.ts:20-141`

**Problem:** The POST handler manually implements auth, CSRF, rate limiting, and error handling instead of using `createApiHandler`. The GET handler on the same file uses `createApiHandler`. The inconsistency means the POST route misses framework-level safeguards.

**Plan:**
1. Wrap the POST handler with `createApiHandler` using `auth: true`, `rateLimit: "files:upload"`, and the existing handler logic
2. Move the manual auth/CSRF/rate-limit checks into the config object
3. Ensure the multipart form data parsing still works within the handler
4. Verify all gates pass

**Status:** DONE (commit 9e277929)

---

### Task E: Throttle chat widget scroll during streaming with `requestAnimationFrame` [LOW/MEDIUM]

**From:** AGG-6 (1 reviewer), PERF-1
**Severity / confidence:** LOW / MEDIUM
**File:** `src/lib/plugins/chat-widget/chat-widget.tsx:86-88, 195-202`

**Problem:** During streaming, `setMessages` is called on every chunk, which triggers `scrollToBottom` with `behavior: "auto"` causing frequent synchronous layout recalculation on low-end devices.

**Plan:**
1. Add a `scrollRafRef` ref to track pending animation frame requests
2. In `scrollToBottom`, when `isStreaming` is true, use `requestAnimationFrame` to batch the scroll update
3. When not streaming, keep the smooth scroll behavior
4. Cancel any pending RAF on cleanup
5. Verify all gates pass

**Status:** TODO

---

## Deferred Items

### DEFER-1 through DEFER-41: Carried from cycle 29/30/31

See prior cycle plans for the full deferred list. All carry forward unchanged.

### DEFER-43: ~~Docker client leaks `err.message` in build error responses~~ PROMOTED TO TASK B

This item was previously deferred at LOW/MEDIUM. It has been flagged for two consecutive cycles (31 and 32) and is now promoted to Task B.

### DEFER-44: No documentation for the established timer pattern convention [LOW/LOW]

- **Source:** DOC-2 from cycle 31
- **Severity / confidence:** LOW / LOW
- **Citations:** Codebase convention
- **Reason for deferral:** Documentation-only change. No functional impact.
- **Exit criterion:** When a documentation pass is scheduled.

### DEFER-45: Duplicate password rehash logic across four locations [LOW/LOW]

- **Source:** AGG-5, CR-2
- **Severity / confidence:** LOW / LOW
- **Citations:** `src/app/api/v1/admin/restore/route.ts:56-73`, `src/app/api/v1/admin/migrate/import/route.ts:57-75`, `src/app/api/v1/admin/migrate/import/route.ts:158-174`, `src/lib/assignments/recruiting-invitations.ts:387-402`
- **Reason for deferral:** Code deduplication refactor. No functional bug. All four implementations are correct. Refactoring risks introducing regression if not tested thoroughly.
- **Exit criterion:** When the auth module is being modified for another reason, or when a dedicated refactoring pass is scheduled.

### DEFER-46: Import route flat JSON body path risks password in export artifacts [LOW/MEDIUM]

- **Source:** AGG-7, CR-4
- **Severity / confidence:** LOW / MEDIUM
- **Citations:** `src/app/api/v1/admin/migrate/import/route.ts:141-183`
- **Reason for deferral:** Operational risk only — requires admin-level access and deliberate debug logging. The nested format already exists as the preferred path.
- **Exit criterion:** When the import/export module is being modified for another reason, or deprecation cycle for flat format is scheduled.

### DEFER-47: SSE events route module-level mutable state makes testing difficult [LOW/LOW]

- **Source:** ARCH-1, TE-2
- **Severity / confidence:** LOW / LOW
- **Citations:** `src/app/api/v1/submissions/[id]/events/route.ts:26-95`
- **Reason for deferral:** Architectural refactor with no user-facing impact. The current design is correct for single-instance deployments. Extracting state into a class would be a larger refactor.
- **Exit criterion:** When the SSE module is being modified for another reason, or when a dedicated testability pass is scheduled.

### DEFER-48: Contest stats CTEs computed even for non-instructor users [LOW/LOW]

- **Source:** PERF-3
- **Severity / confidence:** LOW / LOW
- **Citations:** `src/app/api/v1/contests/[assignmentId]/stats/route.ts:80-119`
- **Reason for deferral:** Performance optimization requiring product decision on what stats students should see. No correctness issue.
- **Exit criterion:** When the contest stats feature is being modified for another reason, or when a dedicated performance pass is scheduled.

### DEFER-49: Chat widget mobile touch targets below WCAG 44px minimum [LOW/LOW]

- **Source:** DES-3
- **Severity / confidence:** LOW / LOW
- **Citations:** `src/lib/plugins/chat-widget/chat-widget.tsx:265`
- **Reason for deferral:** UI polish. The buttons are functional. A full mobile redesign would be more appropriate than individual button fixes.
- **Exit criterion:** When the chat widget UI is being redesigned, or when a dedicated accessibility pass is scheduled.

---

## Progress log

- 2026-04-23: Plan created with 5 tasks (A-E), DEFER-43 promoted to Task B, 5 new deferred items (DEFER-45 through DEFER-49).
- 2026-04-23: All 5 tasks completed. Task A/C/E in commit 9691d3de (chat-widget), Task B in commit db77565d (docker), Task D in commit 9e277929 (files). All gates pass: eslint clean, next build success, 2114/2114 vitest passing.
