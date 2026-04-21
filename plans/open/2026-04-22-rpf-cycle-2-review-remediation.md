# RPF Cycle 2 Review Remediation Plan

**Date:** 2026-04-22
**Source:** `.context/reviews/rpf-cycle-2-aggregate.md`
**Status:** In progress

## Scope

This cycle addresses cycle-2 findings from the multi-agent review:
- AGG-1: `recruiting-invitations-panel.tsx` custom expiry date `min` uses UTC instead of local time (timezone bug)
- AGG-2: `SubmissionListAutoRefresh` lacks error-state backoff
- AGG-3: `workers-client.tsx` `AliasCell` does not show error feedback on save failure
- AGG-4: `contest-clarifications.tsx` shows raw `userId` instead of username (deferred)
- AGG-5: `contest-clarifications.tsx` uses native `<select>` instead of project's `Select` component
- AGG-6: `recruiting-invitations-panel.tsx` date input has no `aria-label`
- AGG-7: Visibility-aware polling pattern duplicated across 6+ components (deferred)
- AGG-8: `copyToClipboard` dynamic import inconsistency (deferred)
- AGG-9: Practice page Path B progress filter (carried forward, deferred)
- AGG-10: Invitation URL uses `window.location.origin` (deferred)
- AGG-11: Duplicate `formatTimestamp` utility (deferred)

No cycle-2 review finding is silently dropped. No new refactor-only work is added under deferred.

---

## Implementation lanes

### H1: Fix timezone bug in `recruiting-invitations-panel.tsx` expiry date `min` attribute (AGG-1)

- **Source:** AGG-1
- **Severity / confidence:** MEDIUM / HIGH
- **Citations:** `src/components/contest/recruiting-invitations-panel.tsx:407`
- **Problem:** The `min` attribute on the custom expiry date input uses `new Date().toISOString().split("T")[0]` which produces UTC time. The native `<input type="date">` renders in the user's local timezone. This blocks Korean users (UTC+9) from selecting the current local date between midnight and 9 AM.
- **Plan:**
  1. Replace `new Date().toISOString().split("T")[0]` with a local-date-aware computation: `new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0]`
  2. Verify all gates pass.
- **Status:** DONE (commit b82a2c49)

### H2: Add error-state backoff to `SubmissionListAutoRefresh` (AGG-2)

- **Source:** AGG-2
- **Severity / confidence:** MEDIUM / MEDIUM
- **Citations:** `src/components/submission-list-auto-refresh.tsx:24-28`
- **Problem:** The auto-refresh component calls `router.refresh()` on a fixed interval with no error handling or exponential backoff. During server overload, this creates compounding load.
- **Plan:**
  1. Add error-state tracking (`errorCount` ref).
  2. On each `router.refresh()` call, detect errors (using `startTransition` return or a wrapper).
  3. Implement exponential backoff: `delayMs = Math.min(baseDelay * 2^errorCount, maxDelay)`.
  4. Reset `errorCount` on successful refresh.
  5. Verify all gates pass.
- **Status:** DONE (commit d1fb4799)

### M1: Add error toast to `workers-client.tsx` `AliasCell` save failure (AGG-3)

- **Source:** AGG-3
- **Severity / confidence:** LOW / MEDIUM
- **Citations:** `src/app/(dashboard)/dashboard/admin/workers/workers-client.tsx:91-101`
- **Problem:** The `handleSave` function only handles success — failed saves silently close the editing UI with no feedback.
- **Plan:**
  1. Add an `else` branch after `if (res.ok)` with `toast.error(t("saveFailed"))` or similar.
  2. Verify all gates pass.
- **Status:** DONE (commit 3fc04106, fix bec0bc52)

### M2: Replace native `<select>` with project's `Select` component in `contest-clarifications.tsx` (AGG-5)

- **Source:** AGG-5
- **Severity / confidence:** LOW / LOW
- **Citations:** `src/components/contest/contest-clarifications.tsx:204-217`
- **Problem:** The problem selector uses a native `<select>` element instead of the project's Radix-based `Select` component, creating visual inconsistency.
- **Plan:**
  1. Replace the native `<select>` and `<option>` elements with `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, and `SelectItem` components.
  2. Import the components from `@/components/ui/select`.
  3. Verify all gates pass.
- **Status:** DONE (commit 4ab470e0)

### M3: Add `aria-label` to `recruiting-invitations-panel.tsx` date input (AGG-6)

- **Source:** AGG-6
- **Severity / confidence:** LOW / LOW
- **Citations:** `src/components/contest/recruiting-invitations-panel.tsx:403-408`
- **Problem:** The custom expiry date `<Input type="date">` has no `aria-label` or associated `<Label htmlFor>` attribute.
- **Plan:**
  1. Add `aria-label={t("expiryDate")}` to the date input.
  2. Verify all gates pass.
- **Status:** DONE (commit b82a2c49, fix 0693a566)

---

## Deferred items

### DEFER-1 through DEFER-19: Carried from cycle 27

See `plans/open/2026-04-20-rpf-cycle-27-review-remediation.md` for the full deferred list. All carry forward unchanged.

### DEFER-20: Contest clarifications show raw userId instead of username (AGG-4)

- **Source:** AGG-4 (designer DES-1, code-reviewer CR-3)
- **Severity / confidence:** LOW / MEDIUM
- **Original severity preserved:** LOW / MEDIUM
- **Citations:** `src/components/contest/contest-clarifications.tsx:257`
- **Reason for deferral:** Fixing this requires a backend API change to include `userName` in the clarifications response. The frontend currently only has `userId` available. This is a larger-scope change that involves both the API route handler and the database query. The current behavior (showing userId) is functional but not ideal UX.
- **Exit criterion:** When a cycle has capacity for a focused API enhancement pass, or when the clarifications API is being modified for another reason.

### DEFER-21: Duplicated visibility-aware polling pattern (AGG-7)

- **Source:** AGG-7 (architect ARCH-1)
- **Severity / confidence:** LOW / MEDIUM
- **Original severity preserved:** LOW / MEDIUM
- **Citations:** 6+ components (see aggregate)
- **Reason for deferral:** The existing polling code works correctly. Extracting a shared hook is a maintainability improvement with no functional impact. Previously noted as DEFER-11/DEFER-21 in earlier cycles.
- **Exit criterion:** When a cycle has capacity for a focused DRY refactor pass, or when a bug is found in the polling pattern that needs fixing in all consumers.

### DEFER-22: `copyToClipboard` dynamic import inconsistency (AGG-8)

- **Source:** AGG-8 (architect ARCH-2)
- **Severity / confidence:** LOW / LOW
- **Original severity preserved:** LOW / LOW
- **Citations:** 5 components use dynamic import, 2 use static import (see aggregate)
- **Reason for deferral:** The inconsistency has no functional impact. Switching from dynamic to static imports is a minor cleanup. The clipboard utility is tiny and the dynamic import overhead is negligible.
- **Exit criterion:** When a cycle has capacity for a focused import cleanup pass.

### DEFER-23: Practice page Path B progress filter (AGG-9)

- **Source:** AGG-9 (perf-reviewer PERF-2), carried forward from cycle 18
- **Severity / confidence:** MEDIUM / MEDIUM
- **Original severity preserved:** MEDIUM / MEDIUM
- **Citations:** `src/app/(public)/practice/page.tsx:410-519`
- **Reason for deferral:** The code has a comment acknowledging this should be moved to SQL. The JavaScript-side filtering works correctly for current data volumes. Scale concern, not an immediate bug.
- **Exit criterion:** When practice page performance becomes a measurable problem, or when a cycle has capacity for SQL optimization work.

### DEFER-24: Invitation URL uses `window.location.origin` (AGG-10)

- **Source:** AGG-10 (security-reviewer SEC-1, tracer TR-1)
- **Severity / confidence:** LOW / MEDIUM
- **Original severity preserved:** LOW / MEDIUM
- **Citations:** `src/components/contest/recruiting-invitations-panel.tsx:95,181,207`
- **Reason for deferral:** In current deployments, `window.location.origin` is trustworthy. The risk only materializes behind a misconfigured reverse proxy. The existing proxy-header workarounds in `contests/layout.tsx` show this has been problematic before, but the current deployment configuration is correct.
- **Exit criterion:** When proxy configuration changes, or when a cycle has capacity to add a server-provided `appUrl` config.

### DEFER-25: Duplicate `formatTimestamp` utility (AGG-11)

- **Source:** AGG-11 (code-reviewer CR-5)
- **Severity / confidence:** LOW / LOW
- **Original severity preserved:** LOW / LOW
- **Citations:** `src/components/contest/contest-clarifications.tsx:39-47`, `src/components/contest/contest-announcements.tsx:29-37`
- **Reason for deferral:** The duplicated functions work correctly. Extracting to a shared utility is a DRY improvement with no functional impact.
- **Exit criterion:** When a cycle has capacity for a focused DRY refactor pass, or when the timestamp formatting logic needs to change (ensuring all copies are updated).

---

## Progress log

- 2026-04-22: Plan created from cycle-2 aggregate review. 11 findings total. 5 scheduled for implementation (H1, H2, M1, M2, M3). 6 deferred (AGG-4 as DEFER-20, AGG-7 as DEFER-21, AGG-8 as DEFER-22, AGG-9 as DEFER-23, AGG-10 as DEFER-24, AGG-11 as DEFER-25).
- 2026-04-22: H1 DONE — fixed timezone bug in recruiting-invitations-panel.tsx expiry date min attribute, also added aria-label (M3) in same commit (b82a2c49). Fix: used local-date-aware computation instead of UTC.
- 2026-04-22: M3 DONE — added aria-label to date input using existing t("expiresAt") key. Fix for i18n key mismatch (0693a566).
- 2026-04-22: M1 DONE — added error toast to workers-client.tsx AliasCell save failure, using existing t("fetchError") key (3fc04106, bec0bc52).
- 2026-04-22: H2 DONE — added exponential backoff to SubmissionListAutoRefresh component (d1fb4799).
- 2026-04-22: M2 DONE — replaced native select with Radix Select in contest-clarifications.tsx (4ab470e0).
- 2026-04-22: All gates green (eslint 0 errors, tsc --noEmit 0 errors, next build success, vitest 294/294 passed, 2104/2104 tests).
