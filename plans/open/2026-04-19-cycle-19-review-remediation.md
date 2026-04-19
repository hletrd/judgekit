# Cycle 19 Review Remediation Plan

**Date:** 2026-04-19
**Source:** `.context/reviews/_aggregate.md` (cycle 19 multi-agent review), code-reviewer, security-reviewer, perf-reviewer, architect, test-engineer, debugger, critic, verifier, designer
**Status:** IN PROGRESS

---

## MEDIUM Priority

### M1: Add `AsyncLocalStorage`-based request cache for `getRecruitingAccessContext` — fix N+1 in API routes

- **From:** AGG-1 (code-reviewer F1, perf-reviewer F1, architect F1, critic F1, verifier F1)
- **Files:** `src/lib/recruiting/access.ts:79-85`, `src/lib/auth/permissions.ts:22,115,158`
- **Status:** TODO
- **Plan:**
  1. Create a new module `src/lib/recruiting/request-cache.ts` that uses `AsyncLocalStorage` to store the `RecruitingAccessContext` for the current request
  2. In `getRecruitingAccessContext`: check `AsyncLocalStorage` first; if cached, return it; otherwise, compute, store, and return
  3. The `AsyncLocalStorage` store is initialized by Next.js middleware or a per-request wrapper
  4. Keep the React `cache()` wrapper for RSC renders (it's still useful there) but add the `AsyncLocalStorage` fallback for API routes
  5. Add a JSDoc comment documenting the dual caching strategy and its scope
  6. Verify that permission checks from API routes now hit the `AsyncLocalStorage` cache
- **Exit criterion:** `getRecruitingAccessContext` returns cached results in both RSC and API route contexts within a single request. No redundant DB queries for the same user's recruiting context within a request.

---

## LOW Priority

### L1: Add `needsRehash` handling to admin import and restore routes

- **From:** AGG-2 (code-reviewer F3, security-reviewer F1, architect F2, debugger F1, critic F2, verifier F2)
- **Files:** `src/app/api/v1/admin/migrate/import/route.ts:58,143`, `src/app/api/v1/admin/restore/route.ts:56`
- **Status:** TODO
- **Plan:**
  1. In `import/route.ts` form-data path (line 58): change `const { valid }` to `const { valid, needsRehash }`
  2. After the `if (!valid)` check, add the same rehash logic as in backup route (6 lines)
  3. In `import/route.ts` JSON path (line 143): same change
  4. In `restore/route.ts` (line 56): change `const { valid }` to `const { valid, needsRehash }`
  5. After the `if (!valid)` check, add the same rehash logic
  6. Verify all four admin data-management routes now handle `needsRehash` consistently
- **Exit criterion:** All four admin data-management routes (backup, restore, export, import) rehash bcrypt passwords to argon2id on successful verification.

### L2: Add warning log when `isTrustedServerActionOrigin` bypasses origin check in development

- **From:** AGG-4 (security-reviewer F3)
- **Files:** `src/lib/security/server-actions.ts:26-27,29-30`
- **Status:** TODO
- **Plan:**
  1. In both locations where `process.env.NODE_ENV !== "production"` is returned, add `logger.warn` noting that origin check is bypassed in development mode
  2. Include the actual origin value (or "missing") and the NODE_ENV value in the log context
  3. This alerts operators who accidentally run staging with `NODE_ENV=development`
- **Exit criterion:** `isTrustedServerActionOrigin` logs a warning when bypassing origin check in development mode.

### L3: Add unit tests for `withUpdatedAt`, `readStreamBytesWithLimit`, and admin `needsRehash` handling

- **From:** AGG-5 (test-engineer F1, F2, F3)
- **Files:** `src/lib/db/helpers.ts`, `src/lib/db/import-transfer.ts`, `src/app/api/v1/admin/backup/route.ts`
- **Status:** TODO
- **Plan:**
  1. Add unit tests for `withUpdatedAt()`:
     - Basic case: `updatedAt` is added to input
     - Input already has `updatedAt`: should be overwritten
     - Empty input object: only `updatedAt` is present
  2. Add unit tests for `readStreamBytesWithLimit`:
     - Normal read with multiple chunks
     - Byte-limit exceeded throws `fileTooLarge`
     - Empty stream returns empty `Uint8Array`
     - Multi-byte UTF-8 character split across chunk boundaries
  3. Add integration test outline for admin `needsRehash`:
     - Create user with bcrypt hash
     - Call backup endpoint with user's password
     - Verify user's hash is now argon2id
- **Exit criterion:** `withUpdatedAt` has 3+ unit tests. `readStreamBytesWithLimit` has 4+ unit tests. Admin `needsRehash` has integration test outline.

### L4: Move breadcrumb to top navbar area — Phase 3 workspace-to-public migration

- **From:** AGG-6 (architect F3, designer F3), workspace-to-public migration plan Phase 3
- **Files:** `src/app/(dashboard)/layout.tsx:100`, `src/components/layout/breadcrumb.tsx`, `src/components/layout/public-header.tsx`
- **Status:** TODO
- **Plan:**
  1. Move `<Breadcrumb>` from `<main>` in dashboard layout to the `SidebarInset` header area (above main content but below top navbar)
  2. Alternatively, pass breadcrumb as a prop/slot to `PublicHeader` when rendered in dashboard context
  3. Ensure breadcrumb remains sticky (visible while scrolling) by using a sticky header in `SidebarInset`
  4. Verify type check and lint pass
- **Exit criterion:** Breadcrumb is visible at the top of the content area, above the scrollable main content, and remains visible while scrolling.

### L5: Fix mobile menu focus restoration on route-change close

- **From:** AGG-7 (designer F1)
- **Files:** `src/components/layout/public-header.tsx:113-128`
- **Status:** TODO
- **Plan:**
  1. In the route-change effect (line 123-127), after `setMobileOpen(false)`, add focus restoration:
     ```ts
     requestAnimationFrame(() => toggleRef.current?.focus());
     ```
  2. This matches the pattern already used in `closeMobileMenu` (line 180)
  3. Verify keyboard navigation works correctly after route changes from the mobile menu
- **Exit criterion:** After closing the mobile menu via route change, focus is restored to the hamburger toggle button.

### L6: Replace `any` type in `users/route.ts` with proper type

- **From:** AGG-9 (code-reviewer F5)
- **Files:** `src/app/api/v1/users/route.ts:90-91`
- **Status:** TODO
- **Plan:**
  1. Remove `eslint-disable-next-line @typescript-eslint/no-explicit-any`
  2. Replace `let created: any` with a properly typed variable:
     ```ts
     let created: typeof safeUserSelect extends Record<string, infer V> ? Record<string, V> : never;
     ```
     Or more simply, use the inferred return type:
     ```ts
     type SafeUserRow = { [K in keyof typeof safeUserSelect]: InferSelectValueType<typeof safeUserSelect[K]> };
     let created: SafeUserRow | undefined;
     ```
  3. Verify type check passes
- **Exit criterion:** No `eslint-disable` for `no-explicit-any` in `users/route.ts`. The `created` variable has a proper type.

---

## Workspace-to-Public Migration Progress

- Phase 1: COMPLETE
- Phase 2: COMPLETE
- Phase 3: IN PROGRESS (this cycle: L4 — move breadcrumb to top navbar area)
- Phase 4: PENDING (deferred — route consolidation)

---

## Deferred Items

| Finding | Severity | Reason | Exit Criterion |
|---------|----------|--------|----------------|
| AGG-3 (`updateRecruitingInvitation` uses `Record<string, unknown>`) | LOW | Same as AGG-5(c18-prev) — JS `new Date()` clock skew concern is the primary issue; type safety improvement is low priority since the function is only called from one API route | Next time `recruiting-invitations.ts` is significantly modified |
| AGG-8 (`canAccessProblem` per-item checks not batched) | LOW | The batched `getAccessibleProblemIds` already exists; individual checks work correctly; performance impact is noticeable only for large lists (>50 items) | Re-open if list endpoints report performance issues under load |
