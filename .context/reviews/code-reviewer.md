# Code Quality Review — RPF Cycle 13

**Date:** 2026-04-22
**Reviewer:** code-reviewer
**Base commit:** 38206415

## Previously Fixed Items (Verified in Current Code)

All cycle 12 findings are fixed:
- AGG-1 (language-config-table icon-only buttons missing aria-label): Fixed — all three buttons now have `aria-label`
- AGG-2 (unguarded res.json() on error paths in group-instructors-manager and problem-import-button): Fixed — both use `.catch(() => ({}))` now
- AGG-3 (shortcuts-help icon-only button missing aria-label): Fixed — now has `aria-label={t("shortcutsTitle")}`
- AGG-4 (language-config-table unguarded res.json() on success path): Fixed — now uses `.catch(() => ({ data: {} }))`

## Findings

### CR-1: `workers-client.tsx` multiple icon-only buttons missing `aria-label` — WCAG 4.1.2 [MEDIUM/HIGH]

**Files:**
- `src/app/(dashboard)/dashboard/admin/workers/workers-client.tsx:120`
- `src/app/(dashboard)/dashboard/admin/workers/workers-client.tsx:123`
- `src/app/(dashboard)/dashboard/admin/workers/workers-client.tsx:133-140`
- `src/app/(dashboard)/dashboard/admin/workers/workers-client.tsx:187-194`
- `src/app/(dashboard)/dashboard/admin/workers/workers-client.tsx:201-208`
- `src/app/(dashboard)/dashboard/admin/workers/workers-client.tsx:372`

**Description:** Six icon-only buttons in the workers admin page lack `aria-label` attributes:
1. Line 120: Save (Check icon) button in editable alias field — no `aria-label`
2. Line 123: Cancel (X icon) button in editable alias field — no `aria-label`
3. Lines 133-140: Edit (Pencil icon) button for alias — no `aria-label`
4. Lines 187-194: Copy docker command button — no `aria-label`
5. Lines 201-208: Copy deploy script button — no `aria-label`
6. Line 372: Delete worker (Trash2 icon) button — no `aria-label`

This is the same class of WCAG 4.1.2 violation fixed in cycle 12 for the language-config-table. The pattern is inconsistent with other icon-only buttons in the codebase (e.g., lecture toolbar, api-keys copy button, language config table).

**Concrete failure scenario:** A screen reader user navigates the workers admin page. Icon-only buttons are announced as "button" with no description.

**Fix:** Add `aria-label` to all six icon-only buttons:
- Line 120: `aria-label={t("save")}`
- Line 123: `aria-label={t("cancel")}`
- Line 140: `aria-label={t("editAlias")}`
- Line 192: `aria-label={t("copyDockerCommand")}`
- Line 207: `aria-label={t("copyDeployScript")}`
- Line 372: `aria-label={t("removeWorker")}`

**Confidence:** HIGH

---

### CR-2: `chat-logs-client.tsx` unguarded `res.json()` — no `.catch()` and no `res.ok` check [MEDIUM/MEDIUM]

**File:** `src/app/(dashboard)/dashboard/admin/plugins/chat-logs/chat-logs-client.tsx:58,73`

**Description:** Two `fetchSessions` and `fetchMessages` calls use `await res.json()` without first checking `res.ok` and without `.catch()`. Line 58: `const data = await res.json()` in fetchSessions — no `res.ok` check. Line 73: `const data = await res.json()` in fetchMessages — no `res.ok` check. If the server returns a non-JSON body or a non-OK status, this throws SyntaxError or processes invalid data.

**Concrete failure scenario:** The admin chat-logs API returns 503 with HTML. `res.json()` throws SyntaxError. The outer catch displays a generic error toast. The exception path is unnecessary.

**Fix:** Add `res.ok` check before calling `.json()`, and use `.catch(() => ({}))` as a safety guard.

**Confidence:** HIGH

---

### CR-3: `recruiter-candidates-panel.tsx:54` unguarded `res.json()` — no `.catch()` on success path [MEDIUM/MEDIUM]

**File:** `src/components/contest/recruiter-candidates-panel.tsx:54`

**Description:** After checking `res.ok`, line 54 calls `const data = await res.json()` without a `.catch()` guard. If the server returns a non-JSON 200 response (e.g., empty body), this throws SyntaxError. The outer catch displays `t("fetchError")`, which is correct UX, but the SyntaxError is avoidable.

**Fix:** Use `await res.json().catch(() => [])` since `setCandidates(Array.isArray(data) ? data : [])` already handles non-array data.

**Confidence:** HIGH

---

### CR-4: `quick-create-contest-form.tsx:80` unguarded `res.json()` on success path [MEDIUM/MEDIUM]

**File:** `src/components/contest/quick-create-contest-form.tsx:80`

**Description:** After checking `res.ok`, line 80 calls `const json = await res.json()` without `.catch()`. If the server returns a non-JSON 200 body, this throws SyntaxError. The error path (line 83-84) doesn't have `.catch()` either.

**Fix:** Add `.catch()` guards on both paths: success and error.

**Confidence:** MEDIUM

---

### CR-5: `group-instructors-manager.tsx:191-196` icon-only remove button missing `aria-label` [LOW/MEDIUM]

**File:** `src/app/(dashboard)/dashboard/groups/[id]/group-instructors-manager.tsx:191-196`

**Description:** The remove instructor button uses a Trash2 icon inside a `Button` with `size="sm"`, not `size="icon"`. However, the button contains only an icon with no text content, so it is effectively icon-only. It lacks an `aria-label`. Screen readers would announce "button" with no description.

**Fix:** Add `aria-label={t("removeInstructor")}` to the Button.

**Confidence:** HIGH

---

### CR-6: `invite-participants.tsx:46` unguarded `res.json()` on success path [LOW/MEDIUM]

**File:** `src/components/contest/invite-participants.tsx:46`

**Description:** After checking `res.ok`, line 46 calls `const data = await res.json()` without `.catch()`. The error path (line 78) correctly uses `.catch()`, but the success path does not. Same pattern as other unguarded success-path `.json()` calls.

**Fix:** Add `.catch(() => ({}))` on the success path as well.

**Confidence:** MEDIUM

---

### CR-7: `recruiting-invitations-panel.tsx:218` unguarded `res.json()` on error path [LOW/MEDIUM]

**File:** `src/components/contest/recruiting-invitations-panel.tsx:218`

**Description:** In the `else` block (after `!res.ok`), line 218 calls `const json = await res.json()` without `.catch()`. The code wraps it in a try-catch, but it would be more consistent with the established pattern to use `.catch(() => ({}))`.

**Fix:** Change to `const json = await res.json().catch(() => ({}))` and remove the surrounding try-catch if it only guards the `.json()` call.

**Confidence:** MEDIUM

---

## Final Sweep

The cycle 12 fixes are properly implemented. The main new findings this cycle are:
1. Workers admin page has 6 icon-only buttons missing `aria-label` — the same class of WCAG 4.1.2 issue fixed in prior cycles for other pages.
2. Several components still have unguarded `res.json()` calls on both error and success paths.
3. The chat-logs client is particularly concerning because it lacks both the `res.ok` check AND the `.catch()` guard.
