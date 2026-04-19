# Cycle 6 Review Remediation Plan

**Date:** 2026-04-19
**Source:** `.context/reviews/cycle-6-comprehensive-review.md`, `.context/reviews/_aggregate.md`
**Status:** COMPLETE

## Deduplication note
Cycle 5b plan is COMPLETE. This plan covers findings that are genuinely NEW from the cycle 6 deep review.

---

## Implementation Stories

### SHUTDOWN-02: Remove duplicate SIGTERM handler from SSE events route

**Severity:** HIGH | **Confidence:** HIGH | **Effort:** Quick win

**Files:**
- `src/app/api/v1/submissions/[id]/events/route.ts:79-89`

**Problem:** The SSE events route registers its own `process.on("SIGTERM")` handler at module evaluation time to clear connection tracking data structures. This duplicates the pattern fixed in cycle 5b (SHUTDOWN-01) for the audit module. While the SSE handler only clears in-memory data (no async flush), it's inconsistent with the established pattern and adds unnecessary process-level signal handlers.

**Fix:**
1. Remove the `process.on("SIGTERM")` handler block (lines 79-89)
2. Remove the associated `__sseShutdownHandler` global declaration (lines 80-82)
3. Add a comment noting that in-memory connection tracking is cleaned up on process exit

**Verification:** `npx tsc --noEmit`, `npx vitest run`

---

### SQL-01: Fix raw SQL fragment column references in public user profile page

**Severity:** HIGH | **Confidence:** HIGH | **Effort:** Quick win

**Files:**
- `src/app/(public)/users/[id]/page.tsx:27` -- replace `db._.fullSchema.users.id` with `users.id`
- `src/app/(public)/users/[id]/page.tsx:52` -- replace `eq(sql\`id\`, id)` with `eq(users.id, id)`

**Problem:** Two issues in the same file:
1. Line 27 uses `eq(db._.fullSchema.users.id, id)` which accesses Drizzle's internal `db._` API -- fragile and non-standard.
2. Line 52 uses `eq(sql\`id\`, id)` which bypasses Drizzle's column reference system and table-qualified references.

Both should use `eq(users.id, id)` with the `users` schema imported from `@/lib/db/schema`.

**Fix:**
1. Add `import { users } from "@/lib/db/schema"` (if not already imported)
2. Replace `eq(db._.fullSchema.users.id, id)` with `eq(users.id, id)` at line 27
3. Replace `eq(sql\`id\`, id)` with `eq(users.id, id)` at line 52
4. Remove unused `sql` import if no longer needed

**Verification:** `npx tsc --noEmit`, `npx vitest run`

---

### DATA-06: Restrict column selection in files DELETE handler

**Severity:** LOW | **Confidence:** HIGH | **Effort:** Quick win

**Files:**
- `src/app/api/v1/files/[id]/route.ts:145-149`

**Problem:** The DELETE handler uses `db.select().from(files)` without column restriction, loading all columns including potentially unnecessary ones. It only needs `id`, `storedName`, `originalName`, and `uploadedBy`.

**Fix:**
Replace `db.select().from(files).where(...)` with:
```ts
const [file] = await db
  .select({
    id: files.id,
    storedName: files.storedName,
    originalName: files.originalName,
    uploadedBy: files.uploadedBy,
  })
  .from(files)
  .where(eq(files.id, id))
  .limit(1);
```

**Verification:** `npx tsc --noEmit`, `npx vitest run`

---

### DATA-07: Add column selection to getAllPluginStates() query

**Severity:** LOW | **Confidence:** HIGH | **Effort:** Quick win

**Files:**
- `src/lib/plugins/data.ts:52`

**Problem:** `db.select().from(plugins)` with no WHERE or column restriction. Only `id`, `enabled`, `config`, and `updatedAt` are used from the result.

**Fix:**
Replace `db.select().from(plugins)` with:
```ts
const rows = await db
  .select({
    id: plugins.id,
    enabled: plugins.enabled,
    config: plugins.config,
    updatedAt: plugins.updatedAt,
  })
  .from(plugins);
```

**Verification:** `npx tsc --noEmit`, `npx vitest run`

---

### DATA-08: Add column selection to judge claim test cases query

**Severity:** LOW | **Confidence:** MEDIUM | **Effort:** Moderate

**Files:**
- `src/app/api/v1/judge/claim/route.ts:301-305`

**Problem:** `db.select().from(testCases)` without column restriction. The judge worker needs specific test case fields but loading all columns is unnecessary and inconsistent with data-minimization patterns.

**Fix:**
Identify which test case columns the judge worker actually needs and add explicit column selection. Need to check the `testCases` schema and the response contract with the Rust worker.

**Verification:** `npx tsc --noEmit`, `npx vitest run`

---

## Deferred Items

These findings are explicitly deferred per the review. Each records the file+line citation, original severity/confidence, concrete reason, and exit criterion.

| ID | Finding | Severity | Confidence | Reason for deferral | Exit criterion |
|----|---------|----------|------------|---------------------|----------------|
| F5 | SSE route not using createApiHandler | LOW | HIGH | Creating a `createSseHandler` variant would be a significant refactor for a single route. The current manual implementation works correctly. Document as a known exception. | SSE streaming pattern becomes a reusable abstraction |
| F6 | Export Content-Disposition headers don't RFC 5987-encode | LOW | MEDIUM | Current filename sanitization works correctly for safety (strips non-ASCII). RFC 5987 encoding is an i18n enhancement, not a bug. | i18n filename encoding is prioritized |
| Apr-19 C1 | Assistant roles can browse global user directory via `users.view` | MEDIUM | HIGH | Design decision pending -- may be intentional for the assistant workflow | Product decision on assistant user directory access |
| C6 (cycle 4) | Error boundary pages use `console.error` | LOW | HIGH | Client-side React convention. Adding server-side error reporting is a feature request. | Client-side error monitoring service is adopted |
| C7 (cycle 4) | `as never` type assertion in problem-submission-form.tsx | LOW | LOW | Dynamic translation keys are inherently hard to type statically without a complex discriminated union. | A type-safe translation key approach is adopted for the codebase |
| A2 (cycle 4) | Rate limit eviction could delete SSE connection slots | MEDIUM | HIGH | Heartbeat refreshes `lastAttempt` every 60s, making 24h eviction unlikely to affect active SSE slots. Architecturally fragile but not an active risk. | SSE connection tracking is moved to a separate table or `purpose` column |
| A7 (cycle 4) | Dual encryption key management systems | MEDIUM | HIGH | Operational concern; consolidation requires migration of existing encrypted data. | Encryption key rotation or migration tool is implemented |
| A12 (cycle 4) | Inconsistent auth/authorization patterns | MEDIUM | MEDIUM | Convention enforcement requires auditing all routes; existing routes work correctly. | All routes are migrated to `createApiHandler` |
| A17 (cycle 4) | JWT contains excessive UI preference data | LOW | MEDIUM | Would require session restructure and client-side changes. | JWT/session architecture is refactored |
| A19 (cycle 4) | `new Date()` clock skew risk | LOW | MEDIUM | Only affects distributed deployments with unsynchronized clocks. | Critical ordering uses PostgreSQL `now()` |
| A25 (cycle 4) | Timing-unsafe bcrypt fallback | LOW | MEDIUM | bcrypt-to-argon2 migration is in progress; timing difference shrinks as migration progresses. | bcrypt migration is complete |
| A26 (cycle 4) | Polling-based backpressure wait | LOW | LOW | Affects only very large exports; no production reports of issues. | Export streaming is refactored |

---

## Progress Ledger

| Story | Status | Commit |
|---|---|---|
| SHUTDOWN-02 | Done | `92f7e272` |
| SQL-01 | Done | `055622ac` |
| DATA-06 | Done | `7e21505d` |
| DATA-07 | Done | `c72a96e8` |
| DATA-08 | Done | `cd2ef4ed` |
