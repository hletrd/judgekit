# Cycle 12 Review Remediation Plan

**Date:** 2026-04-19
**Source:** `.context/reviews/cycle-12-comprehensive-review.md` and `.context/reviews/_aggregate.md`
**Status:** Open

---

## MEDIUM Priority

### M1: Replace hardcoded `=== "super_admin"` in `validateRoleChange`/`validateRoleChangeAsync`
- **File**: `src/lib/users/core.ts:93,113`
- **Status**: TODO
- **Fix**: 
  1. Import `isSuperAdminRole` from `@/lib/capabilities/cache`
  2. Replace `targetCurrentRole === "super_admin"` with `await isSuperAdminRole(targetCurrentRole)` in `validateRoleChangeAsync`
  3. Replace `requestedRole !== "super_admin"` with `!(await isSuperAdminRole(requestedRole))` in `validateRoleChangeAsync`
  4. For the sync `validateRoleChange`: make it async and use `isSuperAdminRole`, OR add a sync helper `isBuiltinSuperAdmin` using `DEFAULT_ROLE_LEVELS`. Preferred: make it async since `validateRoleChangeAsync` already exists and callers should migrate.
  5. Update all callers of `validateRoleChange` (sync) to use `validateRoleChangeAsync` instead
  6. Add `deprecated` JSDoc to `validateRoleChange`
- **Exit criterion**: No hardcoded `=== "super_admin"` checks remain in `core.ts`; all callers use async version.

### M2: Replace hardcoded `ROLE_LEVELS` in `POST /admin/roles` with `getRoleLevel()`
- **File**: `src/app/api/v1/admin/roles/route.ts:63-64`
- **Status**: TODO
- **Fix**:
  1. Remove local `ROLE_LEVELS` map at line 63
  2. Import `getRoleLevel` from `@/lib/capabilities/cache` (already imported at line 7)
  3. Replace `const creatorLevel = ROLE_LEVELS[user.role] ?? -1` with `const creatorLevel = await getRoleLevel(user.role)`
  4. The comparison `level > creatorLevel` stays the same since it's now using the canonical levels
- **Exit criterion**: No local `ROLE_LEVELS` map in roles POST route; uses `getRoleLevel()`.

---

## LOW Priority

### L1: Replace `resolveCapabilities` shortcut with level-based check
- **File**: `src/lib/capabilities/cache.ts:94`
- **Status**: TODO
- **Fix**:
  1. Remove the early-return `if (roleName === "super_admin")` shortcut
  2. After `await ensureLoaded()`, check if the role's level >= SUPER_ADMIN_LEVEL and return ALL_CAPABILITIES
  3. Fall through to existing logic for non-super-admin roles
- **Exit criterion**: Custom roles at super_admin level receive ALL_CAPABILITIES from `resolveCapabilities`.

### L2: Restrict column selection in `GET /api/v1/languages` (public endpoint)
- **File**: `src/app/api/v1/languages/route.ts:11-14`
- **Status**: TODO
- **Fix**:
  1. Replace `db.select().from(languageConfigs)` with explicit column selection:
     ```ts
     db.select({
       id: languageConfigs.id,
       language: languageConfigs.language,
       isEnabled: languageConfigs.isEnabled,
     }).from(languageConfigs)
     ```
  2. Adjust the `flatMap` callback to use the selected columns
- **Exit criterion**: Public languages endpoint only loads necessary columns from DB.

### L3: Add column selection to `GET /api/v1/files/[id]`
- **File**: `src/app/api/v1/files/[id]/route.ts:71-75`
- **Status**: TODO
- **Fix**:
  1. The response needs most file columns (id, storedName, originalName, mimeType, sizeBytes, problemId, uploadedBy, width, height, category) for the file serve and ETag headers
  2. Since nearly all columns are needed for the authorized response, this is low priority
  3. If deferring, note: the `files` table has no columns that are truly unnecessary for file serving
- **Deferred**: The `files` table has no sensitive/unnecessary columns for the file-serve use case. All loaded columns are used in the response. Adding column selection would be purely defensive for future schema changes. Re-open if `files` table gains audit/internal columns.

### L4: Add column selection to `GET /overrides`
- **File**: `src/app/api/v1/groups/[id]/assignments/[assignmentId]/overrides/route.ts:148`
- **Status**: TODO
- **Fix**:
  1. Replace `db.select().from(scoreOverrides)` with explicit column selection matching the response shape
  2. Columns: `id, assignmentId, problemId, userId, overrideScore, reason, createdBy, createdAt`
- **Exit criterion**: Score overrides GET uses explicit column selection.

### L5: Add column selection to admin roles endpoints
- **Files**: `src/app/api/v1/admin/roles/[id]/route.ts` and `src/app/api/v1/admin/roles/route.ts`
- **Status**: TODO
- **Fix**:
  1. Replace `db.select().from(roles)` with explicit column selection matching the response shape
  2. Columns: `id, name, displayName, description, isBuiltin, level, capabilities, createdAt, updatedAt`
  3. The GET list route (roles/route.ts) already uses explicit column selection at lines 20-30
  4. Only the individual role endpoints and POST re-fetch need fixing
- **Exit criterion**: All roles endpoints use explicit column selection.

---

## Deferred Items

| Finding | Severity | Reason | Exit Criterion |
|---------|----------|--------|----------------|
| L3 (files GET uncolumned select) | LOW | All loaded columns are used in the response; `files` table has no sensitive/unnecessary columns | Re-open if `files` table gains audit/internal columns |
