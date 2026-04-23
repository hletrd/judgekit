# Debugger Review — RPF Cycle 23

**Date:** 2026-04-22
**Reviewer:** debugger
**Base commit:** 429d1b86

## DBG-1: 5 local `normalizePage` functions use `Number()` — float values bypass page validation [MEDIUM/HIGH]

**Files:**
- `src/app/(dashboard)/dashboard/problems/page.tsx:51`
- `src/app/(dashboard)/dashboard/admin/audit-logs/page.tsx:50`
- `src/app/(dashboard)/dashboard/admin/login-logs/page.tsx:47`
- `src/app/(dashboard)/dashboard/admin/users/page.tsx:41`
- `src/app/(dashboard)/dashboard/admin/files/page.tsx:26`

**Confidence:** HIGH

`Number("1.5")` returns `1.5`, which `Math.floor()` reduces to `1`. But `Number("0x10")` returns `16` (hex notation), `Number("1e3")` returns `1000` (scientific notation), and `Number("")` returns `0` (empty string). The shared version uses `parseInt` which correctly handles these edge cases. The local copies are also missing the MAX_PAGE upper bound.

**Concrete failure scenario:** An attacker sends `?page=1e10` to `/dashboard/admin/audit-logs`. `Number("1e10")` is `10000000000`, which passes `Number.isFinite` and `>= 1`, so `Math.floor()` returns 10000000000. The DB query uses `OFFSET 10000000000`, causing a denial-of-service query.

**Fix:** Replace with shared `normalizePage` from `@/lib/pagination`.

---

## DBG-2: `contest-join-client.tsx` — double `.json()` on same Response [HIGH/HIGH]

**File:** `src/app/(dashboard)/dashboard/contests/join/contest-join-client.tsx:44-49`

**Confidence:** HIGH

Same as CR-2. The code parses the response body in two separate branches. While the if/else structure prevents a "body already consumed" error today, this pattern is the documented anti-pattern in `src/lib/api/client.ts`. If the error branch ever changes to not throw (e.g., for logging), the second `.json()` call will throw `TypeError: Body has already been consumed`.

**Fix:** Parse the response body once before branching, or use `apiFetchJson`.

---

## DBG-3: `create-problem-form.tsx` — same double `.json()` pattern on error/success paths [MEDIUM/MEDIUM]

**File:** `src/app/(dashboard)/dashboard/problems/create/create-problem-form.tsx:432-437`

**Confidence:** MEDIUM

Same double-consumption anti-pattern. Line 433 parses error body, line 437 parses success body. Mutually exclusive branches prevent the actual error today.

**Fix:** Same as DBG-2.

---

## DBG-4: `group-members-manager.tsx` `handleAddMember` — double `.json()` on same response [MEDIUM/MEDIUM]

**File:** `src/app/(dashboard)/dashboard/groups/[id]/group-members-manager.tsx:124-128`

**Confidence:** MEDIUM

Same double-consumption anti-pattern. Line 124 parses error body, line 128 parses success body. Mutually exclusive branches prevent the actual error today.

**Fix:** Same as DBG-2.

---

## DBG-5: `contest-quick-stats.tsx` avgScore null displayed as 0.0 [MEDIUM/MEDIUM]

**File:** `src/components/contest/contest-quick-stats.tsx:42,67`

**Confidence:** MEDIUM

When the API returns `avgScore: null`, the component's initial state has `avgScore: 0`. The null check on line 67 preserves the previous value (0 from initial state), displaying "0.0" as the average score. This is semantically incorrect — 0.0 implies all submissions scored 0, while null means no submissions exist.

**Fix:** Change initial `avgScore` to `null` and handle the null case in the display.
