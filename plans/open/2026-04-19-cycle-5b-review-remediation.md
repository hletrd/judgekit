# Cycle 5b Review Remediation Plan

**Date:** 2026-04-19
**Source:** `.context/reviews/cycle-5b-comprehensive-review.md`, `.context/reviews/_aggregate.md`
**Status:** COMPLETE

## Deduplication note
Cycle 5 plan is COMPLETE. This plan covers findings that are genuinely NEW from the cycle 5b deep review.

---

## Implementation Stories

### LIKE-05: Fix unescaped LIKE search in admin files page

**Severity:** HIGH | **Confidence:** HIGH | **Effort:** Quick win

**Files:**
- `src/app/(dashboard)/dashboard/admin/files/page.tsx:88`

**Problem:** `searchQuery` is passed directly into `like()` without escaping `%`, `_`, or `\`. A user searching for `%` matches all files, and `_` matches any single character. This is the same class of vulnerability as the tags route bug fixed in cycle 5.

**Fix:**
1. Import `escapeLikePattern` from `@/lib/db/like`
2. Replace `like(files.originalName, \`%${searchQuery}%\`)` with `sql\`${files.originalName} LIKE ${\`%${escapeLikePattern(searchQuery)}%\`} ESCAPE '\\'\``

**Verification:** `npx tsc --noEmit`, `npx vitest run`

---

### SHUTDOWN-01: Remove duplicate graceful shutdown handlers from events.ts

**Severity:** HIGH | **Confidence:** HIGH | **Effort:** Quick win

**Files:**
- `src/lib/audit/events.ts:226-244` -- remove the duplicate `process.on` handlers and `handleGracefulShutdown` function

**Problem:** `events.ts` registers its own `process.on` handlers at module evaluation time (lines 238-244), AND `instrumentation.ts` also calls `registerAuditFlushOnShutdown()` from `node-shutdown.ts` which registers `process.once` handlers for the same signals. This causes double-flush and competing `process.exit()` calls on shutdown.

**Fix:**
1. Remove lines 226-244 from `events.ts` (the `handleGracefulShutdown` function and the three `process.on` registrations)
2. The `node-shutdown.ts` module registered via `instrumentation.ts` already handles this concern properly

**Verification:** `npx tsc --noEmit`, `npx vitest run`, manual verification that audit buffer still flushes on shutdown

---

### DATA-05: Restrict column selection in recruiting-token.ts user query

**Severity:** LOW | **Confidence:** HIGH | **Effort:** Quick win

**Files:**
- `src/lib/auth/recruiting-token.ts:28-30`

**Problem:** `db.query.users.findFirst` without column restriction loads `passwordHash` which is not needed in the recruiting token flow.

**Fix:**
Add `columns` restriction or use `safeUserSelect` from `@/lib/db/selects`:
```ts
const [user] = await db.select(safeUserSelect).from(users).where(eq(users.id, result.userId)).limit(1);
if (!user || !user.isActive) return null;
```
Note: The current code uses `db.query.users.findFirst` which returns the full row. Switching to `db.select` with `safeUserSelect` is the simplest approach, but need to verify the `safeUserSelect` columns are sufficient for the returned `AuthenticatedLoginUser` object. Check which fields are actually used from the returned user.

**Verification:** `npx tsc --noEmit`, `npx vitest run`

---

### LIKE-06: Consolidate remaining local escapeLike functions to shared utility

**Severity:** LOW | **Confidence:** HIGH | **Effort:** Moderate

**Files:**
- `src/app/(dashboard)/dashboard/problems/page.tsx:68-70` -- replace local `escapeLike()` with `escapeLikePattern` import
- `src/app/(public)/submissions/page.tsx:63` -- replace local `escapeLike()` with `escapeLikePattern` import
- `src/app/(dashboard)/dashboard/submissions/page.tsx:57` -- replace local `escapeLike()` with `escapeLikePattern` import
- `src/app/(dashboard)/dashboard/admin/submissions/page.tsx:105` -- replace local `escapeLike()` with `escapeLikePattern` import
- `src/app/api/v1/test/seed/route.ts:190` -- replace local `escapeLike()` with `escapeLikePattern` import

**Problem:** The cycle 5 review (ARCH-Q1) created `src/lib/db/like.ts` as a shared utility, but 5 files still have their own local `escapeLike()` functions instead of importing the shared one.

**Fix:**
1. For each file, import `escapeLikePattern` from `@/lib/db/like`
2. Remove the local `escapeLike()` function definition
3. Replace all `escapeLike(...)` calls with `escapeLikePattern(...)`

**Verification:** `npx tsc --noEmit`, `npx vitest run`

---

### LIKE-07: Migrate Drizzle `like()` calls to `sql` template with `ESCAPE '\\'` clause

**Severity:** LOW | **Confidence:** HIGH | **Effort:** Moderate

**Files:**
- `src/app/(dashboard)/dashboard/problems/page.tsx:172-173`
- `src/app/(public)/submissions/page.tsx:171-172`
- `src/app/(dashboard)/dashboard/submissions/page.tsx:84-85`
- `src/app/(dashboard)/dashboard/admin/submissions/page.tsx:111-112`
- `src/app/api/v1/admin/submissions/export/route.ts:65-66`
- `src/app/(public)/practice/page.tsx:162-163`

**Problem:** These files use the Drizzle ORM `like(column, pattern)` helper which generates `column LIKE pattern` without an `ESCAPE '\\'` clause. All API routes that were migrated use `sql\`... LIKE ... ESCAPE '\\'\`` for consistency.

**Fix:**
For each `like(column, \`%${escapeLikePattern(query)}%\`)` call, replace with:
```ts
sql\`${column} LIKE ${\`%${escapeLikePattern(query)}%\`} ESCAPE '\\'\`
```

**Verification:** `npx tsc --noEmit`, `npx vitest run`

---

## Deferred Items

These findings are explicitly deferred per the review. Each records the file+line citation, original severity/confidence, concrete reason, and exit criterion.

| ID | Finding | Severity | Confidence | Reason for deferral | Exit criterion |
|----|---------|----------|------------|---------------------|----------------|
| F6 | auth/config.ts login query fetches full user row | LOW | MEDIUM | Password hash IS needed for the auth flow; a two-phase query approach (auth-only columns first, then full profile on success) would add complexity for minimal gain. Failed logins already trigger a dummy hash compare which loads the same data. | Login performance becomes a measured bottleneck |
| Apr-19 C1 | Assistant roles can browse global user directory via `users.view` | MEDIUM | HIGH | Design decision pending -- may be intentional for the assistant workflow | Product decision on assistant user directory access |
| C6 (cycle 4) | Error boundary pages use `console.error` | LOW | HIGH | Client-side React convention. Adding server-side error reporting is a feature request. | Client-side error monitoring service is adopted |
| C7 (cycle 4) | `as never` type assertion in problem-submission-form.tsx | LOW | LOW | Dynamic translation keys are inherently hard to type statically without a complex discriminated union. | A type-safe translation key approach is adopted for the codebase |
| A2 (cycle 4) | Rate limit eviction could delete SSE connection slots | MEDIUM | HIGH | Heartbeat refreshes `lastAttempt` every 60s, making 24h eviction unlikely to affect active SSE slots. Architecturally fragile but not an active risk. | SSE connection tracking is moved to a separate table or `purpose` column |
| A7 (cycle 4) | Dual encryption key management systems | MEDIUM | HIGH | Operational concern; consolidation requires migration of existing encrypted data. | Encryption key rotation or migration tool is implemented |
| A12 (cycle 4) | Inconsistent auth/authorization patterns | MEDIUM | MEDIUM | Convention enforcement requires auditing all routes; existing routes work correctly. | All routes are migrated to `createApiHandler` |
| A17 (cycle 4) | JWT contains excessive UI preference data | LOW | MEDIUM | Would require session restructure and client-side changes. | JWT/session architecture is refactored |
| A19 (cycle 4) | `new Date()` clock skew risk | LOW | MEDIUM | Only affects distributed deployments with unsynchronized clocks. | Critical ordering uses PostgreSQL `now()` |
| A25 (cycle 4) | Timing-unsafe bcrypt fallback | LOW | MEDIUM | bcrypt-to-argon2 migration is in progress; timing difference shrinks as migration progresses. | bcrypt migration is complete |
| A26 (cycle 4) | Polling-based backpressure wait | LOW | LOW | Affects only very large exports; no production reports of issues. | Export streaming is refactored |

---

## Progress Ledger

| Story | Status | Commit |
|---|---|---|
| LIKE-05 | Done | `799c2090` |
| SHUTDOWN-01 | Done | `1c05cf26` |
| DATA-05 | Done | `dc319e32` |
| LIKE-06 | Done | `b45c7108` |
| LIKE-07 | Done | `b45c7108` |
