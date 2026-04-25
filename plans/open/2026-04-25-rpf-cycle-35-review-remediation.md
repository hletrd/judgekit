# RPF Cycle 35 Review Remediation Plan

**Date:** 2026-04-25
**Base commit:** (current HEAD)
**Review artifacts:** `.context/reviews/comprehensive-reviewer-cycle-35.md` + `.context/reviews/_aggregate-cycle-35.md`

## Previously Completed Tasks (Verified in Current Code)

All cycle 34 tasks are complete:
- [x] Task A: Add try/catch around `request.json()` in assignments POST route — commit 2522bcea
- [x] Task B: Fix `TRUSTED_PROXY_HOPS` parsing with `??` and NaN check — commit f1bcca05
- [x] Task C: Add error boundary for contests route segment — commit 2acab2f7
- [x] Task D: Use explicit column select in languages list route — commit 123ad7cf

## Tasks (priority order)

### Task A: Fix `parseFloat() || null` in create-problem-form — use Number.isFinite instead [MEDIUM/HIGH]

**From:** AGG-1 (NEW-1)
**Severity / confidence:** MEDIUM / HIGH
**Files:**
- `src/app/(dashboard)/dashboard/problems/create/create-problem-form.tsx:424-425`

**Problem:** `parseFloat(floatAbsoluteError) || null` and `parseFloat(floatRelativeError) || null` treat `0` as falsy. If a user enters `0` as the float error tolerance (meaning "exact match"), `parseFloat("0")` returns `0`, and `0 || null` evaluates to `null`, silently dropping the value. The server-side Zod schema allows `0` as valid. The `difficulty` field on line 426 of the same file already handles this correctly with `Number.isFinite()`.

**Plan:**
1. Change `parseFloat(floatAbsoluteError) || null` to `Number.isFinite(parseFloat(floatAbsoluteError)) ? parseFloat(floatAbsoluteError) : null`
2. Change `parseFloat(floatRelativeError) || null` to `Number.isFinite(parseFloat(floatRelativeError)) ? parseFloat(floatRelativeError) : null`
3. Verify that entering `0` for float error tolerance is now preserved
4. Verify all gates pass

**Status:** DONE (commit b093083d)

---

### Task B: Add `updatedAt` column to tags table and include in PATCH route [LOW/HIGH]

**From:** AGG-2 (NEW-2)
**Severity / confidence:** LOW / HIGH
**Files:**
- `src/lib/db/schema.pg.ts:1042-1057` (tags table)
- `src/app/api/v1/admin/tags/[id]/route.ts:27-35` (PATCH route)

**Problem:** The tags table lacks an `updatedAt` column, and the PATCH route does not set one. Every other update route in the codebase consistently includes `updatedAt: await getDbNowUncached()`. Tag modifications have no audit trail timestamp beyond creation time.

**Plan:**
1. Add `updatedAt: timestamp("updated_at", { withTimezone: true })` to the tags schema in `schema.pg.ts`
2. Add `updatedAt: await getDbNowUncached()` to the PATCH route's update values
3. Run `drizzle-kit push` to apply the migration (or generate migration)
4. Verify all gates pass

**Status:** DONE (commit 83dd46ff)

---

### Task C: Fix deprecated `SUBMISSION_GLOBAL_QUEUE_LIMIT` constant — use `??` and NaN check [LOW/MEDIUM]

**From:** AGG-3 (NEW-3)
**Severity / confidence:** LOW / MEDIUM
**Files:**
- `src/lib/security/constants.ts:27-30`

**Problem:** `parseInt(process.env.SUBMISSION_GLOBAL_QUEUE_LIMIT || "100", 10)` uses `||` which treats `0` as falsy. Setting `SUBMISSION_GLOBAL_QUEUE_LIMIT=0` (to disable the queue limit) silently defaults to `100`. Same class of bug as `TRUSTED_PROXY_HOPS` (fixed in cycle 34). The constant is `@deprecated` but still exported.

**Plan:**
1. Change to `const parsed = parseInt(process.env.SUBMISSION_GLOBAL_QUEUE_LIMIT ?? "100", 10);` with `Number.isNaN(parsed) ? 100 : Math.max(0, parsed)`
2. Verify that `SUBMISSION_GLOBAL_QUEUE_LIMIT=0` now results in 0
3. Verify that unset `SUBMISSION_GLOBAL_QUEUE_LIMIT` still defaults to 100
4. Verify all gates pass

**Status:** DONE (commit b9d7fef9)

---

### Task D: Replace raw `console.error(data)` with structured error message in group-instructors-manager [LOW/LOW]

**From:** AGG-4 (NEW-4)
**Severity / confidence:** LOW / LOW
**Files:**
- `src/app/(dashboard)/dashboard/groups/[id]/group-instructors-manager.tsx:74`

**Problem:** `console.error(data)` logs the raw API response object in development, which could contain internal details. Other components log only the error message string.

**Plan:**
1. Replace `console.error(data)` with `console.error("Instructor add failed:", (data as { error?: string }).error)`
2. Verify all gates pass

**Status:** DONE (commit 4bf1f515)

---

## Deferred Items

### AGG-3 (Chat widget `response.json()` error key coupling) and AGG-5 (`useSearchParams` without Suspense) — carried from cycle 34

Reason for deferral unchanged. See cycle 34 plan for details.

### DEFER-22 through DEFER-45: Carried from cycle 34

See cycle 34 plan for full details. All carry forward unchanged.

---

## Progress log

- 2026-04-25: Plan created with 4 tasks (A-D).
- 2026-04-25: Task A DONE — fix parseFloat || null in create-problem-form (commit b093083d).
- 2026-04-25: Task B DONE — add updatedAt column to tags table and PATCH route (commit 83dd46ff).
- 2026-04-25: Task C DONE — fix SUBMISSION_GLOBAL_QUEUE_LIMIT parsing to respect 0 (commit b9d7fef9).
- 2026-04-25: Task D DONE — replace raw console.error(data) with structured error message (commit 4bf1f515).
- 2026-04-25: All gates green (eslint 0, tsc clean, vitest 302/302 pass 2197 tests, next build success).
