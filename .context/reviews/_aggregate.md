# Aggregate Review — Cycle 11 Deep Code Review

**Date:** 2026-04-19
**Source reviews:**
- `cycle-11-comprehensive-review.md` (comprehensive multi-angle review covering code quality, security, performance, architecture, correctness, testing, and design)
- Prior cycles 1-10 reviews (findings already addressed or deferred in prior plan documents)

---

## CRITICAL (Immediate Action Required)

None.

---

## HIGH (Should Fix This Cycle)

None.

---

## MEDIUM (Should Fix Soon)

### M1: `api-key-auth.ts` loads full API key row including `encryptedKey` during authentication
- **Source**: cycle-11 F1
- **Files**: `src/lib/api/api-key-auth.ts:71-75`
- **Description**: `authenticateApiKey()` calls `db.select().from(apiKeys)` without column restriction. Loads all columns including `encryptedKey` on every API key authentication request. Only `id`, `role`, `createdById`, `expiresAt`, `isActive` are needed.
- **Fix**: Add explicit column selection.

### M2: Roles PATCH route uses hardcoded `role.name === "super_admin"` instead of `isSuperAdminRole()`
- **Source**: cycle-11 F4
- **Files**: `src/app/api/v1/admin/roles/[id]/route.ts:59`
- **Description**: Same class of bug fixed in cycle 3 AUTH-01 for other routes. Custom roles with super_admin-level privileges bypass this safety rail.
- **Fix**: Import and use `isSuperAdminRole()` from `@/lib/capabilities/cache`.

---

## LOW (Best Effort / Track)

### L1: Admin API keys GET loads `encryptedKey` just to derive a boolean
- **Source**: cycle-11 F2
- **Files**: `src/app/api/v1/admin/api-keys/route.ts:33,39-42`
- **Description**: Loads encrypted key data from DB for every API key row just to check if non-null. Should use SQL `IS NOT NULL` expression.
- **Fix**: Replace `encryptedKey: apiKeys.encryptedKey` with `hasEncryptedKey: sql<boolean>\`${apiKeys.encryptedKey} IS NOT NULL\``.

### L2: Docker image build route loads full `languageConfigs` row without column restriction
- **Source**: cycle-11 F3
- **Files**: `src/app/api/v1/admin/docker/images/build/route.ts:25`
- **Description**: Only needs `dockerImage` column. Loads full row including compile/run commands.
- **Fix**: Add explicit column selection `{ dockerImage: languageConfigs.dockerImage }`.

### L3: Roles PATCH route duplicates `ROLE_LEVELS` map with inconsistent values
- **Source**: cycle-11 F5
- **Files**: `src/app/api/v1/admin/roles/[id]/route.ts:70`
- **Description**: Local `ROLE_LEVELS` map has different values than canonical `ROLE_LEVEL` in constants.ts. Also doesn't support custom roles.
- **Fix**: Replace with `getRoleLevel()` from `@/lib/capabilities/cache`.

### L4: `canManageRole`/`canManageRoleAsync` use hardcoded `=== "super_admin"` string comparison
- **Source**: cycle-11 F6
- **Files**: `src/lib/security/constants.ts:78,87`
- **Description**: Should use `isSuperAdminRole()` for consistency with cycle 3 AUTH-01 fix.
- **Fix**: Replace `requestedRole === "super_admin"` with `isSuperAdminRole(requestedRole)`.

### L5: `system-settings-config.ts` uses `select()` without column restriction
- **Source**: cycle-11 F7
- **Files**: `src/lib/system-settings-config.ts:109-113`
- **Description**: Loads all columns from `systemSettings` table. Minor concern if table has non-settings columns.
- **Fix**: Verify if all columns are settings keys; if not, add column selection.

### L6: `exam-sessions.ts` uses `new Date()` for deadline comparison inside transaction
- **Source**: cycle-11 F8
- **Files**: `src/lib/assignments/exam-sessions.ts:49-57`
- **Description**: Same class of clock-skew concern as deferred item A19.
- **Fix**: Already tracked as deferred A19.

---

## Previously Deferred Items (Still Active)

These remain from prior cycles and are not re-lifted:

| ID | Finding | Severity | Status |
|----|---------|----------|--------|
| A19 | `new Date()` clock skew risk | LOW | Deferred — only affects distributed deployments with unsynchronized clocks |
| A7 | Dual encryption key management | MEDIUM | Deferred — consolidation requires migration |
| A12 | Inconsistent auth/authorization patterns | MEDIUM | Deferred — existing routes work correctly |
| A2 | Rate limit eviction could delete SSE slots | MEDIUM | Deferred — unlikely with heartbeat refresh |
| A17 | JWT contains excessive UI preference data | LOW | Deferred — requires session restructure |
| A25 | Timing-unsafe bcrypt fallback | LOW | Deferred — bcrypt-to-argon2 migration in progress |
| A26 | Polling-based backpressure wait | LOW | Deferred — no production reports |
