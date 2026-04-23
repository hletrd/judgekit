# Architecture Review — RPF Cycle 43

**Date:** 2026-04-23
**Reviewer:** architect
**Base commit:** b0d843e7

## Inventory of Files Reviewed

- `src/app/api/v1/contests/quick-create/route.ts` — Verified problemPoints refine
- `src/app/api/v1/contests/[assignmentId]/access-code/route.ts` — Verified capability auth
- `src/app/api/v1/groups/[id]/assignments/[assignmentId]/route.ts` — Verified Date.now fix
- `src/lib/api/handler.ts` — API handler factory
- `src/lib/assignments/recruiting-invitations.ts` — Invitation library
- `src/lib/assignments/access-codes.ts` — Access code library
- `src/lib/compiler/execute.ts` — Compiler execution with Docker
- `src/lib/db/export.ts` — Streaming export engine

## Previously Fixed Items (Verified)

- MAX_EXPIRY_MS extracted to shared constant
- Exam session short-circuit for non-exam assignments
- Un-revoke transition removed
- Date.now() replaced with getDbNowUncached() in assignment PATCH

## New Findings

### ARCH-1: Submission rate-limit `oneMinuteAgo` uses `Date.now()` while insertion uses `getDbNowUncached()` — inconsistent time source in same transaction [MEDIUM/MEDIUM]

**File:** `src/app/api/v1/submissions/route.ts:249,318`

**Description:** The submission creation transaction computes the rate-limit window boundary using `new Date(Date.now() - 60_000)` (line 249) but inserts the submission's `submittedAt` using `getDbNowUncached()` (line 318). This creates an architectural inconsistency where the same transaction uses two different time references. The codebase has established `getDbNowUncached()` as the standard for all time comparisons involving DB-stored timestamps, and this route is the only remaining place that uses `Date.now()` for a comparison against DB data within a transaction.

**Fix:** Use `getDbNowUncached()` for the `oneMinuteAgo` computation to maintain architectural consistency.

**Confidence:** Medium
