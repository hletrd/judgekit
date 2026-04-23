# Code Quality Review — RPF Cycle 23

**Date:** 2026-04-22
**Reviewer:** code-reviewer
**Base commit:** 429d1b86

## CR-1: Four duplicate `normalizePage` functions in admin/server pages still use `Number()` instead of shared `parseInt`-based version [HIGH/MEDIUM]

**Files:**
- `src/app/(dashboard)/dashboard/problems/page.tsx:51`
- `src/app/(dashboard)/dashboard/admin/audit-logs/page.tsx:50`
- `src/app/(dashboard)/dashboard/admin/login-logs/page.tsx:47`
- `src/app/(dashboard)/dashboard/admin/users/page.tsx:41`
- `src/app/(dashboard)/dashboard/admin/files/page.tsx:26`

**Confidence:** HIGH

The shared `src/lib/pagination.ts:normalizePage` was fixed in cycle 28 to use `parseInt` and add an upper bound of 10000. However, these 5 server-component pages define their own local `normalizePage` functions that still use `Number()` instead of `parseInt`. These local copies:
1. Use `Number()` which treats `"1.5"` as `1.5` (float), while the shared version uses `parseInt` which correctly discards fractional parts
2. Lack the `MAX_PAGE` upper bound, allowing clients to request arbitrarily large page numbers (DoS vector on DB queries)
3. Violate DRY — if the pagination logic changes, these 5 copies must be updated separately

**Concrete failure scenario:** An attacker sends `?page=999999999` to `/dashboard/admin/audit-logs`. The local `normalizePage` returns 999999999, causing a database `OFFSET 999999999` query that may take seconds or minutes, consuming DB resources. The shared version would cap it at 10000.

**Fix:** Replace all local `normalizePage` functions with imports from `@/lib/pagination`. The shared version already handles all the edge cases correctly.

---

## CR-2: `contest-join-client.tsx` calls `.json()` twice on the same response — "body already consumed" error [HIGH/HIGH]

**File:** `src/app/(dashboard)/dashboard/contests/join/contest-join-client.tsx:44-49`

**Confidence:** HIGH

After checking `!res.ok`, the code calls `res.json()` on line 45 to get the error body. Then on line 49, it calls `res.json()` again to get the success payload. However, a Response body can only be consumed once — the second `.json()` call throws `TypeError: Body has already been consumed`. This is the exact anti-pattern documented in `src/lib/api/client.ts` under "Response body single-read rule."

The code appears to work currently because:
- When `!res.ok`: line 45 parses error body, then line 46 throws, so line 49 is never reached
- When `res.ok`: line 44 is false, so line 45 is skipped, and line 49 parses the body

But this is fragile and contradicts the codebase convention. If someone adds logic between lines 46 and 49 that doesn't throw, or changes the error handling, the double-read will surface.

**Concrete failure scenario:** A developer refactors the error handling to not throw immediately (e.g., adding logging before throw). Now on error paths, both line 45 and line 49 execute, causing `TypeError: Body has already been consumed` which is caught by the generic catch block and shows an unhelpful error toast.

**Fix:** Parse the response body once: `const payload = await res.json().catch(() => ({}))`, then check `res.ok` and branch on the parsed data. Or migrate to `apiFetchJson`.

---

## CR-3: `create-problem-form.tsx` calls `.json()` twice on success path [MEDIUM/MEDIUM]

**File:** `src/app/(dashboard)/dashboard/problems/create/create-problem-form.tsx:432-437`

**Confidence:** MEDIUM

Same "body already consumed" issue as CR-2 but on the success path only. Line 433 calls `res.json()` on the error branch, then line 437 calls it again on the success path. Because the branches are mutually exclusive (if/else), this currently works, but it's the same fragile anti-pattern.

**Fix:** Parse once, branch on the parsed data, or use `apiFetchJson`.

---

## CR-4: `group-members-manager.tsx` `handleAddMember` calls `.json()` twice on same response [MEDIUM/MEDIUM]

**File:** `src/app/(dashboard)/dashboard/groups/[id]/group-members-manager.tsx:124-128`

**Confidence:** MEDIUM

Line 124 calls `response.json().catch()` for the error body, then line 128 calls `response.json().catch()` for the success payload. Same double-consumption anti-pattern as CR-2. The if/else branching prevents the actual error today, but this is fragile.

**Fix:** Parse the body once before the if/else, or use `apiFetchJson`.

---

## CR-5: `contest-quick-stats.tsx` double-wraps values with `Number(Number(x))` [LOW/LOW]

**File:** `src/components/contest/contest-quick-stats.tsx:65-68`

**Confidence:** LOW

Lines like `Number.isFinite(Number(data.data!.participantCount)) ? Number(data.data!.participantCount) : prev.participantCount` call `Number()` three times on the same value. The `apiFetchJson` already returns parsed JSON data where numeric fields are actual numbers from JSON parsing. The `Number()` wrapping is defensive but redundant — if the server returns a number, it's already a number in JSON. If it returns null, `Number(null)` is `0`, which passes `Number.isFinite` and silently replaces a null avgScore with 0.

**Concrete failure scenario:** The API returns `{ avgScore: null }` (no submissions yet). `Number(null)` is `0`, which passes `Number.isFinite(0)`, so the component displays "0" instead of preserving the previous value or showing "N/A". This is specifically the avgScore field on line 67 which does have a null check — the other fields don't.

**Fix:** For `avgScore`, the existing null check is correct. For the other fields, consider whether `Number(null) === 0` is the intended behavior when the API returns null counts.

---

## CR-6: `normalizePageSize` uses `Number()` instead of `parseInt` [LOW/LOW]

**File:** `src/lib/pagination.ts:18`

**Confidence:** LOW

While `normalizePage` was fixed to use `parseInt`, `normalizePageSize` still uses `Number()`. The risk is lower because `PAGE_SIZE_OPTIONS` is a strict allowlist, so `Number("abc")` would produce `NaN` which wouldn't match any option and would fall through to the default. However, for consistency with `normalizePage`, this should use `parseInt`.

**Fix:** Change to `parseInt(value ?? String(DEFAULT_PAGE_SIZE), 10)`.

---

## Verified Safe

- `comment-section.tsx` properly checks `response.ok` before processing, and shows toast on non-OK (cycle 28 AGG-4 fix confirmed)
- `discussion-thread-moderation-controls.tsx` properly uses optimistic local state for isLocked/isPinned (cycle 28 AGG-3 fix confirmed)
- Thread deletion uses `AlertDialog` confirmation (cycle 28 AGG-2 fix confirmed)
- `discussion-vote-buttons.tsx` properly uses `apiFetchJson` and shows `voteFailedLabel` (not raw API error) (cycle 28 AGG-10 fix confirmed)
- `create-problem-form.tsx` now shows toast.warning for invalid numeric inputs (cycle 22 AGG-1 fix confirmed)
- All client-side `.json()` calls in reviewed files have `.catch()` guards
- No `as any` or `@ts-ignore` found in reviewed production code
- `edit-group-dialog.tsx` error handler properly catches `SyntaxError` (cycle 28 AGG-8 fix confirmed)
- `compiler-client.tsx` properly uses `apiFetch` and checks `res.ok` before `.json()` on success path
