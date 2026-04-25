# RPF Cycle 37 — Review Remediation Plan

**Date:** 2026-04-25
**Cycle:** 37/100
**Base commit:** (current HEAD)
**Review artifacts:** `.context/reviews/comprehensive-reviewer-cycle-37.md` + `.context/reviews/_aggregate-cycle-37.md`

## Previously Completed Tasks (Verified in Current Code)

All cycle 35 tasks are complete:
- [x] Task A: Fix `parseFloat || null` in create-problem-form — commit b093083d
- [x] Task B: Add `updatedAt` column to tags table — commit 83dd46ff
- [x] Task C: Fix `SUBMISSION_GLOBAL_QUEUE_LIMIT` parsing — commit b9d7fef9
- [x] Task D: Replace raw `console.error(data)` in group-instructors-manager — commit 4bf1f515

All cycle 36 findings verified as already fixed in current code:
- [x] AGG-1 (cycle 36): Analytics route unhandled rejection chain — async IIFE + defensive `.catch()` in place
- [x] AGG-2 (cycle 36): `database-backup-restore.tsx` raw console.error — now logs structured error
- [x] AGG-3 (cycle 36): Chat widget `parseInt || default` — now uses `Number.isFinite`
- [x] AGG-4 (cycle 36): Role editor `parseInt || 0` — now uses `Number.isFinite`
- [x] AGG-5 (cycle 36): `parseInt(diskUsage.usePercent) || 0` — now uses `Number.isFinite`
- [x] AGG-6 (cycle 36): Exam-session GET `examModeInvalid` (400) — now returns `notFound("ExamSession")`

## Tasks (priority order)

### Task A: Fix `parseInt || default` in quick-create-contest-form — use Number.isFinite [MEDIUM/HIGH]

**From:** AGG-1 (NEW-1)
**Severity / confidence:** MEDIUM / HIGH
**Files:**
- `src/components/contest/quick-create-contest-form.tsx:133`
- `src/components/contest/quick-create-contest-form.tsx:172`

**Problem:** `parseInt(e.target.value, 10) || 60` and `parseInt(e.target.value, 10) || 100` treat `0` as falsy. While HTML `min` constraints prevent `0` entry, the `||` pattern is fragile and inconsistent with the `Number.isFinite` convention established in cycles 34-36.

**Plan:**
1. Line 133: Change `parseInt(e.target.value, 10) || 60` to `const v = parseInt(e.target.value, 10); setDurationMinutes(Number.isFinite(v) ? v : 60);`
2. Line 172: Change `parseInt(e.target.value, 10) || 100` to `const v = parseInt(e.target.value, 10); updateProblemPoints(i, Number.isFinite(v) ? v : 100);`
3. Verify all gates pass

**Status:** TODO

---

### Task B: Fix `parseFloat || 0` and `parseInt || null` in assignment-form-dialog — use Number.isFinite [MEDIUM/HIGH]

**From:** AGG-2, AGG-4 (NEW-2, NEW-3)
**Severity / confidence:** MEDIUM / HIGH
**Files:**
- `src/app/(dashboard)/dashboard/groups/[id]/assignment-form-dialog.tsx:410`
- `src/app/(dashboard)/dashboard/groups/[id]/assignment-form-dialog.tsx:654`
- `src/app/(dashboard)/dashboard/groups/[id]/assignment-form-dialog.tsx:457`

**Problem:** Three instances of `parseFloat(x) || 0` or `parseInt(x, 10) || null` that are inconsistent with the codebase `Number.isFinite` convention. `0 || 0` happens to work by coincidence but masks NaN.

**Plan:**
1. Line 410: Change `parseFloat(event.target.value) || 0` to `const v = parseFloat(event.target.value); setLatePenalty(Number.isFinite(v) ? v : 0);`
2. Line 654: Change `parseFloat(event.target.value) || 0` to `const v = parseFloat(event.target.value); updateProblemRow(index, { points: Number.isFinite(v) ? v : 0 });`
3. Line 457: Change `parseInt(e.target.value, 10) || null` to `const v = parseInt(e.target.value, 10); setExamDurationMinutes(e.target.value && Number.isFinite(v) ? v : null);`
4. Verify all gates pass

**Status:** TODO

---

### Task C: Add timeout to flaky `public-seo-metadata.test.ts` test [LOW/HIGH]

**From:** AGG-3 (NEW-4)
**Severity / confidence:** LOW / HIGH
**Files:**
- `tests/unit/public-seo-metadata.test.ts:103`

**Problem:** The test "builds page-aware practice catalog metadata for page 2" timed out at the default 5000ms during the full suite run but passed on rerun (1614ms). Dynamic `import()` of Next.js page modules under high parallelism can exceed the default timeout.

**Plan:**
1. Add explicit timeout of 15000ms to the affected test case
2. Verify the test passes both individually and in the full suite

**Status:** TODO

---

## Deferred Items

### Carried deferred items from cycle 36 (unchanged):

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

- 2026-04-25: Plan created with 3 tasks (A-C).
