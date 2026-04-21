# RPF Cycle 27 Review Remediation Plan

**Date:** 2026-04-20
**Source:** `.context/reviews/cycle-27-aggregate.md`
**Status:** In progress

## Scope

This cycle addresses the updated cycle-27 findings from the multi-agent review plus fresh deep review:
- AGG-1 through AGG-3: Already fixed in prior cycles (confirmed)
- AGG-4: Inconsistent `createApiHandler` — architectural, deferred
- AGG-5: SSE O(n) eviction — acceptable, no action
- AGG-6: Recruit page 3 DB queries — low priority, deferred
- AGG-7: No test coverage for recruit/SSE — deferred
- AGG-8: Error boundaries use `console.error` in production — NEW, to fix
- AGG-9: `console.warn` in create-problem-form — NEW, to fix
- AGG-10: `not-found.tsx` tracking-[0.2em] not documented — NEW, to fix
- AGG-11: Contest layout forced navigation — NEW, documented, low priority
- AGG-12: use-source-draft JSON.parse cast — NEW, low priority, deferred

No cycle-27 review finding is silently dropped. No new refactor-only work is added under deferred.

---

## Implementation lanes

### H1: Gate `console.error` in error boundary components behind dev-only check (AGG-8)

- **Source:** AGG-8
- **Severity / confidence:** MEDIUM / MEDIUM
- **Citations:** `src/app/(dashboard)/dashboard/admin/error.tsx:17`, `src/app/(dashboard)/dashboard/submissions/error.tsx:17`, `src/app/(dashboard)/dashboard/problems/error.tsx:17`, `src/app/(dashboard)/dashboard/groups/error.tsx:17`
- **Problem:** Four error boundary components use `console.error()` unconditionally in production. This leaks stack traces and internal paths to browser DevTools in production. The project's own convention (documented in `src/lib/api/client.ts:23`) says "Log errors in development only". Next.js error boundaries already provide server-side error tracking via the `digest` field.
- **Plan:**
  1. Gate the `console.error` calls behind `process.env.NODE_ENV === "development"` in all four error boundary components.
  2. Verify all gates pass.
- **Status:** TODO

### M1: Gate `console.warn` in create-problem-form behind dev-only check (AGG-9)

- **Source:** AGG-9
- **Severity / confidence:** LOW / MEDIUM
- **Citations:** `src/app/(dashboard)/dashboard/problems/create/create-problem-form.tsx:225`
- **Problem:** A `console.warn()` call in a catch block for non-critical tag suggestions. The codebase convention says "Log errors in development only". While the comment correctly identifies the call as non-critical, it still writes to the console in production.
- **Plan:**
  1. Gate the `console.warn` behind `process.env.NODE_ENV === "development"`.
  2. Verify all gates pass.
- **Status:** TODO

### M2: Add Korean-locale documentation comment on not-found.tsx "404" tracking (AGG-10)

- **Source:** AGG-10
- **Severity / confidence:** LOW / MEDIUM
- **Citations:** `src/app/not-found.tsx:58`
- **Problem:** `tracking-[0.2em]` on "404" text is unconditional. While "404" is a numeric code (safe for Korean), the pattern is inconsistent with the rest of the codebase where tracking is either locale-conditional or explicitly documented.
- **Plan:**
  1. Add a comment `/* "404" is a numeric status code — tracking safe for Korean locale */` for consistency with the existing documentation convention.
  2. Verify all gates pass.
- **Status:** TODO

### M3: Continue workspace-to-public migration — Phase 5 remaining items

- **Source:** User-injected TODO, carried from Phase 5 remaining work
- **Severity / confidence:** MEDIUM / HIGH
- **Citations:** `src/components/layout/app-sidebar.tsx`, `plans/open/2026-04-19-workspace-to-public-migration.md`
- **Problem:** Phase 5 remaining items from the migration plan:
  - Evaluate icon-rail mode for admin sidebar (collapsed by default, expand on hover/click)
  - Mobile UX audit: verify admin sidebar behavior on small screens
  - Clean up `navGroups` constant — non-admin group items are now unreachable for non-admin users and redundant with the dropdown for admin users
- **Plan:**
  1. Evaluate the admin sidebar for mobile behavior — ensure it collapses properly on small screens.
  2. Verify the `navGroups` constant is clean — non-admin items should already be removed.
  3. Consider adding a collapse/expand toggle for the admin sidebar.
  4. Verify all gates pass.
- **Status:** TODO

---

## Deferred items

### DEFER-1 through DEFER-13: Carried from cycle 23

See `plans/open/2026-04-20-rpf-cycle-23-review-remediation.md` for the full deferred list. All carry forward unchanged.

### DEFER-14: Centralized error handling pattern / useApiFetch hook (carried from cycle 24)

- **Source:** AGG-5 (architect ARCH-3, document-specialist DOC-1)
- **Severity / confidence:** MEDIUM / MEDIUM
- **Original severity preserved:** MEDIUM / MEDIUM
- **Citations:** Cross-cutting: `src/lib/api/client.ts`, all components using apiFetch
- **Reason for deferral:** The immediate fixes (H1) address the symptom. A centralized `useApiFetch` hook or ESLint rule is a larger refactor that should be done holistically, not piecemeal. H1 provides the immediate fixes; the shared hook is the long-term DRY improvement.
- **Exit criterion:** When a cycle has capacity for a focused refactor pass, or when a new catch-block pattern violation is found.

### DEFER-15: Replace `window.confirm()` in `use-unsaved-changes-guard.ts` with AlertDialog (carried from cycle 25)

- **Source:** AGG-5 (cycle 25 deep review, designer DES-3), carried from DEFER-6 (cycle 20)
- **Severity / confidence:** MEDIUM / MEDIUM (upgraded from LOW/MEDIUM)
- **Original severity preserved:** MEDIUM / MEDIUM (upgraded)
- **Citations:** `src/hooks/use-unsaved-changes-guard.ts:107`
- **Reason for deferral:** The `beforeunload` event handler can only use the native dialog (browser limitation). For click interception and history navigation, replacing `confirm()` with an async AlertDialog would require significant refactoring of the hook's control flow.
- **Exit criterion:** When a reusable async confirmation hook is created, or when the hook is refactored to use the Navigation API's `navigate` event.

### DEFER-16: `ContestAnnouncements` polling visibility edge case on mount (carried from cycle 25)

- **Source:** AGG-7 (cycle 25 perf sweep)
- **Severity / confidence:** LOW / LOW
- **Original severity preserved:** LOW / LOW
- **Citations:** `src/components/contest/contest-announcements.tsx:71-95`
- **Reason for deferral:** The brief timing window (<1ms) where the interval starts before `syncVisibility` checks tab state is harmless in practice.
- **Exit criterion:** When a shared `useVisibilityAwarePolling` hook (DEFER-11) is implemented.

### DEFER-17: Inconsistent `createApiHandler` across route handlers (from AGG-4)

- **Source:** AGG-4 (architect ARCH-2)
- **Severity / confidence:** LOW / MEDIUM
- **Original severity preserved:** LOW / MEDIUM
- **Citations:** 22 raw route handlers in `src/app/api/`
- **Reason for deferral:** Migrating routes to `createApiHandler` is a large-scale refactor that should be done holistically. Some routes (SSE streaming, judge token auth, multipart form data) have legitimate reasons to avoid the abstraction. The risk of a security pattern divergence across 22 files is real but not immediate.
- **Exit criterion:** When a cycle has capacity for a focused API-route refactor pass, or when a new security-critical auth change requires updating all routes.

### DEFER-18: Contest layout forced full page navigation (from AGG-11)

- **Source:** AGG-11 (fresh architect/debugger review)
- **Severity / confidence:** LOW / MEDIUM
- **Original severity preserved:** LOW / MEDIUM
- **Citations:** `src/app/(dashboard)/dashboard/contests/layout.tsx:16-45`
- **Reason for deferral:** The workaround is necessary due to a Next.js 16 RSC streaming bug with nginx proxy headers. The existing TODO comment tracks removal. Fixing this requires an upstream Next.js fix.
- **Exit criterion:** When the Next.js bug is fixed in a version the project upgrades to. Track via the TODO in the file.

### DEFER-19: `use-source-draft.ts` JSON.parse runtime validation (from AGG-12)

- **Source:** AGG-12 (fresh code-quality review)
- **Severity / confidence:** LOW / LOW
- **Original severity preserved:** LOW / LOW
- **Citations:** `src/hooks/use-source-draft.ts:185`
- **Reason for deferral:** The JSON.parse is already inside a try/catch block. The `as Partial<DraftPayload>` cast bypasses runtime validation, but the hook handles malformed data gracefully by falling back to defaults. Adding zod validation would improve robustness but is not urgent.
- **Exit criterion:** When the draft schema changes significantly, or when a shared localStorage validation utility is created.

---

## Workspace-to-Public Migration Progress

**Current phase:** Phase 5 IN PROGRESS. Working on AppSidebar slim-down and remaining items.

Per the user-injected TODO, this cycle makes incremental progress on the workspace-to-public migration through M3.

---

## Progress log

- 2026-04-20: Plan created from updated cycle-27 aggregate review. Prior AGG-1 through AGG-3 already fixed. New findings AGG-8 through AGG-12 added as implementation lanes.
