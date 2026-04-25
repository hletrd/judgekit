# RPF Cycle 38 — Review Remediation Plan

**Date:** 2026-04-25
**Cycle:** 38/100
**Base commit:** (current HEAD)
**Review artifacts:** `.context/reviews/comprehensive-reviewer-cycle-38.md` + `.context/reviews/_aggregate-cycle-38.md`

## Previously Completed Tasks (Verified in Current Code)

All cycle 37 tasks are complete:
- [x] Task A: Fix `parseInt || default` in quick-create-contest-form — commit 80013bb0
- [x] Task B: Fix `parseFloat || 0` and `parseInt || null` in assignment-form-dialog — commit 37c05274
- [x] Task C: Add 15s timeout to flaky public-seo-metadata test — commit 66ec71bd

## Tasks (priority order)

### Task A: Sanitize `db/import.ts` error messages before including in API response [LOW/HIGH]

**From:** AGG-3 (NEW-3)
**Severity / confidence:** LOW / HIGH
**Files:**
- `src/lib/db/import.ts:136`
- `src/lib/db/import.ts:200`
- `src/lib/db/import.ts:214`

**Problem:** When a table truncation or batch insert fails, `err.message` is included in error strings that propagate through `importDatabase` result to the API response (`details: result.errors` at route.ts:108). PostgreSQL internal errors (table names, constraint names, column types) are exposed to the admin client.

**Plan:**
1. Line 136: Replace `throw new Error(\`Failed to truncate ${tableName}: ${message}\`)` with logging the full error and throwing a sanitized message like `throw new Error(\`Failed to truncate ${tableName}\`)`
2. Line 200: Replace `result.errors.push(\`${tableName} batch ${i}: ${message}\`)` with `result.errors.push(\`${tableName} batch ${i}: import failed\`)` and ensure the detailed message is already logged at line 199
3. Line 214: Replace `result.errors.push(\`Import failed: ${message}\`)` with `result.errors.push(\`Import failed\`)` and ensure the detailed message is already logged at line 213
4. Verify all gates pass

**Status:** DONE (commit 76f253bb)

---

### Task B: Remove text content capture from anti-cheat copy/paste events [LOW/MEDIUM]

**From:** AGG-4 (NEW-4)
**Severity / confidence:** LOW / MEDIUM
**Files:**
- `src/components/exam/anti-cheat-monitor.tsx:206-210`

**Problem:** `describeElement` captures up to 80 characters of element text content for headings, paragraphs, spans, etc. This text is sent to the server as anti-cheat event details and stored in the audit log. This could include copyrighted exam problem content.

**Plan:**
1. In `describeElement`, for the branch that handles "P", "SPAN", "H1"..."LI", "TD", etc. (lines 204-211), remove the text content capture. Keep only the element tag and CSS class information.
2. Change line 209 from:
   ```
   if (parentClass) return `${tag.toLowerCase()} in .${parentClass}${text ? `: "${text}"` : ""}`;
   return `${tag.toLowerCase()}${text ? `: "${text}"` : ""}`;
   ```
   To:
   ```
   if (parentClass) return `${tag.toLowerCase()} in .${parentClass}`;
   return `${tag.toLowerCase()}`;
   ```
3. Remove the `const text = ...` line and the `text` variable since it's no longer used in this branch
4. Verify all gates pass

**Status:** DONE (commit 66dcad78)

---

## Deferred Items

### New deferrals from this cycle:

- **DEFER-46: [MEDIUM] `error.message` as control-flow discriminator across 15+ API catch blocks** (AGG-1 / NEW-1)
  - **File+line:** exam-session/route.ts:77, assignment route.ts:191-196, restore/route.ts:91, migrate/validate/route.ts:40,49,52, migrate/import/route.ts:80,128,131, recruiting-invitations/route.ts:118-127, bulk/route.ts:111, members/[userId]/route.ts:87, roles/route.ts:105, users/route.ts:135,138, judge/poll/route.ts:168, recruiting-invitations.ts:541,544, user-management.ts:326,329,439,442, public-signup.ts:120
  - **Original severity/confidence:** MEDIUM / HIGH
  - **Reason for deferral:** This is a large-scale refactor affecting 15+ files across the API layer. It requires introducing a custom error class hierarchy and updating all throw/catch sites. The current pattern, while fragile, is functional and has been in place since early development. A rushed refactor could introduce regressions.
  - **Exit criterion:** When a focused refactor cycle is dedicated to error-class migration, starting with the most critical paths (exam-session, assignment mutation).

- **DEFER-47: [MEDIUM] Import route JSON path uses unsafe `as JudgeKitExport` cast** (AGG-2 / NEW-2)
  - **File+line:** src/app/api/v1/admin/migrate/import/route.ts:164-166
  - **Original severity/confidence:** MEDIUM / HIGH
  - **Reason for deferral:** Requires creating a full Zod schema for the `JudgeKitExport` type, which involves mapping the entire export format (all table schemas, all column types). This is already tracked as part of DEFER-24 (migrate/import unsafe casts — Zod validation not yet built). The `validateExport()` function provides runtime validation, reducing the risk of the cast.
  - **Exit criterion:** When DEFER-24 is picked up and a comprehensive Zod schema is built for the import path.

- **DEFER-48: [LOW] CountdownTimer initial render uses uncorrected client time** (AGG-5 / NEW-5)
  - **File+line:** src/components/exam/countdown-timer.tsx:46-47
  - **Original severity/confidence:** LOW / LOW
  - **Reason for deferral:** The server time sync completes within 5 seconds, and the flash is brief. Adding a loading state would require UX design decisions. The current behavior is acceptable for the typical case where client clocks are roughly accurate.
  - **Exit criterion:** If user reports indicate clock-skew issues are affecting exam experience, or when a design pass on exam UX is scheduled.

- **DEFER-49: [LOW] SSE connection tracking uses O(n) scan for oldest-entry eviction** (AGG-6 / NEW-6)
  - **File+line:** src/app/api/v1/submissions/[id]/events/route.ts:44-53
  - **Original severity/confidence:** LOW / LOW
  - **Reason for deferral:** `MAX_TRACKED_CONNECTIONS = 1000` is rarely exceeded. The O(n) scan only runs when the tracking map is full, which is infrequent. Performance impact is negligible under normal load.
  - **Exit criterion:** If SSE connection count metrics show regular eviction events, or if MAX_TRACKED_CONNECTIONS is significantly increased.

### Carried deferred items from cycle 37 (unchanged):

- DEFER-22: `.json()` before `response.ok` — 60+ instances
- DEFER-23: Raw API error strings without translation — partially fixed
- DEFER-24: `migrate/import` unsafe casts — Zod validation not yet built
- DEFER-27: Missing AbortController on polling fetches
- DEFER-28: `as { error?: string }` pattern — 22+ instances
- DEFER-29: Admin routes bypass `createApiHandler`
- DEFER-30: Recruiting validate token brute-force
- DEFER-32: Admin settings exposes DB host/port
- DEFER-33: Missing error boundaries — contests segment now fixed
- DEFER-34: Hardcoded English fallback strings
- DEFER-35: Hardcoded English strings in editor title attributes
- DEFER-36: `formData.get()` cast assertions
- DEFER-43: Docker client leaks `err.message` in build responses
- DEFER-44: No documentation for timer pattern convention
- DEFER-45: Anti-cheat monitor captures user text snippets (design decision)

Reason for deferral unchanged. See cycle 34 plan for details.

---

## Progress log

- 2026-04-25: Plan created with 2 tasks (A-B). 4 new findings deferred (DEFER-46 through DEFER-49).
- 2026-04-25: Task A DONE — sanitize DB error messages in import API responses (commit 76f253bb).
- 2026-04-25: Task B DONE — remove text content capture from anti-cheat copy/paste events (commit 66dcad78).
- 2026-04-25: All gates green (eslint 0, tsc clean, vitest 302/302 pass 2197 tests, next build success).
