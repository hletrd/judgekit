# UI/UX Review — RPF Cycle 13

**Date:** 2026-04-22
**Reviewer:** designer
**Base commit:** 38206415

## Previously Fixed Items (Verified)

All cycle 12 designer findings are fixed:
- DES-1 (language-config-table icon-only buttons missing aria-label): Fixed
- DES-2 (shortcuts-help button missing aria-label): Fixed
- DES-3 (disk usage progress bar color-only indicator): Noted as LOW/LOW

## Findings

### DES-1: `workers-client.tsx` icon-only buttons missing `aria-label` — WCAG 4.1.2 violation (6 instances) [MEDIUM/HIGH]

**File:** `src/app/(dashboard)/dashboard/admin/workers/workers-client.tsx:120,123,133-140,187-194,201-208,372`

**Description:** Six icon-only buttons in the workers admin page lack `aria-label` attributes:
1. Save (Check icon) button — no `aria-label`
2. Cancel (X icon) button — no `aria-label`
3. Edit (Pencil icon) button — no `aria-label`
4. Copy docker command button — no `aria-label`
5. Copy deploy script button — no `aria-label`
6. Delete worker (Trash2 icon) button — no `aria-label`

This is inconsistent with other icon-only buttons in the codebase (e.g., the lecture toolbar buttons which all have `aria-label`, the api-keys copy button, the language config table buttons which were fixed in cycle 12).

From a UX perspective, icon-only buttons without accessible names fail WCAG 4.1.2 (Name, Role, Value). Screen readers announce "button" with no description.

**Fix:** Add `aria-label` to all six icon-only buttons.

**Confidence:** HIGH

---

### DES-2: `group-instructors-manager.tsx` remove button effectively icon-only — missing `aria-label` [LOW/MEDIUM]

**File:** `src/app/(dashboard)/dashboard/groups/[id]/group-instructors-manager.tsx:191-196`

**Description:** The remove instructor button contains only a Trash2 icon with no text content. It uses `size="sm"` but is effectively icon-only. No `aria-label` is present.

**Fix:** Add `aria-label={t("removeInstructor")}`.

**Confidence:** HIGH

---

### DES-3: Workers admin page `JUDGE_BASE_URL` uses `window.location.origin` — misleading if behind reverse proxy [LOW/LOW]

**File:** `src/app/(dashboard)/dashboard/admin/workers/workers-client.tsx:147`

**Description:** The "Add Worker" dialog displays Docker and deploy script commands with `JUDGE_BASE_URL` set to `window.location.origin`. If the app is behind a reverse proxy with a different public URL, the displayed command would be incorrect. This is a UX issue — the user would copy the command, run it, and the worker would fail to connect. This overlaps with SEC-2/DEFER-24.

**Fix:** Use a server-provided `appUrl` config value instead of `window.location.origin`.

**Confidence:** LOW

---

## Final Sweep

The codebase UX is generally good. The cycle 12 fixes are properly implemented. The main UX concern this cycle is icon-only buttons missing `aria-label` in the workers admin page — the same class of accessibility issue that was fixed across discussion components, the compiler client, and the language config table in prior cycles. The workers page was missed because it is an admin-only page that receives less review attention.
