# Cycle 18 Review Remediation Plan

**Date:** 2026-04-19
**Source:** `.context/reviews/cycle-18-comprehensive-review.md` and `.context/reviews/_aggregate.md`
**Status:** Complete

---

## MEDIUM Priority

### M1: Fix conflicting audit retention env vars in `db/cleanup.ts`
- **File**: `src/lib/db/cleanup.ts:5`, `src/lib/data-retention.ts:18`
- **Status**: DONE (commit a261a3f6)
- **Plan**:
  1. In `db/cleanup.ts`, replace the local `RETENTION_DAYS` constant with imports from `data-retention.ts`: use `DATA_RETENTION_DAYS.auditEvents` for audit events and `DATA_RETENTION_DAYS.loginEvents` for login events
  2. This ensures both the cron endpoint and the in-process pruners use the same canonical config
  3. Remove the `AUDIT_RETENTION_DAYS` env var reference — it is now superseded by `AUDIT_EVENT_RETENTION_DAYS` via the canonical config
  4. Verify the cleanup cron endpoint still works correctly
- **Exit criterion**: `db/cleanup.ts` uses `DATA_RETENTION_DAYS` from `data-retention.ts`. No reference to `AUDIT_RETENTION_DAYS` env var remains. Both cleanup paths use the same retention configuration.

### M2: Add `DATA_RETENTION_LEGAL_HOLD` check to `db/cleanup.ts`
- **File**: `src/lib/db/cleanup.ts:9-39`
- **Status**: DONE (commit a261a3f6, combined with M1)
- **Plan**:
  1. Import `DATA_RETENTION_LEGAL_HOLD` from `@/lib/data-retention`
  2. Add a check at the top of `cleanupOldEvents()`: if `DATA_RETENTION_LEGAL_HOLD` is true, return `{ auditDeleted: 0, loginDeleted: 0 }` immediately
  3. This matches the behavior of the in-process pruners in `audit/events.ts` and `data-retention-maintenance.ts`
  4. Add a log message when legal hold is active and cleanup is skipped (matching the pattern in `data-retention-maintenance.ts`)
- **Exit criterion**: `cleanupOldEvents()` skips all deletion when `DATA_RETENTION_LEGAL_HOLD` is true. Behavior matches the in-process pruners.

---

## LOW Priority

### L1: Add `needsRehash` handling to recruiting invitation and change-password flows
- **Files**: `src/lib/assignments/recruiting-invitations.ts:375`, `src/lib/actions/change-password.ts:46`
- **Status**: DONE (commit 519c3393)
- **Plan**:

### L2: Optimize frozen leaderboard to avoid redundant full ranking computation
- **File**: `src/app/api/v1/contests/[assignmentId]/leaderboard/route.ts:57-61`
- **Status**: DONE (commit 74873fc3)
- **Plan**:

### L3: Add per-user connection count index to SSE events route
- **File**: `src/app/api/v1/submissions/[id]/events/route.ts:37-44`
- **Status**: DONE (commit 363d7292)
- **Plan**:

### L4: Document or deprecate redundant `db/cleanup.ts` cron endpoint
- **File**: `src/lib/db/cleanup.ts`, `src/app/api/internal/cleanup/route.ts`
- **Status**: DONE (commit c29acc74)
- **Plan**:

### L5: Document first-AC query scoring semantics in contest analytics
- **File**: `src/lib/assignments/contest-analytics.ts:171`
- **Status**: DONE (commit c10311c6)
- **Plan**:

---

## Deferred Items

| Finding | Severity | Reason | Exit Criterion |
|---------|----------|--------|----------------|
| L6 (sanitizeSubmissionForViewer N+1 for list endpoints) | LOW | Same as D16/L6(c16) — only called from one place, no N+1 risk today | Re-open if function is added to list endpoints |
