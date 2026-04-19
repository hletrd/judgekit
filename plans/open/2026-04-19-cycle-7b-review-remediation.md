# Cycle 7b Review Remediation Plan

**Date:** 2026-04-19
**Status:** IN PROGRESS
**Source:** `cycle-7b-comprehensive-review.md`, `cycle-7b-aggregate.md`

---

## Schedule (this cycle)

### S1 — [MEDIUM] Add `encryptedKey` to `ALWAYS_REDACT` in database export
- **From:** AGG-7 (F12)
- **File:** `src/lib/db/export.ts:249-251`
- **Fix:** Add `encryptedKey` to the `apiKeys` entry in `ALWAYS_REDACT`
- **Status:** DONE (commit 0b359a0c)

### S2 — [LOW] Unify exponential backoff formula in rate-limit module
- **From:** AGG-10 (F11)
- **File:** `src/lib/security/rate-limit.ts:153,193`
- **Fix:** Extract shared `calculateBlockDuration(consecutiveBlocks, blockMs)` helper, use in both `consumeRateLimitAttemptMulti` and `recordRateLimitFailure`
- **Status:** DONE (commit 656ef02a)

### S3 — [LOW] Fix rate-limit eviction timer `unref()` to always apply
- **From:** AGG-11 (F18)
- **File:** `src/lib/security/rate-limit.ts:45-51`
- **Fix:** Always call `evictionTimer.unref()` after `setInterval`, matching `events.ts` pattern
- **Status:** DONE (commit 656ef02a)

### S4 — [LOW] Change compiler execute log level from INFO to DEBUG
- **From:** AGG-14 (F17)
- **File:** `src/lib/compiler/execute.ts:372`
- **Fix:** Change `logger.info` to `logger.debug`
- **Status:** DONE (commit 89e70897)

### S5 — [LOW] Add `Cache-Control: no-store` to `createApiHandler` responses
- **From:** AGG-15 (F10)
- **File:** `src/lib/api/handler.ts`
- **Fix:** Add `Cache-Control: no-store` header to the response before returning from `createApiHandler`
- **Status:** DONE (commit 57f5dea8)

### S6 — [LOW] Fix `syncTokenWithUser` missing fields in `createSuccessfulLoginResponse`
- **From:** AGG-12 (F14)
- **File:** `src/lib/auth/config.ts:42-66`
- **Fix:** Add `shareAcceptedSolutions` and `acceptedSolutionsAnonymous` to `AuthenticatedLoginUser` type and `createSuccessfulLoginResponse` return
- **Status:** DONE (commit 074631c7)

### S7 — [LOW] Add audit logging for API key creation/deletion
- **From:** AGG-13 (F16)
- **File:** `src/app/api/v1/admin/api-keys/route.ts`, `src/app/api/v1/admin/api-keys/[id]/route.ts`
- **Fix:** Add `recordAuditEvent` calls to POST and DELETE handlers
- **Status:** N/A — already has audit logging (POST: api_key.created, DELETE: api_key.deleted, PATCH: api_key.updated)

### S8 — [LOW] PublicHeader `loggedInUser.role` typed as `string` instead of `UserRole`
- **From:** AGG-1 (F1)
- **File:** `src/components/layout/public-header.tsx:40`
- **Fix:** Added JSDoc documenting that role may be custom role string; keeping `string` type since NextAuth session declares role as `string`
- **Status:** DONE (commit f4708a1c)

### S9 — [LOW] Collapse dual-query pagination in groups/assignments route
- **From:** AGG-4 (F4)
- **File:** `src/app/api/v1/groups/[id]/assignments/route.ts:45-67`
- **Fix:** Use `count(*) over()` instead of separate count + data queries
- **Status:** DEFERRED — route uses Drizzle `findMany` with `with` relations; converting to `select`+`leftJoin` with `count(*) over()` is a non-trivial refactor that risks breaking the relation shape. Low priority.

### S10 — [LOW] Add `Cache-Control: no-store` to proxy middleware for API routes
- **From:** AGG-15 companion
- **File:** `src/proxy.ts`
- **Fix:** Add `Cache-Control: no-store` header for `/api/v1/` routes in the proxy middleware
- **Status:** DONE (commit 57f5dea8)

---

## Deferred (not this cycle)

### D1 — [MEDIUM] SSE submission events route capability check incomplete
- **From:** AGG-5 (F5)
- **File:** `src/app/api/v1/submissions/[id]/events/route.ts`
- **Reason:** Requires understanding the full SSE auth flow and testing with custom roles. Needs careful validation to avoid breaking SSE connections.
- **Exit criterion:** Custom role test coverage in place; SSE route tests available

### D2 — [MEDIUM] Compiler workspace directory mode 0o770
- **From:** AGG-6 (F7)
- **File:** `src/lib/compiler/execute.ts:635`
- **Reason:** Affects Docker-in-Docker deployment only. Current deployment uses root user in Docker which makes 0o770 work via "other" permissions. Needs testing on actual deployment environment.
- **Exit criterion:** Deployed on non-root Docker setup; workspace access confirmed

### D3 — [MEDIUM] JWT callback DB query on every request
- **From:** AGG-9 (F20)
- **File:** `src/lib/auth/config.ts:354-405`
- **Reason:** Caching the JWT callback requires careful invalidation (password change, role change, deactivation). The existing `authenticatedAt`-based invalidation in proxy.ts is sufficient for security but doesn't help with the performance issue. A proper solution needs a shared cache between proxy and JWT callback.
- **Exit criterion:** Performance profiling shows JWT callback as a bottleneck; shared cache design approved

### D4 — [MEDIUM] Test coverage gaps for workspace-to-public migration Phase 2
- **From:** AGG-8 (F15)
- **Reason:** Requires setting up component test infrastructure for PublicHeader. This is a larger effort that should be done as part of Phase 3 (dashboard layout refinement) since the header will change again.
- **Exit criterion:** Phase 3 header changes finalized; component test harness ready

### D5 — [LOW] Backup/restore/migrate routes use manual auth pattern
- **From:** AGG-2 (F2)
- **Reason:** Migrate routes can be converted but backup/restore have legitimate streaming/password-reauth reasons. Low risk since they already have all security checks.
- **Exit criterion:** `createApiHandler` gains streaming response support

### D6 — [LOW] Files/[id] DELETE/PATCH manual auth
- **From:** AGG-3 (F3)
- **Reason:** Low priority consistency fix. The manual auth is correct, just not DRY.
- **Exit criterion:** Next time these routes are touched for other reasons

### D7 — [LOW] SSE re-auth rate limiting
- **From:** AGG-16 (F9)
- **Reason:** The re-auth endpoint requires the user's current session password, which limits brute-force risk. Adding rate limiting is a hardening measure.
- **Exit criterion:** Rate-limit infrastructure supports per-user key on SSE routes

### D8 — [LOW] PublicHeader click-outside-to-close
- **From:** AGG-17 (F13)
- **Reason:** UX enhancement, not a bug. The Escape key handler provides an accessible close mechanism.
- **Exit criterion:** UX review of mobile menu behavior

### D9 — [LOW] `namedToPositional` regex alignment
- **From:** AGG-18 (F19)
- **Reason:** No actual vulnerability; the validation regex catches the edge case. Defense-in-depth improvement only.
- **Exit criterion:** Next time the file is touched

---

## Workspace-to-public migration Phase 3 progress

Phase 3 (Dashboard layout refinement) is still PENDING. Key tasks:
1. Convert `AppSidebar` from full sidebar to slimmer icon rail or contextual sub-nav
2. Move breadcrumb to top navbar area
3. Ensure top navbar is visible on dashboard pages
4. Evaluate `(control)` route group merge

These tasks are deferred pending design review and will be addressed in a future cycle.
