# Code Review — RPF Cycle 31

**Date:** 2026-04-23
**Reviewer:** code-reviewer
**Base commit:** 198e6a63

## Previously Fixed Items (Verified)

All prior findings addressed. Countdown timer migrated to setTimeout (19de5cf6), rate-limiter .catch() guard added (7ae57906), chat widget sendMessage stabilized (ce9aa4fa).

## Findings

### CR-1: ActiveTimedAssignmentSidebarPanel still uses `setInterval` — last remaining client-side timer with old pattern [MEDIUM/MEDIUM]

**File:** `src/components/layout/active-timed-assignment-sidebar-panel.tsx:63`

**Description:** The sidebar panel uses `window.setInterval(() => {...}, 1000)` on line 63. The countdown timer was migrated in cycle 30, the visibility polling hook in cycle 29, and the contest replay in cycle 28. This component is now the last remaining client-side timer using `setInterval`. The code even has a comment on line 78 referencing the pattern in countdown-timer.tsx, suggesting the author was aware but didn't apply the fix here.

**Concrete failure scenario:** A student switches tabs during an active assignment. Throttled `setInterval` callbacks may fire in rapid succession when the tab becomes visible, causing a brief flash of stale data. The `visibilitychange` handler on line 80 mitigates this by immediately updating, but there's a window between interval catch-up and the visibility handler running.

**Fix:** Migrate to recursive `setTimeout` with `cancelled` flag, matching the pattern in countdown-timer.tsx.

---

### CR-2: `edit-group-dialog.tsx` triple-lookup in SelectValue render [LOW/LOW]

**File:** `src/app/(dashboard)/dashboard/groups/edit-group-dialog.tsx:141-143`

**Description:** The `SelectValue` render calls `group.availableInstructors.find((instructor) => instructor.id === instructorId)` three times in the same expression (line 141, 142, 143). Each lookup iterates the array. While the array is typically small, this is unnecessary work on every render.

**Fix:** Extract the found instructor into a variable before the JSX expression.

---

### CR-3: `code-similarity-client.ts` has unguarded `.json()` on success path [LOW/MEDIUM]

**File:** `src/lib/assignments/code-similarity-client.ts:49`

**Description:** After checking `!response.ok`, the code calls `response.json()` without a `.catch()` guard. If the sidecar returns a 200 with a non-JSON body, the unhandled `SyntaxError` propagates to the outer try/catch which returns `null` (fail-open). While the fail-open behavior is correct, the error path is indirect and could be logged more clearly. Same class of issue fixed in rate-limiter-client.ts in cycle 30.

**Fix:** Add `.catch(() => null)` and a null check, matching the rate-limiter pattern.

---

### CR-4: `compiler/execute.ts` tryRustRunner has unguarded `.json()` on success path [LOW/MEDIUM]

**File:** `src/lib/compiler/execute.ts:533`

**Description:** After checking `!response.ok`, the Rust runner path calls `await response.json()` without a `.catch()` guard. If the runner returns 200 with a non-JSON body, the `SyntaxError` propagates to the outer catch block and falls back to local execution. This is the correct behavior but the error is logged as "Rust runner unavailable", which is misleading — the runner was reachable, it returned invalid data.

**Fix:** Add `.catch(() => null)` and a null check with a more accurate log message.

---

### CR-5: `hcaptcha.ts` has unguarded `.json()` on success path [LOW/MEDIUM]

**File:** `src/lib/security/hcaptcha.ts:76`

**Description:** After checking `!response.ok`, the hcaptcha verification calls `await response.json()` without `.catch()`. If the hcaptcha API returns a 200 with a non-JSON body, the `SyntaxError` is unhandled and propagates to the caller, potentially causing an unhandled promise rejection.

**Fix:** Add `.catch(() => ({ success: false, "error-codes": ["parse-error"] }))`.
