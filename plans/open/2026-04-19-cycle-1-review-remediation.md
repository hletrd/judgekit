# Cycle 1 Review Remediation Plan (review-plan-fix loop)

**Date:** 2026-04-19  
**Source:** `.context/reviews/_aggregate.md` + preserved per-agent review files under `.context/reviews/`  
**Status:** IN PROGRESS

## Scope and revalidation rules
- This plan revalidates all preserved review artifacts against **current HEAD** before scheduling work.
- Findings that are already fixed on current HEAD or that directly contradict repo policy are recorded explicitly below and are **not** rescheduled.
- Actionable work for this cycle is limited to issues confirmed by current code review.

## Archived prior plan
- Archived fully implemented prior plan: `plans/archive/2026-04-19-cycle-1-review-remediation-pre-loop.md`

## Implementation stories for this cycle

### M1: Fix Tags API `limit` NaN handling
**Severity:** MEDIUM | **Confidence:** HIGH | **Effort:** Quick win

**Files:**
- `src/app/api/v1/tags/route.ts:17`
- New test file or existing route test

**Problem:** `Math.min(Number(searchParams.get("limit") ?? "50"), 100)` produces `NaN` when `limit` is a non-numeric string. Same bug class as the anti-cheat endpoint NaN issue fixed in cycle 21 (commit 88391c26). Multiple agents flagged this (code-reviewer F1, debugger F1, verifier F1, test-engineer F1, critic F1).

**Fix:**
1. Change `Number(searchParams.get("limit") ?? "50")` to `parseInt(searchParams.get("limit") ?? "50", 10) || 50`.
2. Add a test verifying non-numeric `limit` values fall back to the default.
3. Optionally create a shared `parsePositiveInt` helper to prevent recurrence (critic F1).

**Verification:** `npm run test:unit`, `npm run lint`, `npx tsc --noEmit`

---

### M2: Add comment documenting proxy `x-forwarded-host` deletion dependency on auth-route exclusion
**Severity:** MEDIUM | **Confidence:** HIGH | **Effort:** Quick win

**Files:**
- `src/proxy.ts:148`

**Problem:** The proxy unconditionally deletes the `x-forwarded-host` header to work around an RSC streaming bug. This is safe only because auth routes (`/api/auth/`) are excluded from the proxy matcher. If auth routes are ever added to the proxy matcher, the deletion will break auth callbacks with `UntrustedHost` errors. Multiple agents flagged this (security-reviewer F1, critic F3, verifier F2, test-engineer F4).

**Fix:**
1. Add a code comment at proxy.ts:148 documenting the dependency on auth-route exclusion.
2. Note the cycle 2 live `UntrustedHost` failure (AGG-1) as historical context.

**Verification:** `npm run lint`, `npx tsc --noEmit`

---

### M3: Add optional parameters to `sanitizeSubmissionForViewer` to avoid hidden DB query
**Severity:** MEDIUM | **Confidence:** HIGH | **Effort:** Medium

**Files:**
- `src/lib/submissions/visibility.ts:58-84`
- Related tests

**Problem:** `sanitizeSubmissionForViewer` queries the `assignments` table for every invocation, but the function signature does not communicate this hidden DB query. This is a recurring maintainability trap flagged in multiple prior cycles (D16, cycle 21). Multiple agents flagged this again (code-reviewer F3, perf-reviewer F2, critic F2, test-engineer F3).

**Fix:**
1. Add optional `assignmentVisibility` parameter: `{ showResultsToCandidate?: boolean; hideScoresFromCandidates?: boolean }`.
2. When provided, skip the DB query and use the provided values.
3. When not provided, keep the existing DB query behavior.
4. Add JSDoc documenting the hidden DB query and the parameter-based alternative.
5. Update call sites that already have the assignment data to pass it through.

**Verification:** `npm run test:unit`, `npm run lint`, `npx tsc --noEmit`

---

### L1: Add error handling for chat widget tool-calling loop
**Severity:** LOW | **Confidence:** MEDIUM | **Effort:** Medium

**Files:**
- `src/app/api/v1/plugins/chat-widget/chat/route.ts:425-428`

**Problem:** The `executeTool` calls in the agent loop have no try/catch. A single tool failure (e.g., DB timeout) crashes the entire chat request with a 500 error. Multiple agents flagged this (code-reviewer F2, critic F4, test-engineer F2).

**Fix:**
1. Wrap each `executeTool` call in try/catch.
2. On failure, return an error string as the tool result (e.g., "Error fetching submission history: timeout").
3. This allows the agent loop to continue with available information.

**Verification:** `npm run test:unit`, `npm run lint`, `npx tsc --noEmit`

---

### L2: Add `/languages` to proxy matcher for CSP/security headers
**Severity:** LOW | **Confidence:** MEDIUM | **Effort:** Quick win

**Files:**
- `src/proxy.ts:301-319`

**Problem:** The proxy matcher includes `/practice/:path*` and `/rankings` but not `/languages`. The `/languages` public page loads without CSP headers. Multiple agents flagged this (code-reviewer F5, designer F1).

**Fix:**
1. Add `/languages` to the proxy matcher config.

**Verification:** `npm run build`, `npm run lint`

---

## Previously completed stories (carried forward)

| Story | Status | Notes |
|---|---|---|
| UX-01 | Done | Added semantic `h1` coverage for login, signup, and community surfaces plus component tests |
| UX-02 | Done | Localized public-header ARIA labels and aligned remote-smoke E2E expectations |
| UI-01 | Done | Simplified `FilterSelect` selected-label rendering to the repo-approved `SelectValue` contract and added regression coverage |

## Deferred items

| Finding | Severity | Reason | Exit Criterion |
|---------|----------|--------|----------------|
| DEF-01: Production-only failures on `/practice` and `/rankings` | MEDIUM | Browser audit confirms live failures, but current-head static review has not yet isolated a repo-side root cause | Reproduce the failure against current HEAD with production-like data/config |
| AGG-5: SSE connection tracking eviction may decrement per-user counts | LOW | Impact is limited to high-connection-count scenarios; `MAX_TRACKED_CONNECTIONS` is 2x `MAX_GLOBAL_SSE_CONNECTIONS` | User reports of connection limit violations |
| AGG-6: `rateLimits` table multiplexed for rate limiting and SSE connection tracking | LOW | Architectural improvement; current dual-purpose usage works with known limitations; separating requires schema migration | Performance reports of table bloat or query plan issues |
| AGG-8: Chat widget tool-calling loop holds HTTP connection open for extended duration | MEDIUM | Architectural improvement; streaming intermediate results requires significant refactoring | User reports of chat timeout or server resource exhaustion |
| Cycle 21 M3: Add tests for `computeSingleUserLiveRank` | MEDIUM | Requires integration test setup | Picked up in a test-focused cycle |
| Cycle 21 M4: Add tests for `getParticipantTimeline` | MEDIUM | Requires unit test setup | Picked up in a test-focused cycle |
| Cycle 21 L4: Make anti-cheat heartbeat gap detection lazy | LOW | Performance is acceptable for current scale | Latency reports on anti-cheat endpoint |
| Cycle 21 L6: Add ICPC last-AC-time tiebreaker to live rank query | LOW | Rare edge case | User report of rank discrepancy in ICPC contest |
| Cycle 21 L9: Add audit log for anti-cheat PII access | LOW | Requires audit infrastructure | Compliance requirement or user report |

## Revalidated non-actions from preserved review files

### CLOSED-01: Password-complexity escalation requests are invalid under repo policy
- **Original citations:** Multiple prior cycle reviews
- **Closure reason:** Repo policy explicitly forbids adding complexity requirements (`AGENTS.md`)

### CLOSED-02: JSON-LD script-escaping finding is already fixed on current HEAD
- `src/components/seo/json-ld.tsx` already uses `safeJsonForScript()`

### CLOSED-03: Shell-command prefix-bypass finding is already fixed on current HEAD
- `src/lib/compiler/execute.ts` now routes through `isValidCommandPrefix()`

### CLOSED-04: Deprecated rate-limit constant finding is stale
- Current files no longer expose the deprecated module-level constants

## Progress ledger

| Story | Status | Notes |
|---|---|---|
| UX-01 | Done | Added semantic `h1` coverage |
| UX-02 | Done | Localized public-header ARIA labels |
| UI-01 | Done | Simplified `FilterSelect` |
| M1 | Done | Fix Tags API `limit` NaN handling (commit fb13bfab) |
| M2 | Done | Add proxy `x-forwarded-host` deletion comment + `/languages` matcher (commit 7199bec4) |
| M3 | Done | Add optional parameters to `sanitizeSubmissionForViewer` (commit efdde4b1) |
| L1 | Done | Add error handling for chat widget tool-calling loop (commit ef214219) |
| L2 | Done | Add `/languages` to proxy matcher (included in commit 7199bec4) |
| DEF-01 | Deferred | Needs reproduction against current-head runtime/data |

## Gate notes

- Full gate set to be completed after implementation: `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm run test:unit`, `npm run test:component`
