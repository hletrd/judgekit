# Critic Review — RPF Cycle 13

**Date:** 2026-04-22
**Reviewer:** critic
**Base commit:** 38206415

## Previously Fixed Items (Verified)

All cycle 12 critic findings are fixed.

## Findings

### CRI-1: `workers-client.tsx` icon-only buttons missing `aria-label` — same pattern as cycle 12 language-config-table [MEDIUM/HIGH]

**File:** `src/app/(dashboard)/dashboard/admin/workers/workers-client.tsx:120,123,133-140,187-194,201-208,372`

**Description:** Six icon-only buttons in the workers admin page lack `aria-label` attributes. This is the same class of WCAG 4.1.2 issue that was fixed in cycle 12 for the language-config-table. The pattern is inconsistent with other icon-only buttons in the codebase. The cycle 12 fix addressed the language table but missed the workers page.

**Concrete failure scenario:** A screen reader user navigates the workers admin page. Icon-only buttons are announced as "button" with no description.

**Fix:** Add `aria-label` to all six icon-only buttons.

**Confidence:** HIGH

---

### CRI-2: Inconsistent `res.json()` error handling — some components have `.catch()`, others don't [MEDIUM/MEDIUM]

**Files:**
- `src/app/(dashboard)/dashboard/admin/plugins/chat-logs/chat-logs-client.tsx:58,73` — no `res.ok` check, no `.catch()`
- `src/components/contest/recruiter-candidates-panel.tsx:54` — success path, no `.catch()`
- `src/components/contest/quick-create-contest-form.tsx:80` — success path, no `.catch()`
- `src/components/contest/invite-participants.tsx:46` — success path, no `.catch()`
- `src/components/contest/code-timeline-panel.tsx:57` — success path, no `.catch()`
- `src/components/contest/analytics-charts.tsx:542` — success path, no `.catch()`
- `src/components/contest/leaderboard-table.tsx:231` — success path, no `.catch()`
- `src/components/contest/anti-cheat-dashboard.tsx:124,161` — success path, no `.catch()`
- `src/components/contest/contest-quick-stats.tsx:52` — success path, no `.catch()`
- `src/components/lecture/submission-overview.tsx:87` — success path, no `.catch()`
- `src/app/(dashboard)/dashboard/submissions/[id]/submission-detail-client.tsx:105` — success path, no `.catch()`

**Description:** The codebase has an established pattern (documented in `apiFetch` JSDoc) of using `.json().catch(() => ({}))` on error paths. However, there is no consistent pattern for success paths. Some components use `.catch()` on success paths (e.g., `language-config-table.tsx:94`) while many others do not. This inconsistency makes it hard for developers to know which pattern to follow.

The `chat-logs-client.tsx` is particularly concerning because it lacks BOTH the `res.ok` check AND the `.catch()` guard.

**Fix:** Establish a consistent pattern: always use `.catch()` on error paths, and consider adding `.catch()` on success paths as a defensive measure. The chat-logs client needs both a `res.ok` check and `.catch()`.

**Confidence:** HIGH

---

### CRI-3: `group-instructors-manager.tsx` remove instructor button effectively icon-only but missing `aria-label` [LOW/MEDIUM]

**File:** `src/app/(dashboard)/dashboard/groups/[id]/group-instructors-manager.tsx:191-196`

**Description:** The remove instructor button contains only a `<Trash2>` icon with no visible text. While it uses `size="sm"` instead of `size="icon"`, it is effectively an icon-only button that needs `aria-label` for accessibility.

**Fix:** Add `aria-label={t("removeInstructor")}`.

**Confidence:** HIGH

---

## Final Sweep

The codebase is in good shape overall. The cycle 12 fixes are properly implemented. The main systemic issues this cycle are: (1) workers admin page has 6 icon-only buttons missing `aria-label`, continuing the pattern from prior cycles where different pages are fixed in each pass, and (2) the inconsistent `res.json()` handling across the codebase — particularly the chat-logs client that lacks both the `res.ok` check and the `.catch()` guard.
