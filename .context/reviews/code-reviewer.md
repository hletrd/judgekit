# Code Review — RPF Cycle 37

**Date:** 2026-04-23
**Reviewer:** code-reviewer
**Base commit:** 3d729cee

## Inventory of Files Reviewed

- `src/lib/plugins/chat-widget/chat-widget.tsx` — Chat widget (verified prior fixes)
- `src/lib/db/import.ts` — Import engine (verified TABLE_MAP derivation)
- `src/lib/db/export.ts` — Export engine
- `src/lib/security/password-hash.ts` — Password hash utilities (verified rehash consolidation)
- `src/app/api/v1/contests/[assignmentId]/recruiting-invitations/` — All invitation routes
- `src/app/api/v1/submissions/[id]/events/route.ts` — SSE route
- `src/lib/realtime/realtime-coordination.ts` — Realtime coordination
- `src/lib/db/like.ts` — LIKE pattern escaping
- `src/app/api/v1/contests/quick-create/route.ts` — Quick-create contest
- `src/components/seo/json-ld.tsx` — JSON-LD with safeJsonForScript
- `src/lib/compiler/execute.ts` — Compiler execution
- `src/lib/docker/client.ts` — Docker client

## Previously Fixed Items (Verified)

- AGG-1 (PATCH invitation NaN guard): Fixed at line 119 of `[invitationId]/route.ts`
- AGG-2 (Password rehash consolidation): Fixed — `verifyAndRehashPassword` used in all 4 locations
- AGG-3 (LIKE pattern escaping): Fixed — `escapeLikePattern(groupId)` at line 150 of `audit-logs/page.tsx`
- AGG-4 (Chat textarea aria-label): Fixed at line 369
- CR-1 (isStreaming ref): Fixed — `isStreamingRef` used in sendMessage and scrollToBottom
- CR-2 (TABLE_MAP derived from TABLE_ORDER): Fixed — lines 19-22 of import.ts
- PERF-1 (SSE stale threshold caching): Fixed — 5-minute TTL cache at lines 84-98

## New Findings

### CR-1: SSE realtime-coordination LIKE patterns lack ESCAPE clause — inconsistent with codebase standard [LOW/MEDIUM]

**File:** `src/lib/realtime/realtime-coordination.ts:94, 107`

**Description:** The `getSsePrefixPattern()` function returns `realtime:sse:user:%` which is used in raw SQL LIKE expressions without an `ESCAPE '\\'` clause. Every other LIKE query in the codebase uses the `ESCAPE '\\'` clause consistently. While the `SSE_KEY_PREFIX` constant (`realtime:sse:user:`) is server-controlled and doesn't contain LIKE wildcards, the absence of the ESCAPE clause is inconsistent with the codebase convention established by `escapeLikePattern()`.

**Concrete failure scenario:** A developer copies this pattern for a new LIKE query that involves user input, omitting the ESCAPE clause because the existing codebase precedent doesn't include it. The new query becomes vulnerable to LIKE injection.

**Fix:** Add `ESCAPE '\\'` to both LIKE queries for consistency:
```typescript
sql`${rateLimits.key} LIKE ${getSsePrefixPattern()} ESCAPE '\\'`
```

**Confidence:** Medium

---

### CR-2: quick-create route does not validate `startsAt`/`deadline` with NaN guard [MEDIUM/MEDIUM]

**File:** `src/app/api/v1/contests/quick-create/route.ts:31-34`

**Description:** The quick-create route constructs `new Date(body.startsAt)` and `new Date(body.deadline)` from client-provided strings. While the Zod schema enforces `.datetime()` format, there is no `Number.isFinite()` defense-in-depth check on the resulting Date objects, unlike the recruiting invitation routes which all have this guard. If the Zod validation is ever loosened or the schema is reused without the regex guard, NaN dates would bypass the `startsAt >= deadline` comparison (since `NaN >= NaN` is false) and create a contest with invalid timestamps.

**Concrete failure scenario:** A future refactor changes `startsAt` from `z.string().datetime()` to `z.string()` for flexibility. An attacker sends `startsAt: "invalid"` which passes Zod but produces an Invalid Date. The comparison `startsAt.getTime() >= deadline.getTime()` evaluates to false (NaN comparison), so it passes the schedule validation check. The contest is created with corrupted timestamps.

**Fix:** Add NaN guards after Date construction:
```typescript
const startsAt = body.startsAt ? new Date(body.startsAt) : now;
if (!Number.isFinite(startsAt.getTime())) return apiError("invalidStartsAt", 400);
const deadline = body.deadline ? new Date(body.deadline) : new Date(now.getTime() + 30 * 24 * 3600000);
if (!Number.isFinite(deadline.getTime())) return apiError("invalidDeadline", 400);
```

**Confidence:** Medium
