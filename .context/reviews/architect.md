# Architecture Review — RPF Cycle 31

**Date:** 2026-04-23
**Reviewer:** architect
**Base commit:** 198e6a63

## Findings

### ARCH-1: ActiveTimedAssignmentSidebarPanel `setInterval` — last client-side timer violating established pattern [MEDIUM/MEDIUM]

**File:** `src/components/layout/active-timed-assignment-sidebar-panel.tsx:63`

**Description:** The codebase has converged on recursive `setTimeout` as the canonical pattern for all client-side timers. Three components have been migrated in the last three cycles. This component is the last holdout. It even references the countdown-timer pattern in a comment (line 78-79) but doesn't implement it.

This is an architectural consistency issue — developers reading this code may think `setInterval` is acceptable for new code because they see it in this component.

**Fix:** Migrate to recursive `setTimeout`.

---

### ARCH-2: Inconsistent `.json()` error handling across server-side sidecar clients [LOW/MEDIUM]

**Files:** `src/lib/assignments/code-similarity-client.ts:49`, `src/lib/compiler/execute.ts:533`, `src/lib/security/hcaptcha.ts:76`

**Description:** Three server-side sidecar/external API clients call `response.json()` without `.catch()` on success paths. The rate-limiter-client.ts was fixed in cycle 30 with a `.catch(() => null)` pattern, establishing it as the canonical approach. The code-similarity-client, compiler runner, and hcaptcha clients don't follow this pattern.

While these are all server-side (less risky than client-side), the inconsistency creates maintenance burden and confusion about the expected pattern.

**Fix:** Apply the `.catch()` pattern consistently to all server-side `response.json()` calls on success paths.
