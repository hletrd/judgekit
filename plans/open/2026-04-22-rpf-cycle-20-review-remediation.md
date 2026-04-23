# RPF Cycle 20 — Review Remediation Plan

**Date:** 2026-04-22
**Source:** `.context/reviews/rpf-cycle-20-aggregate.md`
**Status:** Done

## Scope

This cycle addresses NEW findings from the RPF cycle 20 aggregate review:
- AGG-1: Unguarded `.json()` + undefined navigation crash in create-group-dialog
- AGG-2: Unguarded `.json()` in admin-config test-connection
- AGG-3: Unguarded `.json()` in all three AI provider chatWithTools
- AGG-4: Unguarded `.json()` in comment-section GET fetch
- AGG-5: `Number()` NaN risk in admin-config maxTokens/rateLimitPerMinute
- AGG-6: `Number()` NaN risk in assignment-form-dialog exam duration
- AGG-7: `apiFetchJson` JSDoc missing success-path `.catch()` mention
- AGG-8: Test connection result not announced to screen readers

No cycle-20 review finding is silently dropped. No new refactor-only work is added under deferred.

---

## Implementation lanes

### M1: Add `.catch()` guard + undefined navigation guard in create-group-dialog (AGG-1)

- **Source:** AGG-1
- **Severity / confidence:** MEDIUM / HIGH
- **Citations:** `src/app/(dashboard)/dashboard/groups/create-group-dialog.tsx:74,78`
- **Problem:** Line 74 calls `response.json()` without `.catch()` on the success path. If `.json()` throws, the group was created but the user cannot navigate. Line 78 accesses `data.data.id` without guarding against undefined.
- **Plan:**
  1. Change line 74 to `const data = await response.json().catch(() => ({ data: {} })) as { data?: { id?: string } };`
  2. Guard line 78: `const groupId = data.data?.id; if (groupId) { router.push(`/dashboard/groups/${groupId}`); }`
  3. Add `else` branch: `router.push("/dashboard/groups");` so user lands on groups list even if id is missing
  4. Verify all gates pass
- **Status:** DONE

---

### M2: Add `.catch()` guard to admin-config test-connection (AGG-2)

- **Source:** AGG-2
- **Severity / confidence:** MEDIUM / MEDIUM
- **Citations:** `src/lib/plugins/chat-widget/admin-config.tsx:103`
- **Problem:** `response.json()` without `.catch()` on the success path in handleTestConnection.
- **Plan:**
  1. Change line 103 to `const data = await response.json().catch(() => ({ success: false, error: "parseError" }));`
  2. Verify all gates pass
- **Status:** DONE

---

### M3: Add `.catch()` guards to all three AI provider chatWithTools (AGG-3)

- **Source:** AGG-3
- **Severity / confidence:** MEDIUM / MEDIUM
- **Citations:**
  - `src/lib/plugins/chat-widget/providers.ts:138` (OpenAI)
  - `src/lib/plugins/chat-widget/providers.ts:258` (Claude)
  - `src/lib/plugins/chat-widget/providers.ts:398` (Gemini)
- **Problem:** All three `chatWithTools` call `response.json()` without `.catch()` after `response.ok`.
- **Plan:**
  1. Wrap each `.json()` call in `.catch(() => ({}))` — an empty object is a safe fallback since the code checks for specific fields (choices, content, candidates)
  2. Verify all gates pass
- **Status:** DONE

---

### M4: Add `.catch()` guard to comment-section GET fetch (AGG-4)

- **Source:** AGG-4
- **Severity / confidence:** MEDIUM / MEDIUM
- **Citations:** `src/app/(dashboard)/dashboard/submissions/[id]/_components/comment-section.tsx:45`
- **Problem:** `response.json()` without `.catch()` on the success path in fetchComments.
- **Plan:**
  1. Change line 45 to `const payload = (await response.json().catch(() => ({ data: [] }))) as { data?: CommentView[] };`
  2. Verify all gates pass
- **Status:** DONE

---

### L1: Fix `Number()` NaN risk in admin-config maxTokens/rateLimitPerMinute (AGG-5)

- **Source:** AGG-5
- **Severity / confidence:** LOW / MEDIUM
- **Citations:** `src/lib/plugins/chat-widget/admin-config.tsx:294,305`
- **Problem:** `Number(e.target.value)` can produce `0` from empty string or `NaN` from invalid text.
- **Plan:**
  1. Change line 294: `setMaxTokens(parseInt(e.target.value, 10) || 100)`
  2. Change line 305: `setRateLimitPerMinute(parseInt(e.target.value, 10) || 10)`
  3. Verify all gates pass
- **Status:** DONE

---

### L2: Fix `Number()` NaN risk in assignment-form-dialog exam duration (AGG-6)

- **Source:** AGG-6
- **Severity / confidence:** LOW / MEDIUM
- **Citations:** `src/app/(dashboard)/dashboard/groups/[id]/assignment-form-dialog.tsx:454`
- **Problem:** `Number(e.target.value)` for exam duration can produce `NaN` or `0` from invalid/empty input.
- **Plan:**
  1. Change line 454: `setExamDurationMinutes(e.target.value ? parseInt(e.target.value, 10) || null : null)`
  2. Verify all gates pass
- **Status:** DONE

---

### L3: Update `apiFetchJson` JSDoc to mention success-path `.catch()` protection (AGG-7)

- **Source:** AGG-7
- **Severity / confidence:** LOW / MEDIUM
- **Citations:** `src/lib/api/client.ts:87-123`
- **Problem:** JSDoc does not explicitly state that `.catch()` applies to both success and error response parsing.
- **Plan:**
  1. Add explicit note to JSDoc about both-path `.catch()` protection
  2. Verify all gates pass
- **Status:** DONE

---

### L4: Add screen reader announcement for test connection result (AGG-8)

- **Source:** AGG-8
- **Severity / confidence:** LOW / LOW
- **Citations:** `src/lib/plugins/chat-widget/admin-config.tsx:240-243`
- **Problem:** Test connection result is a `<span>` with no `role` or `aria-live`. Screen readers won't announce it.
- **Plan:**
  1. Add `role="status"` and `aria-live="polite"` to the result container
  2. Verify all gates pass
- **Status:** DONE

---

## Deferred items

### DEFER-1: Practice page Path B progress filter — fetches all into memory (carried from cycles 18-20)

- **Source:** PERF-2 (cycle 18)
- **Severity / confidence:** MEDIUM / MEDIUM (original preserved)
- **Citations:** `src/app/(public)/practice/page.tsx:410-519`
- **Reason for deferral:** Requires SQL CTE/subquery implementation. Significant backend change.
- **Exit criterion:** Progress filter logic moved to SQL query.

### DEFER-2: Mobile menu sign-out button touch target (carried from cycle 19)

- **Source:** AGG-11 (cycle 19)
- **Severity / confidence:** LOW / LOW (original preserved)
- **Citations:** `src/components/layout/public-header.tsx:319`
- **Reason for deferral:** Meets WCAG 2.2 minimum (24px) but below recommended 44px for touch targets.
- **Exit criterion:** When an accessibility improvement pass is scheduled.

### DEFER-3: ESLint rule to prevent unguarded `.json()` calls (from ARCH-1)

- **Source:** ARCH-1 (cycle 20)
- **Severity / confidence:** MEDIUM / HIGH (architectural concern)
- **Citations:** All files using `apiFetch` + `.json()` directly
- **Reason for deferral:** Requires custom ESLint rule development and CI integration. Not a code fix.
- **Exit criterion:** When a tooling enforcement pass is scheduled.

### DEFER-4: Component tests for create-group-dialog, admin-config, comment-section, providers (from TE-1 through TE-4)

- **Source:** TE-1 through TE-4 (cycle 20)
- **Severity / confidence:** LOW / MEDIUM
- **Citations:** See test-engineer review for specific file citations
- **Reason for deferral:** Test infrastructure for component-level mocking of `apiFetch` needs setup. Large scope.
- **Exit criterion:** When component test coverage pass is scheduled.

---

## Progress log

- 2026-04-22: Plan created from RPF cycle 20 aggregate review. 8 tasks (M1-M4, L1-L4). 4 deferred items. All findings from the aggregate review are either scheduled for implementation or explicitly deferred.
- 2026-04-22: All 8 tasks implemented (M1-M4, L1-L4). All gates pass (eslint, next build, vitest unit). 6 commits pushed.
