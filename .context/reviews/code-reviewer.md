# Code Review — RPF Cycle 40

**Date:** 2026-04-23
**Reviewer:** code-reviewer
**Base commit:** f030233a

## Inventory of Files Reviewed

- `src/app/api/v1/contests/quick-create/route.ts` — Verified NaN guard (FIXED in cycle 39)
- `src/app/api/v1/contests/[assignmentId]/recruiting-invitations/bulk/route.ts` — Verified MAX_EXPIRY_MS guard (FIXED in cycle 39)
- `src/app/api/v1/contests/[assignmentId]/recruiting-invitations/[invitationId]/route.ts` — Verified un-revoke fix (FIXED in cycle 39)
- `src/app/api/v1/groups/[id]/assignments/[assignmentId]/exam-session/route.ts` — Verified exam mode short-circuit (FIXED in cycle 39)
- `src/app/api/v1/groups/[id]/assignments/[assignmentId]/route.ts` — Assignment PATCH route
- `src/app/api/v1/submissions/route.ts` — Submission creation route
- `src/app/api/v1/contests/[assignmentId]/anti-cheat/route.ts` — Anti-cheat event logging
- `src/app/api/v1/contests/[assignmentId]/invite/route.ts` — Contest invite route
- `src/app/api/v1/groups/[id]/members/bulk/route.ts` — Bulk enrollment
- `src/app/api/v1/users/[id]/route.ts` — User management
- `src/app/api/v1/files/[id]/route.ts` — File serving
- `src/app/api/v1/admin/audit-logs/route.ts` — Audit logs
- `src/app/api/v1/admin/login-logs/route.ts` — Login logs
- `src/app/api/v1/admin/submissions/export/route.ts` — Submission export
- `src/lib/assignments/recruiting-invitations.ts` — Recruiting invitations library
- `src/lib/files/storage.ts` — File storage
- `src/lib/security/sanitize-html.ts` — HTML sanitization
- `src/lib/compiler/execute.ts` — Compiler execution
- `src/components/seo/json-ld.tsx` — JSON-LD with safeJsonForScript
- `src/app/(dashboard)/dashboard/admin/api-keys/api-keys-client.tsx` — API key dialog

## Previously Fixed Items (Verified)

- Quick-create route NaN guard: Fixed at lines 36-44
- Bulk invitation MAX_EXPIRY_MS guard: Fixed at lines 67-69
- Un-revoke transition removed: Fixed at lines 96-102
- Exam session short-circuit for non-exam: Fixed at line 29
- API key auto-dismiss countdown: Fixed at lines 115-137

## New Findings

### CR-1: Assignment PATCH route uses `Date.now()` for active-contest check — clock-skew risk [MEDIUM/MEDIUM]

**File:** `src/app/api/v1/groups/[id]/assignments/[assignmentId]/route.ts:99-101`

**Description:** The assignment PATCH route blocks problem changes during active exam-mode contests. At line 99, it uses `Date.now()` (app server local time) to check if `now >= startsAt`. However, `assignment.startsAt` comes from the database, and the rest of the codebase consistently uses DB server time (`getDbNowUncached()`) for schedule comparisons to avoid clock skew between the app server and DB server.

If the app server clock is behind the DB server clock, `Date.now()` could return a time before `startsAt` even though the contest has already started in DB time. An instructor could then modify problems during an active contest.

Conversely, if the app server clock is ahead, the check could block legitimate pre-contest edits.

**Concrete failure scenario:** The app server's system clock is 2 minutes behind the DB server. An exam starts at 10:00 DB time. At 10:01 DB time (9:59 app time), an instructor sends a PATCH to change problems. The `Date.now()` check returns 9:59, which is < 10:00, so the block is bypassed. The instructor modifies problems in an active exam.

**Fix:** Replace `Date.now()` with `getDbNowUncached()`:
```typescript
const now = await getDbNowUncached();
const startsAt = assignment.startsAt ? new Date(assignment.startsAt).getTime() : null;
if (startsAt && now.getTime() >= startsAt) {
  return { error: apiError("contestProblemsLockedDuringActive", 409) };
}
```

**Confidence:** Medium

---

### CR-2: Anti-cheat heartbeat gap detection uses non-null assertion on nullable `createdAt` [LOW/LOW]

**File:** `src/app/api/v1/contests/[assignmentId]/anti-cheat/route.ts:211-213`

**Description:** The heartbeat gap detection loop accesses `heartbeats[i - 1].createdAt!` and `heartbeats[i].createdAt!` with non-null assertions, but the Drizzle query selects `antiCheatEvents.createdAt` which could be nullable in the schema. The `!` operator bypasses TypeScript's null safety. If a heartbeat row has a NULL `createdAt` (due to a DB migration or data corruption), the `new Date(null!)` call would produce `Invalid Date` and `getTime()` would return NaN, making `prev` or `curr` NaN. The `gap > GAP_THRESHOLD_MS` comparison with NaN evaluates to false, so the gap would be silently skipped rather than causing an error.

**Concrete failure scenario:** A DB migration temporarily allows NULL `createdAt` values. A heartbeat row with NULL `createdAt` is included in the result set. The non-null assertion doesn't throw at runtime, but the gap detection silently fails for that entry and the next one.

**Fix:** Add a null guard before the comparison:
```typescript
if (!heartbeats[i - 1].createdAt || !heartbeats[i].createdAt) continue;
const prev = new Date(heartbeats[i - 1].createdAt).getTime();
const curr = new Date(heartbeats[i].createdAt).getTime();
```
This replaces the existing `continue` on line 211 (which already guards against null, but the non-null assertion on lines 212-213 is misleading).

**Confidence:** Low (existing code already has a `continue` guard on line 211, but the `!` assertions on lines 212-213 are unnecessary and misleading)
