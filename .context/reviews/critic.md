# Critic Review — RPF Cycle 23

**Date:** 2026-04-22
**Reviewer:** critic
**Base commit:** 429d1b86

## CRI-1: DRY violation — 5 local `normalizePage` copies not updated when shared version was fixed [HIGH/HIGH]

**Files:** (same as ARCH-1, SEC-1, CR-1)

**Confidence:** HIGH

When `normalizePage` in `src/lib/pagination.ts` was fixed to use `parseInt` and add `MAX_PAGE`, the 5 local copies in admin pages were not updated. This is a systemic DRY violation — the very purpose of a shared utility is to have a single source of truth. The fix to the shared function should have included removing or updating all local copies.

The risk is that future pagination fixes will again miss these copies, and they'll accumulate divergence over time.

**Fix:** Delete all local copies and import from `@/lib/pagination`.

---

## CRI-2: `contest-join-client.tsx` response body double-consumption pattern [HIGH/HIGH]

**File:** `src/app/(dashboard)/dashboard/contests/join/contest-join-client.tsx:44-49`

**Confidence:** HIGH

The code calls `res.json()` twice on the same Response object — once in the error branch (line 45) and once in the success branch (line 49). This is the exact anti-pattern documented in `src/lib/api/client.ts` under "Response body single-read rule." The current if/else branching prevents the actual error, but this pattern has already caused real bugs in other files.

The codebase has `apiFetchJson` specifically designed to eliminate this class of bug. This component should be migrated.

**Fix:** Use `apiFetchJson` or parse the body once before branching.

---

## CRI-3: `submission-overview.tsx` custom dialog lacks focus trap — accessibility gap [MEDIUM/MEDIUM]

**File:** `src/components/lecture/submission-overview.tsx:152`

**Confidence:** MEDIUM

The component manually implements dialog semantics with `role="dialog" aria-modal="true"` but does not implement a focus trap. Keyboard users can Tab past the dialog to interact with background elements. The shared `Dialog` component from `@/components/ui/dialog` provides focus trapping, scroll locking, and proper Escape handling out of the box.

This is both an accessibility issue (WCAG 2.1 SC 2.4.3 Focus Order) and a consistency issue (other dialogs in the app use the shared component).

**Fix:** Refactor to use the shared `Dialog` component.

---

## CRI-4: `contest-quick-stats.tsx` shows misleading 0.0 avgScore when no data exists [MEDIUM/MEDIUM]

**File:** `src/components/contest/contest-quick-stats.tsx:42,67`

**Confidence:** MEDIUM

When the API returns `avgScore: null` (no submissions yet), the component preserves the initial state value of `0` for `avgScore`, then displays "0.0" as the formatted value. This is misleading — an average score of 0.0 implies submissions exist but all scored 0, while the reality is no submissions exist at all.

**Fix:** Change initial `avgScore` to `null`, add a null check in the display to show "N/A" or similar.

---

## CRI-5: `recruiting-invitations-panel.tsx` mutation handlers still use raw `apiFetch` — inconsistent with read handlers [LOW/LOW]

**File:** `src/components/contest/recruiting-invitations-panel.tsx:195,254,277,299`

**Confidence:** LOW

`fetchInvitations` (line 133) uses `apiFetchJson`, but `handleCreate` (line 195), `handleRevoke` (line 254), `handleResetAccountPassword` (line 277), and `handleDelete` (line 299) still use raw `apiFetch`. Style consistency issue only — error handling is properly done.

**Fix:** Consider migrating to `apiFetchJson` for consistency. Low priority.
