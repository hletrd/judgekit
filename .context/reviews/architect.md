# Architecture Review — RPF Cycle 23

**Date:** 2026-04-22
**Reviewer:** architect
**Base commit:** 429d1b86

## ARCH-1: Duplicated `normalizePage` across 5 server components — DRY violation and inconsistency [MEDIUM/HIGH]

**Files:**
- `src/lib/pagination.ts:7` (shared, correct — uses parseInt + MAX_PAGE)
- `src/app/(dashboard)/dashboard/problems/page.tsx:51` (local, uses Number, no MAX_PAGE)
- `src/app/(dashboard)/dashboard/admin/audit-logs/page.tsx:50` (local, uses Number, no MAX_PAGE)
- `src/app/(dashboard)/dashboard/admin/login-logs/page.tsx:47` (local, uses Number, no MAX_PAGE)
- `src/app/(dashboard)/dashboard/admin/users/page.tsx:41` (local, uses Number, no MAX_PAGE)
- `src/app/(dashboard)/dashboard/admin/files/page.tsx:26` (local, uses Number, no MAX_PAGE)

**Confidence:** HIGH

The shared `normalizePage` in `src/lib/pagination.ts` was properly fixed with `parseInt` and `MAX_PAGE = 10000`. But 5 server components define their own local `normalizePage` functions using `Number()` and lacking the upper bound. This violates DRY and creates a maintenance trap: the shared function was improved but these copies were not updated.

Server components can import from `@/lib/pagination` just as client components do. The reason these are likely local is historical — they predate the shared utility or were created by copy-paste.

**Fix:** Replace all 5 local functions with `import { normalizePage } from "@/lib/pagination"`.

---

## ARCH-2: `submission-overview.tsx` implements custom dialog instead of using Dialog component [MEDIUM/MEDIUM]

**File:** `src/components/lecture/submission-overview.tsx:152`

**Confidence:** MEDIUM

The component renders a `div role="dialog" aria-modal="true"` directly instead of using the shared `Dialog` component from `@/components/ui/dialog`. This means:
1. No focus trap — keyboard users can tab out of the dialog to background elements
2. No built-in Escape handling (though a custom handler is implemented on lines 134-144)
3. No scroll lock on the body
4. The custom Escape handler does `e.preventDefault()` which may interfere with browser-native dialog behavior

**Fix:** Refactor to use the shared `Dialog` component which provides all these features by default.

---

## ARCH-3: `contest-quick-stats.tsx` `Number(null)` converts null avgScore to 0 [MEDIUM/MEDIUM]

**File:** `src/components/contest/contest-quick-stats.tsx:42,67`

**Confidence:** MEDIUM

When the API returns `avgScore: null` (no submissions yet), the component preserves the initial state value of `0` for `avgScore`, then displays "0.0" as the formatted value. This is misleading — an average score of 0.0 implies submissions exist but all scored 0, while the reality is no submissions exist at all.

**Fix:** Change initial `avgScore` to `null`, add a null check in the display to show "---" or similar.
