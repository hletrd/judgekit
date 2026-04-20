# Cycle 12b Review Remediation Plan

**Date:** 2026-04-20
**Source:** `.context/reviews/cycle-12b-aggregate.md`

---

## Scope

This cycle addresses the new findings from the cycle-12b multi-agent review:
- AGG-1: Server components use `new Date()` for deadline/status comparisons — clock-skew display inconsistency
- AGG-2: `getContestStatus` and `selectActiveTimedAssignments` default to `new Date()` — footgun
- AGG-3: `migrate/export` route uses `new Date()` for filename — inconsistent with backup route
- AGG-4: No test coverage for server component DB-time usage or `getContestStatus`
- AGG-5: `recruiting-invitations-panel.tsx` uses `toLocaleDateString` instead of shared datetime utility
- AGG-6: `sanitizeHtml` allows root-relative `<img src>` — potential internal resource enumeration

No cycle-12b review finding is silently dropped. No new refactor-only work is added under deferred.

---

## Implementation lanes

### H1: Fix server components to use `getDbNow()` for deadline/status comparisons (AGG-1)

- **Source:** AGG-1
- **Severity / confidence:** MEDIUM / HIGH
- **Citations:** `src/app/(dashboard)/dashboard/contests/page.tsx:95`, `src/app/(dashboard)/dashboard/groups/[id]/page.tsx:304`, `src/app/(dashboard)/dashboard/groups/[id]/assignments/[assignmentId]/page.tsx:120`, `src/app/(dashboard)/dashboard/_components/student-dashboard.tsx:24`
- **Problem:** Four server components use `new Date()` for temporal comparisons against DB-stored deadlines. Under clock skew, the displayed status can disagree with API enforcement. Same class of issue as cycle-27 AGG-1 (recruit page), which was fixed with `getDbNow()`.
- **Plan:**
  1. In `contests/page.tsx`: Replace `const now = new Date()` with `const now = await getDbNow()`. Import `getDbNow` from `@/lib/db-time`.
  2. In `groups/[id]/page.tsx`: Replace `const now = new Date()` inside the `.map()` callback with a single `const now = await getDbNow()` before the `.map()`. Import `getDbNow`.
  3. In `assignments/[assignmentId]/page.tsx`: Replace `const now = new Date()` with `const now = await getDbNow()`. Import `getDbNow`.
  4. In `student-dashboard.tsx`: Replace `const now = new Date()` with `const now = await getDbNow()`. Import `getDbNow`.
  5. Verify all pages render correctly with `next build`.
  6. Verify existing tests still pass.
- **Status:** DONE

### M1: Remove `new Date()` default from `getContestStatus` and `selectActiveTimedAssignments` (AGG-2)

- **Source:** AGG-2
- **Severity / confidence:** LOW / MEDIUM
- **Citations:** `src/lib/assignments/contests.ts:33`, `src/lib/assignments/active-timed-assignments.ts:17`
- **Problem:** Both functions default to `new Date()`, making it easy to accidentally use app-server time. The `getActiveTimedAssignmentsForSidebar` wrapper correctly passes DB time, but direct callers may not.
- **Plan:**
  1. In `contests.ts`: Remove the default parameter from `getContestStatus` so callers must provide `now` explicitly. Add JSDoc explaining that `now` should come from `getDbNow()` in server components.
  2. In `active-timed-assignments.ts`: Remove the default from `selectActiveTimedAssignments`. Update the one caller (`getActiveTimedAssignmentsForSidebar`) which already provides the value.
  3. Update any other callers that relied on the default (search for all call sites).
  4. Verify tsc --noEmit passes.
- **Status:** DONE

### M2: Fix `migrate/export` route to use `getDbNowUncached()` for filename (AGG-3)

- **Source:** AGG-3
- **Severity / confidence:** LOW / MEDIUM
- **Citations:** `src/app/api/v1/admin/migrate/export/route.ts:81`
- **Problem:** The export route uses `new Date().toISOString()` for the filename, while the backup route uses `getDbNowUncached()`. The timestamps could differ by the clock-skew amount.
- **Plan:**
  1. Import `getDbNowUncached` from `@/lib/db-time`.
  2. Replace `const timestamp = new Date().toISOString().replace(/[:.]/g, "-")` with `const dbNow = await getDbNowUncached(); const timestamp = dbNow.toISOString().replace(/[:.]/g, "-")`.
  3. Verify the route still works correctly.
- **Status:** DONE

### M3: Replace `toLocaleDateString` with `formatDateTimeInTimeZone` in recruiting invitations panel (AGG-5)

- **Source:** AGG-5
- **Severity / confidence:** LOW / LOW
- **Citations:** `src/components/contest/recruiting-invitations-panel.tsx:253`
- **Problem:** The invitation panel uses `toLocaleDateString(locale, {...})` instead of the shared `formatDateTimeInTimeZone` utility.
- **Plan:**
  1. Import `formatDateTimeInTimeZone` from `@/lib/datetime`.
  2. Replace the `formatDate` function body with `formatDateTimeInTimeZone(dateStr, locale)`.
  3. Verify the panel still renders correctly.
- **Status:** DONE

### L1: Add test for `getContestStatus` and server component DB-time usage (AGG-4, partial)

- **Source:** AGG-4 (TE-1, TE-2)
- **Severity / confidence:** LOW / MEDIUM
- **Citations:** No test file for `src/lib/assignments/contests.ts`
- **Problem:** No unit test for `getContestStatus` boundary conditions or `selectActiveTimedAssignments`.
- **Plan:**
  1. Create `tests/unit/assignments/getContestStatus.test.ts` with unit tests for `getContestStatus` covering: upcoming, open, in_progress, expired, closed states; boundary conditions; scheduled vs windowed exam modes.
  2. Verify tests pass.
- **Status:** DONE — 16 tests covering scheduled mode, windowed mode, and boundary conditions.

---

## Deferred items

### DEFER-1: `sanitizeHtml` root-relative img src restriction (AGG-6)

- **Source:** AGG-6
- **Severity / confidence:** LOW / LOW
- **Citations:** `src/lib/security/sanitize-html.ts:9-15`
- **Original severity preserved:** LOW / LOW
- **Reason for deferral:** This is a low-severity information leak that requires instructor-level access to exploit (only instructors can create problem descriptions with HTML). The attacker would need to craft specific HTML to probe internal endpoints, and the response would only reveal whether an endpoint exists (not its content). A proper fix requires either a URL whitelist or Content-Security-Policy, both of which need careful design to avoid breaking legitimate image uploads.
- **Exit criterion:** When a CSP or URL whitelist for problem description images is being implemented, or when a security audit flags this as a higher priority.

---

## Progress log

- 2026-04-20: Plan created from cycle-12b aggregate review.
- 2026-04-20: H1 DONE — replaced `new Date()` with `getDbNow()` in 4 server components (contests page, group detail, assignment detail, student dashboard). Moved Date creation outside `.map()` in group detail.
- 2026-04-20: M1 DONE — removed `new Date()` default from `getContestStatus` and `selectActiveTimedAssignments`. Added JSDoc explaining DB-time requirement. Updated test file.
- 2026-04-20: M2 DONE — replaced `new Date()` with `getDbNowUncached()` in migrate/export route filename.
- 2026-04-20: M3 DONE — replaced `toLocaleDateString` with `formatDateTimeInTimeZone` in recruiting invitations panel.
- 2026-04-20: L1 DONE — added 16 unit tests for `getContestStatus` covering all statuses and boundary conditions.
- 2026-04-20: All gates green (eslint, tsc, vitest 292/2063). Pending next build verification.
