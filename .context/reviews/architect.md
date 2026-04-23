# Architecture Review — RPF Cycle 40

**Date:** 2026-04-23
**Reviewer:** architect
**Base commit:** f030233a

## Inventory of Files Reviewed

- `src/app/api/v1/groups/[id]/assignments/[assignmentId]/route.ts` — Assignment PATCH route
- `src/app/api/v1/contests/[assignmentId]/anti-cheat/route.ts` — Anti-cheat events
- `src/app/api/v1/submissions/route.ts` — Submissions
- `src/app/api/v1/contests/quick-create/route.ts` — Quick-create (verified)
- `src/lib/assignments/recruiting-invitations.ts` — Invitation library
- `src/lib/compiler/execute.ts` — Compiler execution
- `src/lib/realtime/realtime-coordination.ts` — SSE coordination
- `src/app/api/v1/groups/[id]/members/bulk/route.ts` — Bulk enrollment

## Previously Fixed Items (Verified)

- MAX_EXPIRY_MS extracted to shared constant: `src/lib/assignments/recruiting-constants.ts`
- Exam session short-circuit for non-exam assignments: Fixed at line 29
- Un-revoke transition removed: Fixed at lines 96-102

## New Findings

### ARCH-1: Assignment PATCH mixes `Date.now()` with DB-derived timestamps — inconsistent time source [MEDIUM/MEDIUM]

**File:** `src/app/api/v1/groups/[id]/assignments/[assignmentId]/route.ts:99-101`

**Description:** The assignment PATCH route uses `Date.now()` for the "active contest" check, but the `assignment.startsAt` value it compares against comes from the database. The codebase has established a consistent pattern of using DB server time (`getDbNowUncached()`) for all schedule comparisons to avoid clock skew. The recruiting invitation routes, submission deadline enforcement, and exam session checks all use DB time. This route is the only remaining schedule comparison that uses app server time.

This is not just a clock-skew risk (see SEC-1), but also an architectural inconsistency. Future developers looking at this code may assume `Date.now()` is the standard, while the rest of the codebase has converged on `getDbNowUncached()`.

**Fix:** Replace `Date.now()` with `getDbNowUncached()` to match the codebase convention.

**Confidence:** Medium
