# Cycle 19 Aggregate Review

**Date:** 2026-04-19
**Aggregated from:** code-reviewer, security-reviewer, perf-reviewer, architect, test-engineer, debugger, critic, verifier, designer
**Base commit:** 301afe7f

---

## Deduped Findings

### AGG-1 — [MEDIUM] React `cache()` does not deduplicate `getRecruitingAccessContext` in API routes — N+1 DB queries persist for permission checks

- **Severity:** MEDIUM (performance + architecture)
- **Confidence:** HIGH
- **Cross-agent agreement:** code-reviewer F1, perf-reviewer F1, architect F1, critic F1, verifier F1
- **Files:** `src/lib/recruiting/access.ts:79-85`, `src/lib/auth/permissions.ts:22,115,158`
- **Evidence:** `getRecruitingAccessContext` is wrapped with React `cache()`, which only deduplicates within a single RSC render. When called from API route handlers (which are not RSCs), the cache is not in scope, so every call hits the database. The permission functions `canAccessGroup`, `canAccessProblem`, and `getAccessibleProblemIds` all independently call `getRecruitingAccessContext`. For API routes that check permissions per-item, this results in 2+ redundant DB queries per check.
- **Failure scenario:** An instructor requests the submissions list API. The handler calls `canAccessSubmission` for each submission row. For 20 submissions, that's 40 redundant DB queries for recruiting context data that's identical across all checks.
- **Suggested fix:** Implement a per-request cache via `AsyncLocalStorage` that works in both RSC and API route contexts. Document the limitation of React `cache()` for non-RSC callers. Alternatively, pass the recruiting context explicitly through the permission check chain.

### AGG-2 — [LOW] Admin import and restore routes still discard `needsRehash` — inconsistent with backup/export routes

- **Severity:** LOW (security — bcrypt-to-argon2 migration stalls for rare admin profiles)
- **Confidence:** HIGH
- **Cross-agent agreement:** code-reviewer F3, security-reviewer F1, architect F2, debugger F1, critic F2, verifier F2
- **Files:** `src/app/api/v1/admin/migrate/import/route.ts:58,143`, `src/app/api/v1/admin/restore/route.ts:56`
- **Evidence:** The backup and export routes were fixed for `needsRehash` in cycle 18b, but the import route (both form-data and JSON paths) and the restore route still destructure only `{ valid }` from `verifyPassword()`. This inconsistency is exactly the divergence risk that the DRY concern was raising.
- **Failure scenario:** An admin with a bcrypt hash who only authenticates via the import or restore route never has their hash upgraded to argon2id. The inconsistent coverage creates a false sense of security.
- **Suggested fix:** Add `needsRehash` handling to both paths in the import route and the restore route, matching the 6-line pattern used in backup and export routes.

### AGG-3 — [LOW] `updateRecruitingInvitation` uses `Record<string, unknown>` — loses type safety

- **Severity:** LOW (maintainability — potential for silent runtime errors)
- **Confidence:** MEDIUM
- **Cross-agent agreement:** code-reviewer F2, debugger F2
- **Files:** `src/lib/assignments/recruiting-invitations.ts:193`
- **Evidence:** The function builds updates as `Record<string, unknown>`, bypassing Drizzle's type checking. Other update functions in the codebase use `withUpdatedAt()` which preserves type safety.
- **Failure scenario:** A developer adds a new field to the update data but misspells the column name. The update silently sets the wrong key, and the actual column is not updated. Drizzle's error message is opaque for dynamically constructed keys.
- **Suggested fix:** Use `Partial<typeof recruitingInvitations.$inferInsert>` or the `withUpdatedAt()` pattern for the updates object.

### AGG-4 — [LOW] `isTrustedServerActionOrigin` falls back to `NODE_ENV !== "production"` when Origin is missing — allows untrusted origins in misconfigured environments

- **Severity:** LOW (security — defense-in-depth gap for misconfigured staging environments)
- **Confidence:** HIGH
- **Cross-agent agreement:** security-reviewer F3
- **Files:** `src/lib/security/server-actions.ts:26-27,29-30`
- **Evidence:** When the `Origin` header is missing, the function returns `true` in development mode. If a developer accidentally sets `NODE_ENV=development` in a staging or test environment for verbose logging, all server action origin checks are bypassed.
- **Failure scenario:** A staging server is deployed with `NODE_ENV=development` for verbose logging. An attacker crafts a CSRF page that triggers server actions. Since `NODE_ENV=development`, the origin check passes regardless of the actual origin.
- **Suggested fix:** Add a warning log when the origin check is bypassed in development mode. Consider using a separate flag (e.g., `SKIP_ORIGIN_CHECK`) instead of relying solely on `NODE_ENV`.

### AGG-5 — [LOW] No tests for `withUpdatedAt()` helper, `readStreamBytesWithLimit`, and admin route `needsRehash` handling

- **Severity:** LOW (test coverage — untested security-critical and performance-critical paths)
- **Confidence:** HIGH
- **Cross-agent agreement:** test-engineer F1, F2, F3
- **Files:** `src/lib/db/helpers.ts:11-15`, `src/lib/db/import-transfer.ts:14-40`, `src/app/api/v1/admin/backup/route.ts:71-80`
- **Evidence:** Three critical functions have no test coverage: (1) `withUpdatedAt()` is used across ~15 call sites but has no unit tests, (2) `readStreamBytesWithLimit` was rewritten for OOM prevention but has no tests for edge cases (multi-byte boundaries, exact limit match), (3) `needsRehash` handling in admin backup/export routes has no integration tests.
- **Failure scenario:** A regression in `readStreamBytesWithLimit` corrupts multi-byte characters at chunk boundaries. No test catches this because the function was refactored without tests. Production imports fail with JSON parse errors for Korean-language content.
- **Suggested fix:** Add unit tests for `withUpdatedAt()` (3 cases), `readStreamBytesWithLimit` (4 cases including multi-byte boundaries), and integration tests for admin route `needsRehash` handling (2 cases: bcrypt user -> backup -> verify argon2id hash).

### AGG-6 — [LOW] Breadcrumb is in main content area instead of top navbar — navigation inconsistency per migration plan

- **Severity:** LOW (UX — navigation pattern inconsistency)
- **Confidence:** HIGH
- **Cross-agent agreement:** architect F3, designer F3
- **Files:** `src/app/(dashboard)/layout.tsx:100`
- **Evidence:** The breadcrumb is rendered inside `<main>` as `<Breadcrumb className="mb-4" />`. Per the workspace-to-public migration plan Phase 3, it should be moved to the top navbar area. Current placement means the breadcrumb is not visible when content is scrolled down.
- **Failure scenario:** A user scrolls down in a long student submission page. The breadcrumb is no longer visible. The user has to scroll back to the top to see where they are in the navigation hierarchy.
- **Suggested fix:** Move the breadcrumb into the `SidebarInset` header area or the `PublicHeader` component so it remains visible while scrolling.

### AGG-7 — [LOW] Mobile menu focus not restored on route-change close — keyboard accessibility gap

- **Severity:** LOW (accessibility — WCAG 2.2 SC 2.4.3 focus order)
- **Confidence:** MEDIUM
- **Cross-agent agreement:** designer F1
- **Files:** `src/components/layout/public-header.tsx:113-128`
- **Evidence:** When the mobile menu closes due to a route change (line 113-128), focus is not explicitly restored to the toggle button. The `closeMobileMenu` function (line 177-181) does restore focus, but it's not called from the route-change effect.
- **Failure scenario:** A keyboard user opens the mobile menu, navigates to a link, and presses Enter. The route changes, the menu closes, but focus is not restored to the toggle button. The user must Tab through the entire page to find their place.
- **Suggested fix:** In the route-change effect, after closing the menu, also restore focus to `toggleRef.current` using the same `requestAnimationFrame` pattern as `closeMobileMenu`.

### AGG-8 — [LOW] `canAccessProblem` per-item permission checks are not batched for API list endpoints — redundant DB round-trips

- **Severity:** LOW (performance — O(N) DB round-trips for N items)
- **Confidence:** MEDIUM
- **Cross-agent agreement:** security-reviewer F2, perf-reviewer F3
- **Files:** `src/lib/auth/permissions.ts:107-145`
- **Evidence:** `canAccessProblem` performs multiple sequential DB queries per problem. The batched alternative `getAccessibleProblemIds` (line 147) exists but is not used by all API routes. For list endpoints, calling `canAccessProblem` N times results in O(N) sequential DB round-trips.
- **Failure scenario:** The practice problems page loads 50 problems. For each problem, `canAccessProblem` is called, resulting in ~100 DB round-trips. The batched `getAccessibleProblemIds` would do it in ~3 queries.
- **Suggested fix:** Ensure all list endpoints use `getAccessibleProblemIds` instead of per-item `canAccessProblem` checks.

### AGG-9 — [LOW] `eslint-disable` for `no-explicit-any` in `users/route.ts` — should use proper type

- **Severity:** LOW (code quality — type safety bypass)
- **Confidence:** HIGH
- **Cross-agent agreement:** code-reviewer F5
- **Files:** `src/app/api/v1/users/route.ts:90-91`
- **Evidence:** The `let created: any` variable uses `eslint-disable-next-line @typescript-eslint/no-explicit-any` to suppress the type error. The proper type is available from `safeUserSelect` return type.
- **Failure scenario:** A developer accesses a property on `created` that doesn't exist in the actual return type. No compile-time error is raised because the type is `any`.
- **Suggested fix:** Replace `let created: any` with a properly typed variable using the return type of `safeUserSelect`.

---

## Previously Deferred Items (Carried Forward)

| ID | Finding | Severity | Status |
|----|---------|----------|--------|
| A7 | Dual encryption key management | MEDIUM | Deferred — consolidation requires migration |
| A12 | Inconsistent auth/authorization patterns | MEDIUM | Deferred — existing routes work correctly |
| A2 | Rate limit eviction could delete SSE slots | MEDIUM | Deferred — unlikely with heartbeat refresh |
| A17 | JWT contains excessive UI preference data | LOW | Deferred — requires session restructure |
| A25 | Timing-unsafe bcrypt fallback | LOW | Deferred — bcrypt-to-argon2 migration in progress |
| A26 | Polling-based backpressure wait | LOW | Deferred — no production reports |
| L2(c13) | Anti-cheat LRU cache single-instance limitation | LOW | Deferred — already guarded by getUnsupportedRealtimeGuard |
| L5(c13) | Bulk create elevated roles warning | LOW | Deferred — server validates role assignments |
| D16 | `sanitizeSubmissionForViewer` unexpected DB query | LOW | Deferred — only called from one place, no N+1 risk |
| D17 | Exam session `new Date()` clock skew | LOW | Deferred — same as A19 |
| D18 | Contest replay top-10 limit | LOW | Deferred — likely intentional, requires design input |
| L6(c16) | `sanitizeSubmissionForViewer` N+1 risk for list endpoints | LOW | Deferred — re-open if added to list endpoints |
| AGG-7(c18-prev) | IOI tie sort non-deterministic within tied entries | LOW | Deferred — tied entries get same rank per IOI convention |
| AGG-8(c18-prev) | ROUND(score,2)=100 may miss edge-case ACs | LOW | Deferred — PostgreSQL ROUND is exact for decimal values |
| AGG-4(c18) | Admin route DRY violation | LOW | Deferred — all routes work correctly |
| AGG-5(c18) | updateRecruitingInvitation uses JS new Date() | LOW | Deferred — only affects distributed deployments |
| AGG-7(c18) | contest-analytics progression raw scores | LOW | Deferred — already documented in code comments |
| AGG-4(c18b) | Admin route DRY violation (same as AGG-4(c18)) | LOW | Deferred — next time admin routes are modified |

## Agent Failures

None — all review angles completed successfully.
