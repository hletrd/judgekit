# Security Review — RPF Cycle 40

**Date:** 2026-04-23
**Reviewer:** security-reviewer
**Base commit:** f030233a

## Inventory of Files Reviewed

- All API routes (`src/app/api/v1/`)
- Security modules (`src/lib/security/`)
- Auth (`src/lib/auth/`)
- File storage (`src/lib/files/storage.ts`)
- HTML sanitization (`src/lib/security/sanitize-html.ts`)
- JSON-LD sanitization (`src/components/seo/json-ld.tsx`)
- Compiler execution (`src/lib/compiler/execute.ts`)
- Recruiting invitations (`src/lib/assignments/recruiting-invitations.ts`)
- Anti-cheat route (`src/app/api/v1/contests/[assignmentId]/anti-cheat/route.ts`)
- Assignment PATCH route (`src/app/api/v1/groups/[id]/assignments/[assignmentId]/route.ts`)
- User management (`src/app/api/v1/users/[id]/route.ts`)
- Contest invite (`src/app/api/v1/contests/[assignmentId]/invite/route.ts`)

## Previously Fixed Items (Verified)

- Quick-create NaN guard: Verified at lines 36-44
- Bulk invitation MAX_EXPIRY_MS guard: Verified at lines 67-69
- Un-revoke transition removed: Verified at lines 96-102
- Password rehash consolidation: Verified — `verifyAndRehashPassword` with audit logging
- Docker client remote path error leak: Verified — sanitized messages
- Compiler spawn error leak: Verified — "Execution failed to start"
- Import JSON body deprecation: Verified — Sunset header
- LIKE pattern escaping: Verified — `escapeLikePattern` and ESCAPE clauses used consistently

## New Findings

### SEC-1: Assignment PATCH uses `Date.now()` instead of DB time for active-contest check — clock-skew bypass risk [MEDIUM/MEDIUM]

**File:** `src/app/api/v1/groups/[id]/assignments/[assignmentId]/route.ts:99-101`

**Description:** The assignment PATCH route blocks problem changes during active exam-mode contests. The check at line 99 uses `Date.now()` (app server time) to compare against `assignment.startsAt` (DB time). If the app server clock lags behind the DB server clock, an instructor could bypass the "active contest" protection and modify problems after the contest has already started in DB time.

This is the same class of clock-skew vulnerability that was identified and fixed in the recruiting invitation routes (where `getDbNowUncached()` was adopted as the standard) and the submission route (where exam deadline enforcement uses `NOW()` in SQL).

**Concrete failure scenario:** App server clock is 2 minutes behind DB server clock. Exam starts at 10:00 DB time. At 10:01 DB time (9:59 app time), an attacker with instructor credentials sends a PATCH request to change problems. The `Date.now()` check returns 9:59, which is < 10:00, so the block is bypassed. The attacker modifies problems in an active exam, potentially giving advantages to specific students.

**Fix:** Use `getDbNowUncached()` instead of `Date.now()`:
```typescript
const now = await getDbNowUncached();
const startsAt = assignment.startsAt ? new Date(assignment.startsAt).getTime() : null;
if (startsAt && now.getTime() >= startsAt) {
```

**Confidence:** Medium
