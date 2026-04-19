# Cycle 5 Review Remediation Plan

**Date:** 2026-04-19
**Source:** `.context/reviews/cycle-5-code-reviewer.md`, `.context/reviews/cycle-5-security-reviewer.md`, `.context/reviews/cycle-5-architect.md`, `.context/reviews/cycle-5-perf-reviewer.md`, `.context/reviews/cycle-5-test-engineer.md`, `.context/reviews/_aggregate.md`
**Status:** COMPLETE

## Deduplication note
Cycles 1-4 plans are all COMPLETE. This plan covers findings that are genuinely NEW from the cycle 5 review.

---

## Implementation Stories

### LIKE-01: Fix tags route LIKE escape order and add ESCAPE clause
**Severity:** MEDIUM | **Confidence:** HIGH | **Effort:** Quick win

**Files:**
- `src/app/api/v1/tags/route.ts:19`

**Problem:** The escape sequence is wrong: `%` and `_` are escaped before `\`, allowing backslash-based wildcard bypass. The query also lacks an explicit `ESCAPE '\\'` clause.

**Fix:**
1. Change escape order to: escape `\` first, then `%`, then `_`
2. Switch from `like()` helper to `sql` template with `ESCAPE '\\'` clause
3. Consider using the shared `escapeLikePattern()` utility from LIKE-02

**Verification:** `npx tsc --noEmit`, `npx vitest run`

---

### LIKE-02: Extract shared `escapeLikePattern()` utility and consolidate all duplicates
**Severity:** LOW | **Confidence:** HIGH | **Effort:** Moderate

**Files:**
- NEW: `src/lib/db/like.ts` -- shared utility
- `src/app/api/v1/admin/audit-logs/route.ts:23` -- remove local `escapeLikePattern()`
- `src/app/api/v1/admin/login-logs/route.ts:10` -- remove local `escapeLikePattern()`
- `src/app/api/v1/admin/submissions/export/route.ts:34` -- remove local `escapeLike()`
- `src/app/api/v1/tags/route.ts:19` -- replace inline `replaceAll`
- `src/app/api/v1/files/route.ts:153` -- replace inline `replace`
- `src/lib/assignments/recruiting-invitations.ts:106` -- replace inline `replace`
- `src/lib/practice/search.ts:8` -- keep `escapePracticeLike()` as it may have additional logic
- `src/app/(dashboard)/dashboard/admin/audit-logs/page.tsx:89` -- remove local `escapeLikePattern()`
- `src/app/(dashboard)/dashboard/admin/login-logs/page.tsx:78` -- remove local `escapeLikePattern()`

**Problem:** LIKE escape logic is duplicated across 9+ files with subtle variations. The tags route has the wrong escape order, and some files lack the `ESCAPE '\\'` clause. This DRY violation caused a real bug.

**Fix:**
1. Create `src/lib/db/like.ts` with:
```ts
/**
 * Escape SQL LIKE/ILIKE wildcard characters in a search string.
 * Must be used together with `ESCAPE '\\'` clause in the SQL template.
 *
 * Order matters: backslash must be escaped first, otherwise a literal
 * backslash in the input would double-escape the subsequently added
 * backslashes before % and _.
 */
export function escapeLikePattern(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}
```
2. Replace all local implementations with the shared import
3. Ensure all LIKE/ILIKE queries include `ESCAPE '\\'` clause
4. For client-side uses (audit-logs page, login-logs page), the same function can be imported since it's pure string manipulation

**Verification:** `npx tsc --noEmit`, `npx vitest run`, manual check that all LIKE queries have ESCAPE clause

---

### LIKE-03: Add `ESCAPE '\\'` clause to recruiting invitations ILIKE query
**Severity:** LOW | **Confidence:** HIGH | **Effort:** Quick win

**File:**
- `src/lib/assignments/recruiting-invitations.ts:109`

**Problem:** ILIKE query correctly escapes the pattern but omits explicit `ESCAPE '\\'` clause. Inconsistent with all other LIKE queries.

**Fix:** Add `ESCAPE '\\'` to both ILIKE clauses:
```ts
sql`(${recruitingInvitations.candidateName} ILIKE ${pattern} ESCAPE '\\' OR ${recruitingInvitations.candidateEmail} ILIKE ${pattern} ESCAPE '\\')`
```
Note: If LIKE-02 is done first, this will be addressed as part of the consolidation.

**Verification:** `npx tsc --noEmit`, `npx vitest run`

---

### LIKE-04: Add `ESCAPE '\\'` clause to files route LIKE query
**Severity:** LOW | **Confidence:** HIGH | **Effort:** Quick win

**File:**
- `src/app/api/v1/files/route.ts:153-154`

**Problem:** LIKE query correctly escapes the pattern but omits explicit `ESCAPE '\\'` clause.

**Fix:** Switch to `sql` template with ESCAPE clause, or keep `like()` helper and add the clause manually.
Note: If LIKE-02 is done first, this will be addressed as part of the consolidation.

**Verification:** `npx tsc --noEmit`, `npx vitest run`

---

### DATA-02: Restrict column selection in `getRecruitingInvitations`
**Severity:** LOW | **Confidence:** HIGH | **Effort:** Quick win

**File:**
- `src/lib/assignments/recruiting-invitations.ts:117`

**Problem:** `.select().from(recruitingInvitations)` returns all columns including `tokenHash` which is not needed in listing contexts.

**Fix:** Add explicit column selection excluding `tokenHash`:
```ts
return db
  .select({
    id: recruitingInvitations.id,
    assignmentId: recruitingInvitations.assignmentId,
    candidateName: recruitingInvitations.candidateName,
    candidateEmail: recruitingInvitations.candidateEmail,
    status: recruitingInvitations.status,
    metadata: recruitingInvitations.metadata,
    expiresAt: recruitingInvitations.expiresAt,
    createdBy: recruitingInvitations.createdBy,
    createdAt: recruitingInvitations.createdAt,
  })
  .from(recruitingInvitations)
  ...
```

**Verification:** `npx tsc --noEmit`, `npx vitest run`

---

### DATA-03: Restrict column selection in `plugins/data.ts`
**Severity:** LOW | **Confidence:** MEDIUM | **Effort:** Quick win

**Files:**
- `src/lib/plugins/data.ts:31` -- single plugin fetch
- `src/lib/plugins/data.ts:52` -- all plugins fetch

**Problem:** `.select().from(plugins)` returns all columns including potentially large `config` blob.

**Fix:** Add column selections:
- For `getPlugin(pluginId)` at line 31: include all columns (the full config is needed for editing)
- For `getAllPlugins()` at line 52: exclude `config` column

**Verification:** `npx tsc --noEmit`, `npx vitest run`

---

### DATA-04: Restrict column selection in groups PATCH first fetch
**Severity:** LOW | **Confidence:** MEDIUM | **Effort:** Quick win

**File:**
- `src/app/api/v1/groups/[id]/route.ts:107`

**Problem:** `db.query.groups.findFirst({ where: eq(groups.id, id) })` returns all columns just to check existence and read `instructorId`.

**Fix:** Add column restriction:
```ts
const group = await db.query.groups.findFirst({
  where: eq(groups.id, id),
  columns: { id: true, instructorId: true, name: true },
});
```

**Verification:** `npx tsc --noEmit`, `npx vitest run`

---

### TEST-08: Add test for tags route LIKE escaping
**Severity:** MEDIUM | **Confidence:** HIGH | **Effort:** Moderate

**Files:**
- NEW: `tests/unit/api/tags-like-escaping.test.ts` or extend existing

**Problem:** The tags route had a LIKE escaping bug (wrong escape order) with no test coverage.

**Fix:** Add unit tests covering:
- Normal search matches tags by name
- Search with `%` character does not match all
- Search with `_` character does not match single-char wildcard
- Search with `\` character does not break escape sequence
- Empty search returns all

**Verification:** `npx vitest run tests/unit/api/tags-like-escaping.test.ts`

---

## Deferred Items

These findings are explicitly deferred per the review. Each records the file+line citation, original severity/confidence, concrete reason, and exit criterion.

| ID | Finding | Severity | Confidence | Reason for deferral | Exit criterion |
|----|---------|----------|------------|---------------------|----------------|
| ARCH-Q2 | `isAdmin()` sync helper still used in assignment routes | LOW | HIGH | Intentional per code comment (lines 67-70): no narrower capability exists for the destructive override, and the admin role is the appropriate trust boundary | A narrower capability is created for assignment problem link overrides |
| Apr-19 C1 | Assistant roles can browse global user directory via `users.view` | MEDIUM | HIGH | Design decision pending -- may be intentional for the assistant workflow | Product decision on assistant user directory access |
| C6 (cycle 4) | Error boundary pages use `console.error` | LOW | HIGH | Client-side React convention. Adding server-side error reporting is a feature request. | Client-side error monitoring service is adopted |
| C7 (cycle 4) | `as never` type assertion in problem-submission-form.tsx | LOW | LOW | Dynamic translation keys are inherently hard to type statically without a complex discriminated union. The runtime fallback handles missing keys gracefully. | A type-safe translation key approach is adopted for the codebase |

---

## Progress Ledger

| Story | Status | Commit |
|---|---|---|
| LIKE-01 | Done | `b4d8a6f6` |
| LIKE-02 | Done | `b4d8a6f6` |
| LIKE-03 | Done | `b4d8a6f6` |
| LIKE-04 | Done | `b4d8a6f6` |
| DATA-02 | Done | `70cda7fe` |
| DATA-03 | Skipped | Config column genuinely needed by callers |
| DATA-04 | Done | `70cda7fe` |
| TEST-08 | Done | `dec894a3` |
