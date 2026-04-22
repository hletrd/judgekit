# Architectural Review — RPF Cycle 13

**Date:** 2026-04-22
**Reviewer:** architect
**Base commit:** 38206415

## Previously Fixed Items (Verified)

- ARCH-1 (centralized error-to-i18n mapping utility): Acknowledged as a refactor suggestion
- ARCH-2 (language-config-table.tsx decompose): Acknowledged as LOW/LOW

## Findings

### ARCH-1: No centralized `res.json()` safety pattern — inconsistent error handling across client components [MEDIUM/MEDIUM]

**Files:** Multiple components across the codebase

**Description:** The codebase has at least three distinct patterns for handling `res.json()` on API responses:
1. **With `.catch()` on error paths only** (e.g., `group-instructors-manager.tsx:72`, `problem-import-button.tsx:32`, `invite-participants.tsx:78`) — the established pattern documented in `apiFetch` JSDoc
2. **Without `.catch()` on success paths** (e.g., `submission-overview.tsx:87`, `recruiter-candidates-panel.tsx:54`, `quick-create-contest-form.tsx:80`, `code-timeline-panel.tsx:57`, `analytics-charts.tsx:542`, `leaderboard-table.tsx:231`, `anti-cheat-dashboard.tsx:124,161`, `contest-quick-stats.tsx:52`, `submission-detail-client.tsx:105`)
3. **Without `res.ok` check at all** (e.g., `chat-logs-client.tsx:58,73`)

This inconsistency is a code smell that suggests the pattern is not well-enforced. New developers following existing examples in the codebase may pick up the wrong pattern.

**Fix:** Consider:
1. Creating a typed `apiFetch` wrapper that returns parsed JSON with type safety: `const { data, error } = await apiFetchJson<T>(url, options)`.
2. Adding an ESLint rule or convention that `.json()` should always be guarded with `.catch()`.
3. Updating the `apiFetch` JSDoc to document the success-path pattern as well.

**Confidence:** MEDIUM

---

### ARCH-2: Icon-only buttons missing `aria-label` — systemic pattern across admin pages [MEDIUM/LOW]

**Files:**
- `src/app/(dashboard)/dashboard/admin/workers/workers-client.tsx` (6 instances)
- `src/app/(dashboard)/dashboard/groups/[id]/group-instructors-manager.tsx` (1 instance)

**Description:** This is a recurring architectural issue. The codebase has been fixing icon-only buttons missing `aria-label` on a page-by-page basis (discussion components in cycle 9, compiler client in cycle 10, language config table in cycle 12). Each review cycle finds new instances in different pages. This suggests a systemic issue rather than isolated oversights.

**Fix:** Consider:
1. Creating a custom `IconButton` component that requires `aria-label` as a prop.
2. Adding an ESLint rule that flags `Button` components with `size="icon"` or `size="icon-sm"` that lack `aria-label`.
3. Running an accessibility audit tool (e.g., axe-core) in CI.

**Confidence:** MEDIUM

---

### ARCH-3: `language-config-table.tsx` is 688 lines — should be decomposed [LOW/LOW]

**File:** `src/app/(dashboard)/dashboard/admin/languages/language-config-table.tsx`

**Description:** Carried from ARCH-2 (cycle 12). This component contains: the main table, edit sheet, add sheet, confirmation dialog, image status fetching, build/remove/prune handlers, search filtering, and disk usage display. At 688 lines it is difficult to maintain.

**Fix:** Extract `LanguageEditSheet`, `LanguageAddSheet`, and `LanguageConfirmDialog` as separate components.

**Confidence:** LOW

---

## Final Sweep

The cycle 12 fixes are properly implemented. The main architectural concerns this cycle are: (1) the lack of a centralized `res.json()` safety pattern, which leads to inconsistent error handling across client components, and (2) the systemic pattern of icon-only buttons missing `aria-label`, which keeps appearing on different pages in each review cycle. Both suggest a need for a more structural fix rather than continued page-by-page remediation.
