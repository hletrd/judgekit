# RPF Cycle 14 Review Remediation Plan

**Date:** 2026-04-20
**Source:** `.context/reviews/rpf-14-aggregate.md` and per-agent review files

---

## Scope

This cycle addresses the new rpf-14 findings from the multi-agent review:
- AGG-1: Client-computed expiresAt timestamps are persisted to database without server-side validation [MEDIUM/HIGH]
- AGG-2: `withUpdatedAt()` defaults to `new Date()` - last remaining systemic `new Date()` trap door [MEDIUM/MEDIUM]
- AGG-3: Recruiting invitation custom expiry date uses browser timezone without indication [LOW/MEDIUM]
- AGG-4: `useEffect` cleanup timer depends on `[t]` causing state leak on locale change [LOW/MEDIUM]
- AGG-5: Submissions page uses `new Date()` for period filter in server component [LOW/MEDIUM]
- AGG-6: `streamBackupWithFiles` buffers entire export in memory (carry from rpf-13) [MEDIUM/HIGH]
- AGG-7: User profile activity heatmap uses `new Date()` in server component [LOW/LOW]

No rpf-14 review finding is silently dropped. No new refactor-only work is added under deferred.

---

## Implementation lanes

### H1: Change API key and recruiting invitation creation to accept expiry duration instead of client-computed timestamp (AGG-1)

- **Source:** AGG-1
- **Severity / confidence:** MEDIUM / HIGH
- **Citations:** `src/app/api/v1/admin/api-keys/route.ts:81`, `src/components/contest/recruiting-invitations-panel.tsx:141`, `src/app/api/v1/contests/[assignmentId]/recruiting-invitations/route.ts`
- **Problem:** Both API key and recruiting invitation creation endpoints accept absolute `expiresAt` timestamps computed by the client using browser time. The server validates format but not the value's relationship to DB server time. The `isExpired` check uses `NOW()` (DB time), creating a mismatch. A malicious or clock-skewed client can set arbitrary expiry timestamps. 10 of 11 review agents flagged this.
- **Plan:**
  1. **API keys:**
     a. In `src/app/api/v1/admin/api-keys/route.ts`, change the POST schema from `expiresAt: z.string().datetime().nullable().optional()` to `expiryDays: z.number().int().min(1).max(3650).nullable().optional()`
     b. In the handler, compute `expiresAt` server-side: `expiryDays ? new Date((await getDbNowUncached()).getTime() + expiryDays * 86400000) : null`
     c. Add import for `getDbNowUncached` from `@/lib/db-time`
     d. In `src/app/(dashboard)/dashboard/admin/api-keys/api-keys-client.tsx`, change the create request body from `{ name, role, expiresAt }` to `{ name, role, expiryDays }`. Remove the `new Date(Date.now() + days * 86400000).toISOString()` computation.
     e. Keep the expiry label dropdown ("None", "30d", "90d", "1y") but map to `{ expiryDays: 30 }` etc. instead of computing ISO timestamps.
  2. **Recruiting invitations:**
     a. In the recruiting invitations API route, change the schema similarly: accept `expiryDays` instead of `expiresAt`
     b. Compute `expiresAt` server-side using `getDbNowUncached()`
     c. In `src/components/contest/recruiting-invitations-panel.tsx`, update `handleCreate()` to send `expiryDays` instead of `expiresAt`
     d. For the custom date picker: send `expiryDays` computed from the selected date relative to "now" (still approximate, but the server will recompute). Alternatively, keep a `customExpiryDate` field that the server validates and computes the end-of-day in UTC.
  3. **PATCH endpoint for API keys:**
     a. In `src/app/api/v1/admin/api-keys/[id]/route.ts`, change `expiresAt` in the update schema to `expiryDays: z.number().int().min(1).max(3650).nullable().optional()`
     b. Compute `expiresAt` server-side similarly
  4. Verify tsc --noEmit passes
  5. Verify existing tests pass
- **Status:** DONE

### H2: Make `now` parameter required in `withUpdatedAt()` (AGG-2)

- **Source:** AGG-2
- **Severity / confidence:** MEDIUM / MEDIUM
- **Citations:** `src/lib/db/helpers.ts:20`
- **Problem:** `withUpdatedAt()` falls back to `new Date()` when `now` is not provided. 9 of 11 callers use the default, creating `updatedAt` timestamps that may differ from DB-time. This is the same pattern fixed in `createBackupIntegrityManifest` and `getContestStatus`. In `users/[id]/route.ts:478`, `tokenInvalidatedAt` uses DB time while `updatedAt` uses `new Date()` in the same row update. 7 of 11 agents flagged this.
- **Plan:**
  1. Change `withUpdatedAt(data, now?)` to `withUpdatedAt(data, now: Date)` in `src/lib/db/helpers.ts`
  2. Remove the `?? new Date()` fallback
  3. Update all callers to pass `now` explicitly:
     - `src/app/api/v1/users/[id]/route.ts:362` — pass `await getDbNowUncached()`
     - `src/app/api/v1/users/[id]/route.ts:478` — pass the already-fetched `getDbNowUncached()` result
     - `src/app/api/v1/groups/[id]/route.ts:144` — pass `await getDbNowUncached()`
     - `src/app/api/v1/admin/roles/[id]/route.ts:99` — pass `await getDbNowUncached()`
     - `src/app/api/v1/admin/plugins/[id]/route.ts:75` — pass `await getDbNowUncached()`
     - `src/app/api/v1/admin/plugins/[id]/route.ts:106` — pass `await getDbNowUncached()`
     - `src/lib/actions/plugins.ts:123` — pass `now` (caller already has it in scope)
     - `src/lib/actions/update-profile.ts:96` — pass `await getDbNowUncached()`
     - `src/lib/actions/update-preferences.ts:104` — pass `await getDbNowUncached()`
  4. Note: `src/lib/actions/plugins.ts:52` and `src/app/api/v1/admin/api-keys/[id]/route.ts:53` already pass `now` — no change needed.
  5. Update JSDoc to reflect the required parameter
  6. Verify tsc --noEmit passes
  7. Verify existing tests pass
- **Status:** DONE

### M1: Fix recruiting invitation custom expiry date timezone handling (AGG-3)

- **Source:** AGG-3
- **Severity / confidence:** LOW / MEDIUM
- **Citations:** `src/components/contest/recruiting-invitations-panel.tsx:138`
- **Problem:** Custom expiry date is constructed as `new Date(customExpiryDate + "T23:59:59").toISOString()`, which interprets the time in the browser's local timezone. Admins in different timezones selecting the same calendar date will store different `expiresAt` values.
- **Plan:**
  1. This is largely resolved by H1: the server will compute `expiresAt` using DB time.
  2. For the custom date case, the client should send the selected date as-is (e.g., `"2026-04-30"`) and the server should compute the end-of-day in UTC (23:59:59 UTC).
  3. Add a UI hint near the date picker indicating the timezone used (e.g., "End of day UTC")
  4. Verify the date picker works correctly across timezone boundaries
- **Status:** DONE (resolved by H1: server computes end-of-day UTC)

### M2: Fix `useEffect` cleanup timer dependency in API keys client (AGG-4)

- **Source:** AGG-4
- **Severity / confidence:** LOW / MEDIUM
- **Citations:** `src/app/(dashboard)/dashboard/admin/api-keys/api-keys-client.tsx:98-105`
- **Problem:** The cleanup `useEffect` for copy-feedback timers depends on `[t]`. When locale changes, timers are cleared but `copiedKeyId` state is not reset, causing the "Copied" indicator to persist indefinitely.
- **Plan:**
  1. Change the dependency array from `[t]` to `[]`
  2. The cleanup function only clears timers and does not depend on `t`
  3. Verify the copy feedback still works correctly
- **Status:** DONE

### M3: Use `getDbNow()` for period filter in submissions page (AGG-5)

- **Source:** AGG-5
- **Severity / confidence:** LOW / MEDIUM
- **Citations:** `src/app/(public)/submissions/page.tsx:67`
- **Problem:** The `getPeriodStart()` function uses `new Date()` to compute period boundaries. Since this is a server component, it should use `getDbNow()` for consistency.
- **Plan:**
  1. Call `const dbNow = await getDbNow();` at the top of `SubmissionsPage`
  2. Pass `dbNow` as a parameter to `getPeriodStart(period, dbNow)`
  3. Update `getPeriodStart` to use the passed-in date instead of `new Date()`
  4. Verify the period filters still work correctly
- **Status:** DONE

### L1: Use `getDbNow()` for user profile activity heatmap (AGG-7)

- **Source:** AGG-7
- **Severity / confidence:** LOW / LOW
- **Citations:** `src/app/(public)/users/[id]/page.tsx:171`
- **Problem:** The activity heatmap generates the 90-day window using `new Date()`. Should use `getDbNow()` for consistency.
- **Plan:**
  1. Call `const dbNow = await getDbNow();` in the page component
  2. Use `dbNow` instead of `new Date()` in the heatmap day generation
  3. Verify the heatmap displays correctly
- **Status:** DONE

---

## Deferred items

### DEFER-1: Make `withUpdatedAt()` `now` parameter required (NOW SCHEDULED as H2)

- **Source:** AGG-2 (rpf-10), carried forward through rpf-11, rpf-12b, rpf-13
- **Previous status:** DEFERRED
- **Current status:** PROMOTED to H2 this cycle. The rpf-14 review identified a concrete instance of the bug (users/[id]/route.ts:478 has `tokenInvalidatedAt` using DB time while `updatedAt` uses `new Date()` in the same row). This meets the exit criterion from prior deferral: "When a new clock-skew instance is introduced via `withUpdatedAt()` without `now`."

### DEFER-2: Audit events failure tracker `new Date()` for `lastAuditEventWriteFailureAt` (carried from rpf-11)

- **Source:** AGG-4 (rpf-11)
- **Severity / confidence:** LOW / LOW
- **Citations:** `src/lib/audit/events.ts:117`
- **Original severity preserved:** LOW / LOW
- **Reason for deferral:** Purely diagnostic output. Not used for comparison, access control, or data integrity. Replacing with `getDbNowUncached()` would require making the flush path async-aware.
- **Exit criterion:** When the audit events module is next refactored, or when a developer reports diagnostic timestamp confusion.

### DEFER-3: `streamBackupWithFiles` memory buffering architecture (AGG-6, carried from rpf-13)

- **Source:** AGG-6 (rpf-13, carried to rpf-14 as AGG-6)
- **Severity / confidence:** MEDIUM / HIGH
- **Citations:** `src/lib/db/export-with-files.ts:112-182`
- **Original severity preserved:** MEDIUM / HIGH
- **Reason for deferral:** Architectural limitation of JSZip (non-streaming). Migrating to a streaming ZIP library is a significant refactor. Current approach works for small/medium databases. Short-term mitigation (warning log for large exports) not yet implemented but also low urgency.
- **Exit criterion:** When a database reaches a size where memory pressure during backup becomes a production issue, or when a dedicated backup infrastructure cycle is scheduled.

### DEFER-4: Health endpoint timestamps using `new Date()` (carried from rpf-13)

- **Source:** CR-5, CR-6 (code-reviewer, rpf-13)
- **Severity / confidence:** LOW / LOW
- **Citations:** `src/lib/ops/admin-health.ts:53`, `src/app/api/v1/health/route.ts:31`
- **Original severity preserved:** LOW / LOW
- **Reason for deferral:** Diagnostic timestamps that should reflect "when this health check ran" from the app server's perspective. Adding a DB round-trip to every health check is counterproductive.
- **Exit criterion:** When a monitoring system requires DB-synchronized health check timestamps.

### DEFER-5: `document.execCommand("copy")` deprecation (new this cycle)

- **Source:** CR-7 (code-reviewer)
- **Severity / confidence:** LOW / LOW
- **Citations:** `src/components/code/copy-code-button.tsx:28`, `src/app/(dashboard)/dashboard/admin/api-keys/api-keys-client.tsx:220`
- **Original severity preserved:** LOW / LOW
- **Reason for deferral:** `document.execCommand("copy")` is deprecated but still functional in all major browsers. It's used only as a fallback when `navigator.clipboard.writeText()` fails. No browser has announced removal timeline yet.
- **Exit criterion:** When a major browser removes support for `document.execCommand("copy")`, or when a dedicated UI modernization cycle is scheduled.

---

## Progress log

- 2026-04-20: Plan created from rpf-14 aggregate review. 7 findings, 6 scheduled for implementation (H1, H2, M1, M2, M3, L1), 1 carry-over deferred (AGG-6/DEFER-3). Prior DEFER-1 promoted to H2.
- 2026-04-20: All scheduled items implemented. H1 (API keys + recruiting invitations: expiryDays/expiryDate), H2 (withUpdatedAt now required), M1 (custom date UTC), M2 (useEffect cleanup), M3 (submissions period filter), L1 (user heatmap). All gates green.
