# Code Review — RPF Cycle 43

**Date:** 2026-04-23
**Reviewer:** code-reviewer
**Base commit:** b0d843e7

## Inventory of Files Reviewed

- `src/app/api/v1/contests/quick-create/route.ts` — Verified problemPoints refine (FIXED in cycle 42)
- `src/app/api/v1/contests/[assignmentId]/access-code/route.ts` — Verified capability auth (FIXED in cycle 42)
- `src/app/api/v1/contests/[assignmentId]/anti-cheat/route.ts` — Anti-cheat event logging + heartbeat
- `src/app/api/v1/contests/[assignmentId]/recruiting-invitations/route.ts` — Invitation CRUD
- `src/app/api/v1/contests/[assignmentId]/recruiting-invitations/bulk/route.ts` — Bulk invitation creation
- `src/app/api/v1/contests/join/route.ts` — Access code redemption
- `src/app/api/v1/community/threads/route.ts` — Thread creation
- `src/app/api/v1/community/threads/[id]/route.ts` — Thread moderation
- `src/app/api/v1/community/threads/[id]/posts/route.ts` — Post creation
- `src/app/api/v1/community/posts/[id]/route.ts` — Post deletion
- `src/app/api/v1/community/votes/route.ts` — Vote toggle
- `src/app/api/v1/submissions/route.ts` — Submission creation + listing
- `src/app/api/v1/submissions/[id]/rejudge/route.ts` — Rejudge
- `src/app/api/v1/judge/poll/route.ts` — Judge result reporting
- `src/app/api/v1/judge/claim/route.ts` — Judge claim
- `src/app/api/v1/compiler/run/route.ts` — Compiler run
- `src/app/api/v1/playground/run/route.ts` — Playground run
- `src/app/api/v1/admin/backup/route.ts` — Database backup
- `src/app/api/v1/admin/restore/route.ts` — Database restore
- `src/app/api/v1/admin/migrate/import/route.ts` — Database import
- `src/app/api/v1/admin/migrate/export/route.ts` — Database export
- `src/app/api/v1/admin/api-keys/route.ts` — API key management
- `src/app/api/v1/groups/[id]/members/[userId]/route.ts` — Member removal
- `src/app/api/v1/groups/[id]/assignments/[assignmentId]/route.ts` — Assignment PATCH (verified Date.now fix)
- `src/app/api/v1/users/[id]/route.ts` — User management
- `src/app/api/v1/files/[id]/route.ts` — File serving
- `src/app/api/v1/admin/submissions/export/route.ts` — Submission CSV export
- `src/lib/assignments/recruiting-invitations.ts` — Invitation library (verified userId fix)
- `src/lib/assignments/access-codes.ts` — Access code library
- `src/lib/compiler/execute.ts` — Compiler execution
- `src/lib/db/export.ts` — Database export engine
- `src/lib/api/handler.ts` — API handler factory

## Previously Fixed Items (Verified)

- problemPoints/refine validation: Fixed at line 21-24
- Access-code capability auth: Fixed at lines 9, 23, 37
- Redundant non-null assertion on userId: Fixed (local const capture)
- Date.now() replaced with getDbNowUncached() in assignment PATCH: Fixed at line 103
- Non-null assertions removed from anti-cheat: Fixed at lines 211-213

## New Findings

### CR-1: Submission rate-limit check uses `Date.now()` for `oneMinuteAgo` boundary inside DB transaction — clock-skew inconsistency [MEDIUM/MEDIUM]

**File:** `src/app/api/v1/submissions/route.ts:249`

**Description:** The submission creation route computes `oneMinuteAgo` using `new Date(Date.now() - 60_000)` inside a transaction, then passes this JS-computed timestamp as a parameter to compare against `submissions.submittedAt` (a DB-stored timestamp). The rest of the codebase has consistently moved to using DB server time (`getDbNowUncached()`) for schedule comparisons to avoid clock skew. While this is a rate-limit check (not a security boundary), if the app server clock is ahead of the DB server, users could be incorrectly rate-limited for submissions that are older in DB time. Conversely, if the app server clock is behind, users could submit more frequently than intended.

**Concrete failure scenario:** App server clock is 10 seconds ahead of DB server. A user submits at DB time 10:00:50. The `oneMinuteAgo` threshold is computed as 09:59:50 (app time). But in DB time, `submittedAt` values between 09:59:50 and 09:59:60 (DB time) would be counted as "recent" even though they are actually more than 60 seconds old in DB time. The user is incorrectly rate-limited.

**Fix:** Use `getDbNowUncached()` instead:
```typescript
const dbNow = await getDbNowUncached();
const oneMinuteAgo = new Date(dbNow.getTime() - 60_000);
```

**Confidence:** Medium — the impact is on rate-limit accuracy, not a security boundary. The advisory lock serializes concurrent submissions so the worst case is slightly inaccurate throttling.

---

### CR-2: `contest/join` route lacks `auth: true` — relies on default but inconsistent with similar routes [LOW/LOW]

**File:** `src/app/api/v1/contests/join/route.ts:9-11`

**Description:** The contest join route uses `createApiHandler({ rateLimit: ..., schema: ..., handler: ... })` without explicitly setting `auth: true`. The `createApiHandler` factory defaults `auth` to `true`, so this works correctly. However, most routes that require authentication explicitly set `auth: true` or `auth: { capabilities: [...] }` for clarity. The implicit default makes it harder to audit routes for auth coverage — a reader must know the factory's default behavior.

**Concrete failure scenario:** A future developer refactoring `createApiHandler` to change the default to `false` for safety (or reading the code without knowing the default) could introduce an auth bypass.

**Fix:** Add `auth: true` for explicit clarity:
```typescript
export const POST = createApiHandler({
  auth: true,
  rateLimit: "contest:join",
  ...
```

**Confidence:** Low — the current behavior is correct by default; this is a code-clarity concern.
