# Code Quality Review — RPF Cycle 16

**Date:** 2026-04-22
**Reviewer:** code-reviewer
**Base commit:** 9379c26b

## Inventory of Review-Relevant Files

All `src/` files under app, components, lib, hooks, contexts. Key focus areas: recently changed files (recruiting-invitations-panel, anti-cheat-dashboard, workers-client, api/client.ts) and common cross-cutting patterns (error handling, API consumption, i18n, accessibility).

## Findings

### CR-1: `compiler-client.tsx` unguarded `res.json()` on error path [MEDIUM/HIGH]

**File:** `src/components/code/compiler-client.tsx:270`
**Confidence:** HIGH

The error path calls `await res.json()` without `.catch()`. If the server returns a non-JSON body (e.g., 502 HTML from a reverse proxy), this will throw a SyntaxError and the outer `catch` block will produce a generic "Network error" message instead of using the server's statusText.

```ts
// Line 270
const errorData = await res.json();
errorMessage = errorData.error || errorData.message || errorMessage;
```

**Fix:** Change to `const errorData = await res.json().catch(() => ({}));` to be consistent with the established pattern across the entire codebase.

---

### CR-2: `recruiter-candidates-panel.tsx` uses raw `apiFetch` + `.json()` instead of `apiFetchJson` [MEDIUM/MEDIUM]

**File:** `src/components/contest/recruiter-candidates-panel.tsx:50-54`
**Confidence:** HIGH

This component was not migrated to `apiFetchJson` during the cycle 14-15 refactor. It uses raw `apiFetch` + `res.json().catch(() => [])` which is the old pattern. The `.catch(() => [])` returns an array fallback but `setCandidates(Array.isArray(data) ? data : [])` guards it, so it works but is inconsistent with the rest of the codebase.

**Fix:** Migrate to `apiFetchJson` for consistency.

---

### CR-3: `invite-participants.tsx` uses raw `apiFetch` + `.json()` instead of `apiFetchJson` [MEDIUM/MEDIUM]

**File:** `src/components/contest/invite-participants.tsx:42-47, 68-78`
**Confidence:** HIGH

Same as CR-2. Two separate fetch calls using the old pattern. Both the search and invite functions could use `apiFetchJson` for consistency and safety.

**Fix:** Migrate both fetch calls to `apiFetchJson`.

---

### CR-4: `access-code-manager.tsx` uses raw `apiFetch` + `.json()` instead of `apiFetchJson` [MEDIUM/MEDIUM]

**File:** `src/components/contest/access-code-manager.tsx:41-43, 82-88`
**Confidence:** HIGH

Three fetch operations (fetchCode, handleGenerate) all use raw `apiFetch` + `.json()` with manual `.catch()`. Same class of inconsistency as CR-2/CR-3.

**Fix:** Migrate to `apiFetchJson`.

---

### CR-5: `file-management-client.tsx` copy/delete buttons missing `aria-label` [LOW/MEDIUM]

**File:** `src/app/(dashboard)/dashboard/admin/files/file-management-client.tsx:199-210`
**Confidence:** HIGH

The "Copy URL" and "Delete" buttons use `variant="ghost" size="sm"` with only `title` attributes but no `aria-label`. The `title` attribute is not reliably announced by screen readers; `aria-label` is required for icon-only buttons.

**Fix:** Add `aria-label` to both buttons.

---

### CR-6: `recruiter-candidates-panel.tsx` `handleCsvDownload` uses `window.open` with no sanitization of assignmentId [LOW/LOW]

**File:** `src/components/contest/recruiter-candidates-panel.tsx:90-98`
**Confidence:** LOW

The `assignmentId` prop is used directly in `window.open()` URL construction. If `assignmentId` contained special characters, it could cause unexpected behavior. Since assignment IDs come from route params and are UUIDs, this is extremely unlikely.

**Fix:** Add `encodeURIComponent(assignmentId)` for defense-in-depth.

## Final Sweep

- All `src/` directories reviewed: app, components, lib, hooks, contexts
- No SQL injection risks found (parameterized queries used throughout)
- No `eval()` or `new Function()` usage found
- No `innerHTML` usage found (only `dangerouslySetInnerHTML` with `sanitizeHtml` and `safeJsonForScript`)
- No `@ts-ignore` or `@ts-expect-error` usage found
- Only 2 `eslint-disable` comments, both justified
- All previously fixed items from cycles 11-15 remain fixed
