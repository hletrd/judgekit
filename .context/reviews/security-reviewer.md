# Security Review — RPF Cycle 43

**Date:** 2026-04-23
**Reviewer:** security-reviewer
**Base commit:** b0d843e7

## Inventory of Files Reviewed

- All API routes (`src/app/api/v1/`)
- Auth framework (`src/lib/api/handler.ts`, `src/lib/api/auth.ts`)
- Security modules (`src/lib/security/`)
- Recruiting invitations (`src/lib/assignments/recruiting-invitations.ts`)
- Access codes (`src/lib/assignments/access-codes.ts`)
- Compiler execution (`src/lib/compiler/execute.ts`)
- Database backup/restore/export/import
- Admin routes (backup, restore, migrate, api-keys)

## Previously Fixed Items (Verified)

- problemPoints/refine validation: Verified at line 21-24
- Access-code capability auth: Verified at lines 9, 23, 37
- Date.now() replaced with getDbNowUncached() in assignment PATCH: Verified at line 103
- LIKE pattern escaping: Verified — `escapeLikePattern` used consistently
- Password rehash consolidation: Verified
- Compiler spawn error leak: Verified — sanitized messages
- Import JSON body deprecation: Verified — Sunset header

## New Findings

### SEC-1: Submission rate-limit `oneMinuteAgo` uses app-server `Date.now()` in SQL comparison — clock-skew bypass potential [MEDIUM/MEDIUM]

**File:** `src/app/api/v1/submissions/route.ts:249`

**Description:** The submission creation route computes `oneMinuteAgo = new Date(Date.now() - 60_000)` using the app server's clock, then passes this value as a SQL parameter for `SUM(CASE WHEN submittedAt > ${oneMinuteAgo})`. The `submittedAt` column is stored using DB server time (via `getDbNowUncached()` at line 318). If the app server clock is behind the DB server clock, the `oneMinuteAgo` threshold will be too far in the past, allowing users to exceed the intended rate limit.

This is the same class of clock-skew issue that was identified and fixed in the assignment PATCH route (cycle 40) and recruiting invitation routes.

**Concrete failure scenario:** App server clock is 30 seconds behind DB server clock. The `oneMinuteAgo` window is effectively 90 seconds in DB time. A user can submit 50% more submissions per minute than intended.

**Fix:** Use `getDbNowUncached()` for the threshold computation:
```typescript
const dbNow = await getDbNowUncached();
const oneMinuteAgo = new Date(dbNow.getTime() - 60_000);
```

**Confidence:** Medium

---

### SEC-2: Anti-cheat heartbeat deduplication uses `Date.now()` instead of DB time — inconsistent with contest boundary checks [LOW/LOW]

**File:** `src/app/api/v1/contests/[assignmentId]/anti-cheat/route.ts:92-95`

**Description:** The non-shared heartbeat path uses `Date.now()` for the LRU cache deduplication check, while the contest start/end checks at lines 68-73 use DB time (`rawQueryOne("SELECT NOW()")`). The `Date.now()` here is used only for in-memory deduplication (prevent writing a heartbeat DB row more than once per 60 seconds), not for a security-critical comparison. The DB row's `createdAt` is correctly set using DB time (the `now` variable from line 67). This is a consistency concern rather than a security vulnerability.

**Concrete failure scenario:** If app server clock is 5 seconds behind DB, a heartbeat could be recorded slightly more frequently than every 60 seconds (up to 55s intervals), causing extra DB writes but no data corruption.

**Fix:** Low priority — the LRU cache is inherently approximate and the DB-stored timestamps are correct.

**Confidence:** Low
