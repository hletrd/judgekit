# Aggregate Review — Cycle 12 Deep Code Review

**Date:** 2026-04-19
**Source reviews:**
- `cycle-12-comprehensive-review.md` (comprehensive multi-angle review covering code quality, security, performance, architecture, correctness, consistency)
- Prior cycles 1-11 reviews (findings already addressed or deferred in prior plan documents)

---

## CRITICAL (Immediate Action Required)

None.

---

## HIGH (Should Fix This Cycle)

None.

---

## MEDIUM (Should Fix Soon)

### M1: `validateRoleChange`/`validateRoleChangeAsync` use hardcoded `=== "super_admin"` instead of `isSuperAdminRole()`
- **Source**: cycle-12 F1
- **Files**: `src/lib/users/core.ts:93,113`
- **Description**: Both functions check `targetCurrentRole === "super_admin"` using hardcoded string comparison. Custom roles with super_admin-level privileges would bypass this safety rail, allowing their role to be changed by non-super-admin actors. Same class of bug fixed in cycle 3 (AUTH-01) and cycle 11 (F4) for other routes.
- **Fix**: Import `isSuperAdminRole` from `@/lib/capabilities/cache` and replace both hardcoded checks. Since `validateRoleChange` (sync) would need to become async, callers should be migrated to `validateRoleChangeAsync`, or a sync `isSuperAdminRoleSync` helper should be added using built-in defaults.

### M2: `POST /admin/roles` uses hardcoded local `ROLE_LEVELS` map with inconsistent values
- **Source**: cycle-12 F2
- **Files**: `src/app/api/v1/admin/roles/route.ts:63-64`
- **Description**: Same pattern as cycle-11 F5 (fixed in PATCH route) but the POST route was missed. Local `ROLE_LEVELS` has different values than canonical `ROLE_LEVEL` in constants.ts. Custom roles get level `-1`, blocking role creation.
- **Fix**: Replace local `ROLE_LEVELS` with `getRoleLevel()` from `@/lib/capabilities/cache`.

---

## LOW (Best Effort / Track)

### L1: `resolveCapabilities` shortcut uses `roleName === "super_admin"` instead of level-based check
- **Source**: cycle-12 F3
- **Files**: `src/lib/capabilities/cache.ts:94`
- **Description**: Early-return shortcut only matches literal "super_admin" string, not custom roles at super_admin level. Inconsistent with the documented intent that all super_admin-level roles have ALL_CAPABILITIES.
- **Fix**: Add level-based check after `ensureLoaded()`.

### L2: `GET /api/v1/languages` (public, no auth) loads full `languageConfigs` rows
- **Source**: cycle-12 F4
- **Files**: `src/app/api/v1/languages/route.ts:11-14`
- **Description**: Public endpoint loads all columns including `compileCommand`, `runCommand`, `dockerfile` but only needs `id` and `language`. Wasted DB I/O on unauthenticated endpoint.
- **Fix**: Add explicit column selection `{ id, language, isEnabled }`.

### L3: `GET /api/v1/files/[id]` loads full file row before access check
- **Source**: cycle-12 F5
- **Files**: `src/app/api/v1/files/[id]/route.ts:71-75`
- **Description**: Uncolumned select loads all file columns before verifying the user is authorized. Defense-in-depth concern.
- **Fix**: Add explicit column selection or keep full select since most columns are needed for the response.

### L4: `GET /overrides` uses uncolumned select on `scoreOverrides`
- **Source**: cycle-12 F6
- **Files**: `src/app/api/v1/groups/[id]/assignments/[assignmentId]/overrides/route.ts:148`
- **Description**: Consistency issue — future columns would be silently exposed.
- **Fix**: Add explicit column selection.

### L5: Admin roles GET/PATCH/DELETE use uncolumned selects
- **Source**: cycle-12 F7
- **Files**: `src/app/api/v1/admin/roles/[id]/route.ts:20,47,105,122` and `src/app/api/v1/admin/roles/route.ts:127`
- **Description**: Admin-only endpoints use uncolumned selects. Consistency concern.
- **Fix**: Add explicit column selection.

---

## Previously Deferred Items (Still Active)

| ID | Finding | Severity | Status |
|----|---------|----------|--------|
| A19 | `new Date()` clock skew risk | LOW | Deferred — only affects distributed deployments with unsynchronized clocks |
| A7 | Dual encryption key management | MEDIUM | Deferred — consolidation requires migration |
| A12 | Inconsistent auth/authorization patterns | MEDIUM | Deferred — existing routes work correctly |
| A2 | Rate limit eviction could delete SSE slots | MEDIUM | Deferred — unlikely with heartbeat refresh |
| A17 | JWT contains excessive UI preference data | LOW | Deferred — requires session restructure |
| A25 | Timing-unsafe bcrypt fallback | LOW | Deferred — bcrypt-to-argon2 migration in progress |
| A26 | Polling-based backpressure wait | LOW | Deferred — no production reports |
