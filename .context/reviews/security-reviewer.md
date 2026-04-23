# Security Review — RPF Cycle 37

**Date:** 2026-04-23
**Reviewer:** security-reviewer
**Base commit:** 3d729cee

## Inventory of Files Reviewed

- All API routes (`src/app/api/v1/`)
- Security modules (`src/lib/security/`)
- Docker client (`src/lib/docker/client.ts`)
- Compiler execute (`src/lib/compiler/execute.ts`)
- Auth (`src/lib/auth/`)
- CSRF (`src/lib/security/csrf.ts`)
- Rate limiting (`src/lib/security/in-memory-rate-limit.ts`, `src/lib/security/rate-limit.ts`)
- File storage (`src/lib/files/storage.ts`)
- Sanitization (`src/lib/security/sanitize-html.ts`)
- DB import/restore routes (`src/app/api/v1/admin/migrate/import/route.ts`, `src/app/api/v1/admin/restore/route.ts`)
- Chat widget (`src/lib/plugins/chat-widget/`)
- Recruiting (`src/lib/assignments/recruiting-invitations.ts`)
- `src/components/seo/json-ld.tsx` — JSON-LD with safeJsonForScript
- `src/lib/realtime/realtime-coordination.ts` — SSE coordination

## Previously Fixed Items (Verified)

- AGG-1 (PATCH invitation NaN guard): Fixed
- AGG-2 (Password rehash consolidation): Fixed — `verifyAndRehashPassword` with audit logging
- AGG-3 (LIKE pattern escaping): Fixed — `escapeLikePattern(groupId)` used
- Docker client remote path error leak: Fixed — sanitized messages
- Compiler spawn error leak: Fixed — "Execution failed to start"
- Import JSON body deprecation: Fixed — Sunset header added (commit f7d9fdbf)

## New Findings

### SEC-1: quick-create route accepts Datetime strings without NaN guard — potential schedule bypass [MEDIUM/MEDIUM]

**File:** `src/app/api/v1/contests/quick-create/route.ts:31-34`

**Description:** The quick-create route constructs `new Date(body.startsAt)` and `new Date(body.deadline)` from client-provided strings validated only by Zod's `.datetime()` format. All other date-accepting routes in the codebase (recruiting invitations, API keys) now have `Number.isFinite()` defense-in-depth guards after Date construction. The quick-create route lacks this guard. If Zod validation is bypassed or the schema is loosened, NaN dates would cause `startsAt.getTime() >= deadline.getTime()` to evaluate to false, bypassing the schedule validation.

**Concrete failure scenario:** An attacker finds a way to pass a non-parseable date string that passes Zod but produces `Invalid Date` (e.g., edge cases in V8's Date parser). The contest is created with corrupted timestamps, potentially allowing submissions outside the intended time window.

**Fix:** Add NaN guards after Date construction, consistent with recruiting invitation routes:
```typescript
const startsAt = body.startsAt ? new Date(body.startsAt) : now;
if (!Number.isFinite(startsAt.getTime())) return apiError("invalidStartsAt", 400);
const deadline = body.deadline ? new Date(body.deadline) : new Date(now.getTime() + 30 * 24 * 3600000);
if (!Number.isFinite(deadline.getTime())) return apiError("invalidDeadline", 400);
```

**Confidence:** Medium

---

### SEC-2: SSE realtime-coordination LIKE queries missing ESCAPE clause — inconsistent defense-in-depth [LOW/LOW]

**File:** `src/lib/realtime/realtime-coordination.ts:94, 107`

**Description:** The `getSsePrefixPattern()` function returns `realtime:sse:user:%` used in LIKE queries without `ESCAPE '\\'`. While the prefix is server-controlled and contains no wildcards, this is inconsistent with every other LIKE query in the codebase which uses `ESCAPE '\\'`. The inconsistency could lead a developer to copy the pattern for a user-input query without the ESCAPE clause.

**Fix:** Add `ESCAPE '\\'` to both LIKE queries for consistency.

**Confidence:** Low
