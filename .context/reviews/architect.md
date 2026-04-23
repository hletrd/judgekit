# Architectural Review — RPF Cycle 16

**Date:** 2026-04-22
**Reviewer:** architect
**Base commit:** 9379c26b

## Inventory of Review-Relevant Files

Focus: module boundaries, coupling patterns, API handler abstraction adoption, component decomposition, data flow patterns.

## Findings

### ARCH-1: Incomplete `apiFetchJson` adoption — remaining components still use raw pattern [MEDIUM/HIGH]

**Files:**
- `src/components/contest/recruiter-candidates-panel.tsx:50-54`
- `src/components/contest/invite-participants.tsx:42-47, 68-78`
- `src/components/contest/access-code-manager.tsx:41-43, 82-88`
- `src/components/code/compiler-client.tsx:270,287`
- `src/components/contest/quick-create-contest-form.tsx:80`
- `src/components/contest/contest-quick-stats.tsx:52`
- `src/components/contest/code-timeline-panel.tsx:57`
- `src/components/lecture/submission-overview.tsx:87`
- `src/app/(dashboard)/dashboard/admin/files/file-upload-dialog.tsx:102`
- `src/app/(dashboard)/dashboard/admin/roles/role-editor-dialog.tsx:97`
- `src/app/(dashboard)/dashboard/admin/roles/role-delete-dialog.tsx:50`
- `src/app/(dashboard)/dashboard/admin/api-keys/api-keys-client.tsx:141,177`
- `src/app/(dashboard)/dashboard/submissions/[id]/submission-detail-client.tsx:105`
- `src/app/(dashboard)/dashboard/groups/[id]/group-instructors-manager.tsx:72`
- `src/app/(dashboard)/dashboard/admin/languages/language-config-table.tsx:94,136,159,177`
- `src/app/(dashboard)/dashboard/problems/create/create-problem-form.tsx:220,332,336,424,428`
- `src/app/(dashboard)/dashboard/problems/problem-import-button.tsx:37,42`
- `src/app/(dashboard)/dashboard/problems/[id]/problem-export-button.tsx:19`

**Confidence:** HIGH

The `apiFetchJson` helper was introduced in cycle 14 and adopted in 4 contest components + workers-client + recruiting-invitations-panel. However, 17+ components still use the raw `apiFetch` + `res.json().catch()` pattern. While these all have `.catch()` guards (so they are safe), the inconsistency means:
1. New developers may copy the old pattern from existing code
2. The `apiFetchJson` helper's value (eliminating a class of bugs) is not fully realized
3. Mutation operations (POST, PATCH, DELETE) still universally use raw `apiFetch`

The architectural concern is that two patterns coexist without a clear migration strategy. A `apiFetchJsonMutation` helper for POST/PATCH/DELETE would complete the abstraction.

**Fix:** Create a systematic plan to migrate all remaining GET-pattern fetches to `apiFetchJson` and consider adding an `apiFetchJsonMutation` helper for mutation operations.

---

### ARCH-2: `test-connection/route.ts` bypasses `createApiHandler` body parsing [MEDIUM/MEDIUM]

**File:** `src/app/api/v1/plugins/chat-widget/test-connection/route.ts:20-37`
**Confidence:** HIGH

This route uses `createApiHandler` with `auth: false` but then manually calls `req.json()` and `requestSchema.safeParse()` inside the handler. This defeats the purpose of `createApiHandler`, which provides built-in body parsing + Zod validation when the `schema` option is used. The manual approach:
1. Bypasses the handler's error handling for malformed JSON (returns 500 instead of 400)
2. Duplicates the body-parsing logic that `createApiHandler` already implements
3. Creates a maintenance risk where future schema changes must be kept in sync manually

**Fix:** Use the `schema` option in `createApiHandler` config to delegate body parsing and validation. Move the auth/capability checks into the handler body since `auth: false` is needed for the CSRF bypass (but auth is still required via manual session check).

---

### ARCH-3: `language-config-table.tsx` is 688 lines — should be decomposed — carried from ARCH-3 (cycle 14) [LOW/LOW]

Already tracked. No new finding.

---

### ARCH-4: `recruiting-invitations-panel.tsx` mutation operations all use raw `apiFetch` with manual error handling [LOW/LOW]

**File:** `src/components/contest/recruiting-invitations-panel.tsx:195-311`
**Confidence:** HIGH

The GET endpoints were migrated to `apiFetchJson` in cycle 15, but all 4 mutation operations (handleCreate, handleRevoke, handleResetAccountPassword, handleDelete) still use raw `apiFetch`. This creates a split pattern within the same component where reads use one abstraction and writes use another. This is a design smell but not a bug — the `.catch()` guards are present.

**Fix:** Consider an `apiFetchMutation` helper that handles the common pattern of: fetch, check ok, parse error/success bodies, return structured result.

## Previously Deferred (Carried Forward)

- DEFER-1: Migrate raw route handlers to `createApiHandler` (22 routes)
