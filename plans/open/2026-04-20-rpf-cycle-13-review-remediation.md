# RPF Cycle 13 Review Remediation Plan

**Date:** 2026-04-20
**Source:** `.context/reviews/rpf-13-aggregate.md` and per-agent review files

---

## Scope

This cycle addresses the new rpf-13 findings from the multi-agent review:
- AGG-1: Client-side expiry/status badges use browser `new Date()` instead of server-provided state
- AGG-2: `createBackupIntegrityManifest` has optional `dbNow` parameter with `new Date()` fallback
- AGG-3: Backup download filename uses browser `new Date()` instead of server-provided name
- AGG-4: Hardcoded English "Loading..." text in client components
- AGG-5: Triple `getDbNowUncached()` call in backup-with-files path
- AGG-6: `streamBackupWithFiles` buffers entire export in memory

No rpf-13 review finding is silently dropped. No new refactor-only work is added under deferred.

---

## Implementation lanes

### H1: Add server-computed `isExpired` fields to API responses for client-side status badges (AGG-1)

- **Source:** AGG-1
- **Severity / confidence:** MEDIUM / MEDIUM
- **Citations:** `src/components/contest/recruiting-invitations-panel.tsx:248`, `src/app/(dashboard)/dashboard/admin/api-keys/api-keys-client.tsx:270`
- **Problem:** Client components use `new Date()` (browser clock) to determine if items are expired. If the browser clock is off, users see incorrect "Expired" or "Pending" badges. 9 of 11 review agents flagged this. The server is always the authoritative gate — this is a display inconsistency, not a security vulnerability.
- **Plan:**
  1. In `src/lib/assignments/recruiting-invitations.ts`, extend `getRecruitingInvitations()` to compute an `isExpired` boolean per row using `expiresAt < NOW()` logic (add to the SQL query or compute server-side)
  2. In the recruiting invitations API route, include `isExpired` in the response
  3. In `src/components/contest/recruiting-invitations-panel.tsx`, update `getStatusBadge()` to use `inv.isExpired` instead of `new Date(inv.expiresAt) < new Date()`
  4. For API keys: the API key list response already includes `expiresAt`. Add a server-computed `isExpired` boolean in the API key list endpoint
  5. In `src/app/(dashboard)/dashboard/admin/api-keys/api-keys-client.tsx`, update `getStatus()` to use `key.isExpired` instead of `new Date(key.expiresAt) < new Date()`
  6. Verify tsc --noEmit passes
  7. Verify existing tests pass
- **Status:** DONE

### M1: Make `dbNow` required in `createBackupIntegrityManifest` (AGG-2)

- **Source:** AGG-2
- **Severity / confidence:** LOW / MEDIUM
- **Citations:** `src/lib/db/export-with-files.ts:42-56`
- **Problem:** `createBackupIntegrityManifest()` accepts `dbNow?: Date` and falls back to `new Date()`. All current callers pass `dbNow`, making the fallback dead code. The optional parameter is a maintenance trap — same pattern that caused clock-skew bugs in 20+ routes.
- **Plan:**
  1. Change `dbNow?: Date` to `dbNow: Date` in `createBackupIntegrityManifest()`
  2. Remove the `?? new Date()` fallback at line 47
  3. Verify tsc --noEmit passes
  4. Verify existing tests pass
- **Status:** DONE

### M2: Use server-provided filename for backup downloads instead of client-side timestamp (AGG-3)

- **Source:** AGG-3
- **Severity / confidence:** LOW / MEDIUM
- **Citations:** `src/app/(dashboard)/dashboard/admin/settings/database-backup-restore.tsx:52`
- **Problem:** The client-side download code generates its own filename using `new Date()`, overriding the server-provided `Content-Disposition` header. The downloaded file's name doesn't match the DB-time snapshot inside.
- **Plan:**
  1. In `handleDownload()`, after receiving the response, extract the filename from the `Content-Disposition` header using `response.headers.get('Content-Disposition')`
  2. Parse the filename from the header (format: `attachment; filename="judgekit-backup-<timestamp>.zip"`)
  3. Use the parsed filename for `a.download` instead of generating a client-side timestamp
  4. Fallback: if the header is missing or unparseable, use the current client-side timestamp as fallback
  5. Verify the download works correctly in both portable export and full backup modes
- **Status:** TODO

### M3: Replace hardcoded "Loading..." with i18n keys (AGG-4)

- **Source:** AGG-4
- **Severity / confidence:** LOW / MEDIUM
- **Citations:** `src/components/contest/recruiting-invitations-panel.tsx:441`, `src/app/(dashboard)/dashboard/admin/api-keys/api-keys-client.tsx:407`
- **Problem:** Two client components use hardcoded English "Loading..." text instead of the i18n system. Inconsistent with the rest of the UI.
- **Plan:**
  1. In `recruiting-invitations-panel.tsx`, replace `"Loading..."` with `tCommon("loading")` (component already has `useTranslations("common")` available, or add it if missing)
  2. In `api-keys-client.tsx`, replace `"Loading..."` with `t("loading")` or `tCommon("loading")` (verify which translation namespace is available)
  3. Verify both components render correctly
- **Status:** TODO

### L1: Reduce redundant `getDbNowUncached()` calls in backup path (AGG-5)

- **Source:** AGG-5
- **Severity / confidence:** LOW / MEDIUM
- **Citations:** `src/app/api/v1/admin/backup/route.ts:85`, `src/lib/db/export-with-files.ts:114`, `src/lib/db/export.ts:65`
- **Problem:** The backup-with-files path calls `getDbNowUncached()` 3 times (route, export-with-files, export). Each is a `SELECT NOW()` round-trip. The timestamps are typically within milliseconds, so the extra calls are unnecessary overhead.
- **Plan:**
  1. Add an optional `dbNow?: Date` parameter to `streamDatabaseExport()`
  2. When provided, skip the internal `getDbNowUncached()` call and use the passed-in value
  3. In `streamBackupWithFiles()`, accept `dbNow` from the caller and pass it through to `streamDatabaseExport()` and `createBackupIntegrityManifest()`
  4. In `backup/route.ts`, pass the already-fetched `dbNow` to `streamBackupWithFiles()`
  5. Verify tsc --noEmit passes
  6. Verify existing tests pass
- **Status:** TODO

---

## Deferred items

### DEFER-1: Make `withUpdatedAt()` `now` parameter required or auto-use DB time (carried from rpf-11 DEFER-1, originally rpf-10 DEFER-1)

- **Source:** AGG-2 (rpf-10), carried forward
- **Severity / confidence:** LOW / MEDIUM
- **Citations:** `src/lib/db/helpers.ts:20`
- **Original severity preserved:** LOW / MEDIUM
- **Reason for deferral:** Making `now` required would require updating all ~30+ call sites across the codebase in a single batch change. Making it internally call `getDbNowUncached()` would require making the function async, also updating all call sites. Both approaches are significant refactors that could introduce regressions. The immediate fix (H1 in rpf-11) addresses the most impactful call sites. The docstring already warns about the default behavior.
- **Exit criterion:** When a new clock-skew instance is introduced via `withUpdatedAt()` without `now`, or when a dedicated refactoring cycle is scheduled for the helpers module.

### DEFER-2: Audit events failure tracker `new Date()` for `lastAuditEventWriteFailureAt` (carried from rpf-11 DEFER-2, originally AGG-4 rpf-11)

- **Source:** AGG-4 (rpf-11)
- **Severity / confidence:** LOW / LOW
- **Citations:** `src/lib/audit/events.ts:117`
- **Original severity preserved:** LOW / LOW
- **Reason for deferral:** The `lastAuditEventWriteFailureAt` field is used purely for health monitoring/diagnostic output. Not used for comparison, access control, or data integrity. Replacing with `getDbNowUncached()` would require making the flush path async-aware, adding complexity for negligible benefit.
- **Exit criterion:** When the audit events module is next refactored, or when a developer reports diagnostic timestamp confusion.

### DEFER-3: `streamBackupWithFiles` memory buffering architecture (AGG-6)

- **Source:** AGG-6
- **Severity / confidence:** MEDIUM / HIGH
- **Citations:** `src/lib/db/export-with-files.ts:112-182`
- **Original severity preserved:** MEDIUM / HIGH
- **Reason for deferral:** This is an architectural limitation of using JSZip (non-streaming). Migrating to a streaming ZIP library (e.g., `archiver`) is a significant refactor that affects the entire backup/restore pipeline. The current approach works correctly for small/medium databases. This should be addressed in a dedicated cycle focused on backup infrastructure improvements.
- **Exit criterion:** When a database reaches a size where memory pressure during backup becomes a production issue, or when a dedicated backup infrastructure cycle is scheduled.

### DEFER-4: Health endpoint timestamps using `new Date()` (CR-5, CR-6)

- **Source:** CR-5, CR-6 (code-reviewer)
- **Severity / confidence:** LOW / LOW
- **Citations:** `src/lib/ops/admin-health.ts:53`, `src/app/api/v1/health/route.ts:31`
- **Original severity preserved:** LOW / LOW
- **Reason for deferral:** These are diagnostic/monitoring timestamps that should reflect "when this health check ran" from the app server's perspective. Using `getDbNow()` would add a DB round-trip to every health check, which is counterproductive for a monitoring endpoint. The current behavior is arguably correct for the use case.
- **Exit criterion:** When a monitoring system requires DB-synchronized health check timestamps, or when `getDbNowUncached()` overhead becomes negligible (e.g., connection pooling optimization).

---

## Carried Deferred Items (from Prior Cycles)

All other deferred items from prior cycle remediation plans remain unchanged. See archived plan files for the full deferred list.

---

## Progress log

- 2026-04-20: Plan created from rpf-13 aggregate review.
- 2026-04-20: H1 DONE — added server-computed `isExpired` boolean to recruiting invitations and API keys API responses; updated client components to use server-provided field instead of browser clock comparison. Commit 808254ae.
- 2026-04-20: M1 DONE — made `dbNow` a required parameter in `createBackupIntegrityManifest()`, removing `new Date()` fallback. Commit 636b7f57.
- 2026-04-20: M2 DONE — backup download now uses server-provided filename from `Content-Disposition` header instead of client-side `new Date()` timestamp. Commit e762e77e.
- 2026-04-20: M3 DONE — replaced hardcoded "Loading..." with `tCommon("loading")` in recruiting invitations panel and API keys client. Commit e9be9f69.
- 2026-04-20: L1 DONE — added `dbNow` passthrough from backup route through `streamBackupWithFiles()` to `streamDatabaseExport()`, eliminating 2 redundant `SELECT NOW()` calls per backup. Commit d5f387b3.
- 2026-04-20: All gates green (eslint, tsc --noEmit, vitest 292/2063, next build).
