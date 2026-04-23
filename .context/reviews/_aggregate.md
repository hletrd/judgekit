# RPF Cycle 27 — Aggregate Review

**Date:** 2026-04-22
**Base commit:** 14025d58
**Review artifacts:** code-reviewer.md, perf-reviewer.md, security-reviewer.md, architect.md, critic.md, verifier.md, debugger.md, test-engineer.md, tracer.md, designer.md

## Previously Fixed Items (Verified in Current Code)

All cycle-26 aggregate findings have been addressed:
- AGG-1 (double `.json()` anti-pattern in 3 files): Fixed — migrated to "parse once, then branch"
- AGG-2 (compiler-client raw error in inline display): Fixed — uses i18n key
- AGG-3 (handleResetAccountPassword missing fetchAll): Fixed
- AGG-4 (quick-stats redundant `!` assertions): Fixed
- AGG-5 (contest-replay setInterval): Deferred (LOW/LOW)
- AGG-6 (sidebar interval re-entry): Deferred (LOW/LOW)

All prior cycle-27 findings also fixed:
- Clock-skew on recruit page: Fixed — uses `getDbNow()`
- toLocaleString locale issue: Fixed — uses `formatDateTimeInTimeZone()`
- Error boundary console.error gating: Fixed (4 files)
- create-problem-form console.warn gating: Fixed
- not-found.tsx tracking documentation: Fixed

## Deduped Findings (sorted by severity then signal)

### AGG-1: Ungated `console.error` in 14 client-side components — convention violation and information leak [MEDIUM/MEDIUM]

**Flagged by:** code-reviewer (CR-1, CR-2, CR-3, CR-4), security-reviewer (SEC-1), critic (CRI-1), architect (ARCH-1), debugger (DBG-1), verifier (V-1, V-3), tracer (TR-1), test-engineer (TE-1)
**Signal strength:** 10 of 10 review perspectives

**Files:**
- `src/components/discussions/discussion-post-form.tsx:47,54`
- `src/components/discussions/discussion-thread-form.tsx:53,61`
- `src/components/discussions/discussion-post-delete-button.tsx:29,36`
- `src/components/discussions/discussion-thread-moderation-controls.tsx:77,83,98,105`
- `src/app/(dashboard)/dashboard/groups/edit-group-dialog.tsx:66`
- `src/app/(dashboard)/dashboard/groups/create-group-dialog.tsx:43`
- `src/app/(dashboard)/dashboard/admin/roles/role-editor-dialog.tsx:106`
- `src/app/(dashboard)/dashboard/admin/roles/role-delete-dialog.tsx:58`
- `src/app/(dashboard)/dashboard/problems/create/create-problem-form.tsx:310`
- `src/app/(dashboard)/dashboard/problem-sets/_components/problem-set-form.tsx:241`
- `src/app/(dashboard)/dashboard/admin/users/bulk-create-dialog.tsx:214`
- `src/components/code/compiler-client.tsx:292`
- `src/app/(dashboard)/dashboard/submissions/[id]/_components/comment-section.tsx:78`

**Description:** 14 client-side `console.error()` calls across discussion, admin, dialog, compiler, and comment components write unstructured error data to browser DevTools in production. The codebase convention (documented in `src/lib/api/client.ts:23`) says "Log errors in development only". The error boundary components were fixed to gate `console.error` behind `process.env.NODE_ENV === "development"`, but these API-consuming components were not updated.

**Concrete failure scenario:** A failed API call returns `{ "error": "Internal: column 'foo' not found at query.ts:42" }`. The `console.error` writes this to the browser console, exposing the SQL column name and file path to any user who opens DevTools. The error boundary gate does not protect against this because the `console.error` fires in the API-consuming component before any error boundary is triggered.

**Fix:** Gate all 14 `console.error` calls behind `process.env.NODE_ENV === "development"`.

---

### AGG-2: `admin-config.tsx` double `.json()` anti-pattern — incomplete cycle 26 migration [LOW/MEDIUM]

**Flagged by:** code-reviewer (CR-5), security-reviewer (SEC-3), architect (ARCH-2), critic (CRI-2), debugger (DBG-2), verifier (V-2), tracer (TR-2)
**Signal strength:** 7 of 10 review perspectives

**File:** `src/lib/plugins/chat-widget/admin-config.tsx:99+103`

**Description:** The test-connection handler calls `response.json()` at line 99 in the `!response.ok` branch, then calls `response.json()` again at line 103 for the success case. Since the error branch returns early, the second call never runs. However, this is the same anti-pattern fixed across 3+ files in cycle 26 (AGG-1). The codebase convention in `src/lib/api/client.ts:44-52` documents this as "DO NOT USE".

**Fix:** Parse response body once before branching.

---

### AGG-3: `bulk-create-dialog.tsx:194` interpolates raw `err.message` into user-visible string [LOW/LOW]

**Flagged by:** security-reviewer (SEC-2), critic (CRI-3)
**Signal strength:** 2 of 10 review perspectives

**File:** `src/app/(dashboard)/dashboard/admin/users/bulk-create-dialog.tsx:194`

**Description:** `setParseError(t("bulkCsvParseError", { message: err.message }))` interpolates raw `err.message` from papaparse into a translated string shown to the user.

**Fix:** Replace `err.message` with a sanitized version or generic fallback.

---

## Security Findings (carried)

### SEC-CARRIED-1: `window.location.origin` for URL construction — covered by DEFER-24
### SEC-CARRIED-2: Encryption plaintext fallback — MEDIUM/MEDIUM, carried from DEFER-39
### SEC-CARRIED-3: `AUTH_CACHE_TTL_MS` has no upper bound — LOW/MEDIUM, carried from DEFER-40
### SEC-CARRIED-4: Anti-cheat localStorage persistence — LOW/LOW, carried from DEFER-48
### SEC-CARRIED-5: `sanitizeHtml` root-relative img src — LOW/LOW, carried from DEFER-49

## Performance Findings (carried/deferred)

### PERF-CARRIED-1: contest-replay setInterval — LOW/LOW, deferred from cycle 26 AGG-5
### PERF-CARRIED-2: sidebar interval re-entry — LOW/LOW, deferred from cycle 26 AGG-6

## Previously Deferred Items (Carried Forward)

All previously deferred items from prior cycle plans remain in effect:
- DEFER-1 through DEFER-13 (from cycle 23)
- DEFER-14 (centralized error handling / useApiFetch hook, from cycle 24)
- DEFER-15 (window.confirm replacement, from cycle 25)
- DEFER-16 (ContestAnnouncements polling, from cycle 25)
- DEFER-17 (Inconsistent createApiHandler, from cycle 27)
- DEFER-18 (Contest layout forced navigation, from cycle 27)
- DEFER-19 (use-source-draft JSON.parse validation, from cycle 27)

## Agent Failures

None. All 10 review perspectives completed successfully.
