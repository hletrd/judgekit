# Document Specialist Review — RPF Cycle 23

**Date:** 2026-04-22
**Reviewer:** document-specialist
**Base commit:** 429d1b86

## DOC-1: `src/lib/api/client.ts` documents the double-.json() anti-pattern, but 4 files still use it [MEDIUM/MEDIUM]

**File:** `src/lib/api/client.ts:45-53`

**Confidence:** HIGH

The JSDoc and code comments in `client.ts` explicitly document the "Response body single-read rule" and the anti-pattern of calling `.json()` before checking `response.ok`. However, 3 files still use the exact anti-pattern:

1. `src/app/(dashboard)/dashboard/contests/join/contest-join-client.tsx:44-49`
2. `src/app/(dashboard)/dashboard/problems/create/create-problem-form.tsx:432-437`
3. `src/app/(dashboard)/dashboard/groups/[id]/group-members-manager.tsx:124-128`

The documentation is correct and thorough — the code just doesn't follow it in these cases. The `apiFetchJson` utility was created to enforce the documented pattern automatically.

**Fix:** Migrate these files to `apiFetchJson` to align code with documentation.

---

## DOC-2: `normalizePage` in `src/lib/pagination.ts` has no JSDoc explaining MAX_PAGE [LOW/LOW]

**File:** `src/lib/pagination.ts:7`

**Confidence:** LOW

The `normalizePage` function lacks a JSDoc comment explaining the `MAX_PAGE = 10000` upper bound and why it exists. This makes it harder for developers to understand the design intent when they encounter the function.

**Fix:** Add a brief JSDoc: `Normalizes a page number query parameter. Values below 1 default to 1; values above 10000 are capped to prevent unbounded DB OFFSET queries.`

---

## DOC-3: Local `normalizePage` functions have no comment explaining why they differ from the shared version [LOW/LOW]

**Files:** (same 5 files as ARCH-1)

**Confidence:** LOW

The 5 local `normalizePage` functions have no comment indicating they are local copies or explaining why they differ from the shared version. A developer reading the code would assume these are the same as the shared version.

**Fix:** If these are replaced with imports (recommended), no documentation needed. If kept, add a comment referencing the shared version.
