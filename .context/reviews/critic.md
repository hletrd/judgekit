# Critic Review — RPF Cycle 43

**Date:** 2026-04-23
**Reviewer:** critic
**Base commit:** b0d843e7

## Inventory of Files Reviewed

- All API routes and core libraries
- Focus on cross-cutting concerns: auth consistency, time source consistency, error handling patterns

## Previously Fixed Items (Verified)

- All cycle 42 fixes verified and intact

## New Findings

### CRI-1: Submission rate-limit uses `Date.now()` for time window — cross-cutting consistency risk [MEDIUM/MEDIUM]

**File:** `src/app/api/v1/submissions/route.ts:249`

**Description:** The submission route is the only remaining API route that uses `Date.now()` for a comparison against DB-stored data. Every other schedule-related comparison in the codebase has been migrated to `getDbNowUncached()`. This creates a maintenance risk: developers seeing `Date.now()` in this file may assume it is the correct pattern for new code, reintroducing clock-skew risks that were previously fixed across the codebase.

The rate limit is not a hard security boundary (the advisory lock prevents true concurrent bypass), but the inconsistency is a pattern hazard.

**Fix:** Replace `new Date(Date.now() - 60_000)` with `new Date((await getDbNowUncached()).getTime() - 60_000)`.

**Confidence:** Medium

---

### Positive Observations

- The compiler/playground run routes are well-structured with consistent Docker image validation and capability checks.
- The community votes route uses an atomic transaction with `onConflictDoUpdate` for TOCTOU-safe vote toggling.
- The backup/restore routes properly require password re-confirmation and CSRF checks.
- The access code generation uses unbiased random bytes with rejection sampling.
- The recruiting invitation library correctly stores only token hashes, never plaintext tokens.
