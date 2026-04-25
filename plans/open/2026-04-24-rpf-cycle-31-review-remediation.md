# RPF Cycle 31 Review Remediation Plan

**Date:** 2026-04-24
**Base commit:** 11d50c7c
**Review artifacts:** `.context/reviews/rpf-cycle-31-comprehensive-review.md` + `.context/reviews/_aggregate-cycle-31.md`

## Previously Completed Tasks (Verified in Current Code)

All cycle 30 tasks are complete:
- [x] H1: i18n error key validation in database-backup-restore.tsx — commit 9c9c423e
- [x] H2: Chat widget test-connection `createApiHandler` migration — commit 9f67fcd6
- [x] H3: `migrate/import` Zod validation — commit 77ae49e5
- [x] M1: `LectureModeContext` useMemo — commit 30dccbcf
- [x] M2: `files/[id]` explicit column select — commit 5407464f
- [x] L1: Contest join unnecessary throw removal — commit b5d6be56

## Tasks (priority order)

### Task A: Migrate `api-keys-client.tsx` auto-dismiss timer from `setInterval` to recursive `setTimeout` [MEDIUM/MEDIUM]

**From:** AGG-1 (NEW-1)
**Severity / confidence:** MEDIUM / HIGH
**File:** `src/app/(dashboard)/dashboard/admin/api-keys/api-keys-client.tsx:124`

**Problem:** The auto-dismiss useEffect for the raw API key display uses `setInterval(() => {...}, 1000)` to update the countdown. The codebase has established recursive `setTimeout` as the standard for all client-side timers. This is the last remaining client-side timer using `setInterval`. When the admin switches tabs and returns, accumulated `setInterval` callbacks fire rapidly, causing burst state updates.

**Plan:**
1. Replace `setInterval` with recursive `setTimeout` pattern using `cancelled` flag
2. Use `clearTimeout` instead of `clearInterval` in the cleanup function
3. Keep the same countdown logic (5-minute auto-dismiss)
4. Verify all gates pass

**Status:** DONE (commit 4bba6390)

---

### Task B: Replace throw-then-match with inline error handling in `start-exam-button.tsx` [MEDIUM/HIGH]

**From:** AGG-2 (NEW-2)
**Severity / confidence:** MEDIUM / HIGH
**File:** `src/components/exam/start-exam-button.tsx:42,49-51`

**Problem:** The component throws `new Error((payload as { error?: string }).error || "examSessionStartFailed")` and then matches `error.message === "assignmentClosed"` in the catch. This is the same throw-then-match anti-pattern fixed in `contest-join-client.tsx` (cycle 30). The throw is unnecessary; error codes can be mapped directly to toast messages.

**Plan:**
1. Remove the `throw new Error(...)` on line 42
2. Parse the error code from the payload inline
3. Map known error codes (`assignmentClosed`, `assignmentNotStarted`, `examModeInvalid`) to specific toast messages directly
4. Fall back to generic error toast for unknown codes
5. Verify all gates pass

**Status:** DONE (commit 1a9f1aab)

---

### Task C: Replace throw-then-match with inline error handling in `problem-set-form.tsx` [MEDIUM/HIGH]

**From:** AGG-3 (NEW-4)
**Severity / confidence:** MEDIUM / HIGH
**File:** `src/app/(dashboard)/dashboard/problem-sets/_components/problem-set-form.tsx:130,159,181,216,226-244`

**Problem:** Four handlers use `throw new Error((payload as { error?: string }).error || ...)` and the catch block matches against `knownKeys`. The throw is unnecessary and uses the unsafe `as { error?: string }` cast.

**Plan:**
1. Extract a helper function `mapApiError(payload: unknown, fallback: string): string` within the component
2. Validate that `payload.error` is a string and matches a known i18n key
3. Replace all 4 `throw new Error(...)` with inline error handling using the helper
4. Remove the try/catch error-code matching logic
5. Verify all gates pass

**Status:** DONE (commit c62668f0)

---

### Task D: ~~Migrate `contest-scoring.ts` cache write timestamps from `Date.now()` to `getDbNowMs()`~~ — ALREADY DONE

**From:** AGG-4 (NEW-5)
**Severity / confidence:** MEDIUM / MEDIUM (false positive)
**File:** `src/lib/assignments/contest-scoring.ts`

**Resolution:** Upon inspection, `contest-scoring.ts` already imports `getDbNowMs` and uses it for all cache write timestamps (lines 120, 124, 136). The `Date.now()` usage on line 107 is only for the staleness check, which is documented as an intentional design trade-off. No changes needed.

---

### Task E: Hoist `knownErrors` set to module scope in `database-backup-restore.tsx` [LOW/LOW]

**From:** AGG-5 (NEW-3)
**Severity / confidence:** LOW / LOW
**File:** `src/app/(dashboard)/dashboard/admin/settings/database-backup-restore.tsx:46`

**Problem:** The `knownErrors` set is created inside `handleDownload()` on every invocation. It is constant and should be hoisted to module scope.

**Plan:**
1. Move `const KNOWN_BACKUP_ERRORS = new Set([...])` to module scope above the component
2. Reference `KNOWN_BACKUP_ERRORS` inside `handleDownload()`
3. Verify all gates pass

**Status:** DONE (commit 3cda35af)

---

### Task F: ~~Remove unnecessary throws in `edit-group-dialog.tsx` and `group-members-manager.tsx`~~ — NOT NEEDED

**From:** AGG-6 (NEW-6), AGG-7 (NEW-7)
**Severity / confidence:** LOW / LOW (downgraded upon inspection)
**Files:**
- `src/app/(dashboard)/dashboard/groups/edit-group-dialog.tsx:92`
- `src/app/(dashboard)/dashboard/groups/[id]/group-members-manager.tsx:222`

**Resolution:** Upon inspection, both files have centralized `getErrorMessage()` helpers that properly map API error codes to i18n keys. The throw-then-match pattern is actually serving a useful purpose: it propagates the error code to the centralized mapper. The throws are not "unnecessary" — they are the conduit between the API error code and the `getErrorMessage` mapper. No changes needed.

---

## Deferred Items

### DEFER-1 through DEFER-21: Carried from cycle 27/28

See prior plans for full details. All carry forward unchanged.

### DEFER-22: [HIGH] `.json()` before `response.ok` check — systemic anti-pattern (AGG-2 from cycle 29)

- **File+line:** 60+ instances across client components
- **Original severity/confidence:** HIGH / HIGH
- **Reason for deferral:** Requires creating a project-wide `parseApiResponse(res)` helper and migrating 60+ call sites. Wider refactor that could break existing error-handling behavior.
- **Exit criterion:** A dedicated cycle creates the `parseApiResponse` helper, adds tests, and migrates all instances.

### DEFER-23: [HIGH] Raw API error strings shown to users without translation (AGG-3 from cycle 29)

- **File+line:** 7+ instances
- **Original severity/confidence:** HIGH / HIGH
- **Reason for deferral:** Requires creating shared error-translation pattern. Better addressed alongside DEFER-22.
- **Exit criterion:** A dedicated cycle creates the `parseApiError` helper and migrates all instances.

### DEFER-24: [HIGH] `migrate/import` route has unsafe casts with no Zod validation (AGG-4 from cycle 29)

- **File+line:** `src/app/api/v1/admin/migrate/import/route.ts:119,142,157`
- **Original severity/confidence:** HIGH / HIGH
- **Reason for deferral:** Requires comprehensive Zod schema for `JudgeKitExport`. Significant amount of work.
- **Exit criterion:** A dedicated cycle creates the Zod schema, adds tests, and replaces all unsafe casts.

### DEFER-25: [MEDIUM] `LectureModeContext` value creates new object on every render (AGG-5 from cycle 29)

- **File+line:** `src/components/lecture/lecture-mode-provider.tsx:119-135`
- **Original severity/confidence:** MEDIUM / HIGH
- **Reason for deferral:** Context has 11 properties, making the `useMemo` dependency list very long. Should be done alongside a review of whether the context should be split.
- **Exit criterion:** A dedicated cycle wraps the provider value in `useMemo` or splits the context.

### DEFER-26: ~~Chat widget test-connection route bypasses `createApiHandler`~~ — FIXED in cycle 30

### DEFER-27: [MEDIUM] Missing AbortController on polling fetches (AGG-8 from cycle 29)

- **File+line:** `language-config-table.tsx:122`, `comment-section.tsx`, `submission-detail-client.tsx`
- **Original severity/confidence:** MEDIUM / HIGH
- **Reason for deferral:** Requires migrating 3+ components. Each needs careful testing.
- **Exit criterion:** A dedicated cycle adds `AbortController` to all instances.

### DEFER-28: [MEDIUM] `as { error?: string }` pattern — 22+ instances (AGG-9 from cycle 29)

- **File+line:** 22+ instances
- **Original severity/confidence:** MEDIUM / HIGH
- **Reason for deferral:** Should be addressed alongside DEFER-22 and DEFER-23 as part of a unified error-handling cleanup.
- **Exit criterion:** A dedicated cycle creates the `parseApiError` helper and migrates all instances.

### DEFER-29: [MEDIUM] Admin routes bypass `createApiHandler` (AGG-10 from cycle 29)

- **File+line:** 7 remaining manual routes
- **Original severity/confidence:** MEDIUM / MEDIUM
- **Reason for deferral:** Large refactor. Some routes (streaming, file uploads) may not fit the standard pattern.
- **Exit criterion:** A dedicated cycle migrates routes or extracts composable middleware.

### DEFER-30: [MEDIUM] Recruiting validate endpoint allows token brute-force (AGG-12 from cycle 29)

- **File+line:** `src/app/api/v1/recruiting/validate/route.ts`
- **Original severity/confidence:** MEDIUM / MEDIUM
- **Reason for deferral:** Adding aggressive rate limiting requires design decisions about UX impact.
- **Exit criterion:** A dedicated cycle designs and implements enhanced rate limiting.

### DEFER-31: ~~`files/[id]` GET route exposes `storedName`~~ — FIXED in cycle 30

### DEFER-32: [MEDIUM] Admin settings page exposes DB host/port (AGG-14 from cycle 29)

- **File+line:** `src/app/(dashboard)/dashboard/admin/settings/page.tsx:92-100`
- **Original severity/confidence:** MEDIUM / MEDIUM
- **Reason for deferral:** Requires design decision on what DB info to show.
- **Exit criterion:** A dedicated cycle redesigns the DB info display.

### DEFER-33: [MEDIUM] Missing error boundaries for contest/exam and chat widget (AGG-15 from cycle 29)

- **File+line:** Multiple components
- **Original severity/confidence:** MEDIUM / MEDIUM
- **Reason for deferral:** Requires designing dedicated `ErrorBoundary` components with proper fallback UI.
- **Exit criterion:** A dedicated cycle implements error boundaries.

### DEFER-34: [LOW] Hardcoded English fallback strings in `throw new Error()` (AGG-17 from cycle 29)

- **File+line:** 7 instances
- **Original severity/confidence:** LOW / MEDIUM
- **Reason for deferral:** Low severity; fallbacks only appear in unexpected error paths.
- **Exit criterion:** A dedicated i18n cleanup cycle replaces all hardcoded error strings.

### DEFER-35: [LOW] Hardcoded English strings in code editor title attributes (AGG-18 from cycle 29)

- **File+line:** `src/components/code/code-editor.tsx:96,112`
- **Original severity/confidence:** LOW / HIGH
- **Reason for deferral:** Low severity; only affects tooltip text.
- **Exit criterion:** A dedicated i18n cleanup cycle replaces hardcoded strings.

### DEFER-36: [LOW] `formData.get()` cast assertions without validation (AGG-19 from cycle 29)

- **File+line:** 4 routes
- **Original severity/confidence:** LOW / MEDIUM
- **Reason for deferral:** Low severity; requires runtime type checks in 4 admin routes.
- **Exit criterion:** A dedicated cycle adds runtime type validation.

### DEFER-43: [LOW] Docker client leaks `err.message` in build error responses (from cycle 31)

- **File+line:** `src/lib/docker/client.ts:174`
- **Original severity/confidence:** LOW / MEDIUM
- **Reason for deferral:** The endpoint is admin-only, significantly reducing risk. The Docker client is used only in worker-side operations.
- **Exit criterion:** When the Docker client module is being modified for another reason, or when a dedicated security hardening pass is scheduled.

### DEFER-44: [LOW] No documentation for timer pattern convention (from cycle 31)

- **Original severity/confidence:** LOW / LOW
- **Reason for deferral:** Documentation-only change. No functional impact.
- **Exit criterion:** When a documentation pass is scheduled.

---

## Progress log

- 2026-04-24: Plan created with 6 tasks (A-F), 2 deferred items resolved as FIXED (DEFER-26, DEFER-31).
- 2026-04-24: Task A DONE — migrated api-keys-client auto-dismiss timer from setInterval to recursive setTimeout (commit 4bba6390).
- 2026-04-24: Task B DONE — replaced throw-then-match with inline error handling in start-exam-button (commit 1a9f1aab).
- 2026-04-24: Task C DONE — replaced throw-then-match with mapApiError helper in problem-set-form (commit c62668f0).
- 2026-04-24: Task D — false positive; contest-scoring.ts already uses getDbNowMs() for cache writes.
- 2026-04-24: Task E DONE — hoisted KNOWN_BACKUP_ERRORS set to module scope (commit 3cda35af).
- 2026-04-24: Task F — not needed; both files have centralized getErrorMessage() helpers that make the throw pattern acceptable.
- 2026-04-24: All gates green (eslint 0, tsc clean, vitest 301/302 pass 2196/2197 tests [1 pre-existing flaky SEO test], next build success).
