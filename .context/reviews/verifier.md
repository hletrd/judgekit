# Verifier Review — RPF Cycle 23

**Date:** 2026-04-22
**Reviewer:** verifier
**Base commit:** 429d1b86

## V-1: 5 local `normalizePage` functions do not match shared version — verified divergence [HIGH/HIGH]

**Files:**
- `src/app/(dashboard)/dashboard/problems/page.tsx:51`
- `src/app/(dashboard)/dashboard/admin/audit-logs/page.tsx:50`
- `src/app/(dashboard)/dashboard/admin/login-logs/page.tsx:47`
- `src/app/(dashboard)/dashboard/admin/users/page.tsx:41`
- `src/app/(dashboard)/dashboard/admin/files/page.tsx:26`

**Confidence:** HIGH

Verified by comparing each local function against the shared `src/lib/pagination.ts:normalizePage`:

| Feature | Shared (pagination.ts) | Local (5 copies) |
|---------|----------------------|-------------------|
| Parse method | `parseInt(value, 10)` | `Number(value)` |
| MAX_PAGE bound | 10000 | None |
| Hex/scientific notation | Rejected by parseInt | Accepted by Number |
| Empty string handling | `parseInt("", 10)` -> NaN -> 1 | `Number("")` -> 0 -> 1 |

The divergence is confirmed. The local copies are strictly less safe than the shared version.

**Fix:** Replace with `import { normalizePage } from "@/lib/pagination"`.

---

## V-2: `contest-join-client.tsx` double `.json()` — verified pattern [HIGH/HIGH]

**File:** `src/app/(dashboard)/dashboard/contests/join/contest-join-client.tsx:44-49`

**Confidence:** HIGH

Verified: Lines 44-46 parse error body via `res.json()`, line 49 parses success body via `res.json()`. These are in separate if/else branches, so both calls never execute in the same request. However, this is the documented anti-pattern from `src/lib/api/client.ts` line 57: "The Response body can only be consumed once."

The `apiFetchJson` utility (lines 117-128 of client.ts) was created specifically to prevent this class of bug.

**Fix:** Use `apiFetchJson` or parse once before branching.

---

## V-3: `comment-section.tsx` non-OK error feedback — verified fixed [INFO/N/A]

**File:** `src/app/(dashboard)/dashboard/submissions/[id]/_components/comment-section.tsx:49-51`

**Confidence:** N/A

The RPF cycle 28 plan (Task 4) called for adding `toast.error` on non-OK responses. Verified that lines 49-51 now properly show `toast.error(tComments("loadError"))` when `response.ok` is false. This fix is complete.

---

## V-4: `submission-overview.tsx` polling behavior when dialog closed — verified [MEDIUM/MEDIUM]

**File:** `src/components/lecture/submission-overview.tsx:123`

**Confidence:** MEDIUM

Verified: `useVisibilityPolling(() => { void fetchStats(); }, POLL_INTERVAL_MS, !open)` passes `!open` as the pause flag. The `fetchStats` callback also has an early return guard `if (!openRef.current) return;`. The double guard means the polling callback fires but returns immediately when closed — slightly wasteful but not buggy.

**Fix:** Conditionally mount the component or ensure the pause flag prevents interval scheduling entirely.

---

## V-5: `contest-quick-stats.tsx` avgScore null -> 0 display issue — verified [MEDIUM/MEDIUM]

**File:** `src/components/contest/contest-quick-stats.tsx:42,67,110`

**Confidence:** MEDIUM

Verified: Initial state sets `avgScore: 0` (line 42). When API returns `avgScore: null`, line 67 preserves the previous value (0 from initial state). Line 110 displays `formatNumber(0, ...)` as "0.0". The code does not distinguish between "no data" and "zero score."

**Fix:** Change `avgScore` initial state to `null`, add null check in display.
