# RPF Cycle 42 — Aggregate Review

**Date:** 2026-04-23
**Base commit:** 8912b987
**Review artifacts:** code-reviewer.md, perf-reviewer.md, security-reviewer.md, architect.md, critic.md, verifier.md, debugger.md, test-engineer.md, tracer.md, designer.md, document-specialist.md

## Deduped Findings (sorted by severity then signal)

### AGG-1: `problemPoints` array length not validated against `problemIds` in quick-create — silent scoring corruption [MEDIUM/MEDIUM]

**Flagged by:** code-reviewer (CR-1), security-reviewer (SEC-1), architect (ARCH-2), critic (CRI-1), verifier (V-1), debugger (DBG-1), test-engineer (TE-1), tracer (TR-1), document-specialist (DOC-1)
**Signal strength:** 9 of 11 review perspectives

**File:** `src/app/api/v1/contests/quick-create/route.ts:17-21,89`

**Description:** The `quickCreateSchema` accepts `problemIds` (1-50 items) and an optional `problemPoints` array without validating that their lengths match. When `problemPoints` is shorter, extra problems silently default to 100 points via `body.problemPoints?.[i] ?? 100`. When longer, extra entries are silently ignored. This violates the expected behavior where an instructor specifying custom point values should have them applied consistently.

**Concrete failure scenario:** An instructor creates a 10-problem contest with `problemPoints: [1, 2, 3]` intending a point gradient. Problems 4-10 get 100 points each. Students submitting correct answers to problems 4-10 receive disproportionately high scores. No error is returned.

**Fix:** Add `.refine()` to the Zod schema:
```typescript
const quickCreateSchema = z.object({
  // ... existing fields
  problemIds: z.array(z.string()).min(1).max(50),
  problemPoints: z.array(z.number().int().min(1)).optional(),
}).refine(
  (data) => !data.problemPoints || data.problemPoints.length === data.problemIds.length,
  { message: "problemPoints length must match problemIds length", path: ["problemPoints"] }
);
```

---

### AGG-2: Access-code management routes lack capability-based auth at the framework level [LOW/MEDIUM]

**Flagged by:** code-reviewer (CR-2), security-reviewer (SEC-2), architect (ARCH-1), critic (CRI-2), tracer (TR-2), test-engineer (TE-2)
**Signal strength:** 6 of 11 review perspectives

**File:** `src/app/api/v1/contests/[assignmentId]/access-code/route.ts:8-45`

**Description:** The GET, POST, and DELETE handlers for access-code management use `createApiHandler({ handler: ... })` without specifying `auth: { capabilities: [...] }`. They rely solely on the handler-internal `canManageContest()` check. This is inconsistent with the recruiting-invitations routes which use `auth: { capabilities: ["recruiting.manage_invitations"] }` for defense-in-depth. While safe today, this pattern inconsistency could lead to future vulnerabilities.

**Concrete failure scenario:** A developer adds a new method to the access-code route without the inner `canManageContest` check, assuming the framework enforces authorization. Any authenticated user could then manage access codes.

**Fix:** Add `auth: { capabilities: ["contests.manage"] }` (or appropriate capability) to each handler's `createApiHandler` config.

---

### AGG-3: Redundant non-null assertion on `invitation.userId` in `resetRecruitingInvitationAccountPassword` [LOW/LOW]

**Flagged by:** code-reviewer (CR-3), critic (CRI-3), debugger (DBG-2)
**Signal strength:** 3 of 11 review perspectives

**File:** `src/lib/assignments/recruiting-invitations.ts:253`

**Description:** The `invitation.userId!` assertion is redundant because line 230 already guards against null (`!invitation.userId`). While harmless today, it sets a pattern where developers might use `!` assertions instead of proper type narrowing.

**Fix:** Replace `invitation.userId!` with `invitation.userId` — TypeScript can narrow the type after the guard check.

---

## Carry-Over Items (Still Unfixed from Prior Cycles)

- **Prior AGG-2:** Audit logs LIKE-based JSON search (deferred, LOW/LOW)
- **Prior AGG-5:** Console.error in client components (deferred, LOW/MEDIUM)
- **Prior AGG-6:** SSE O(n) eviction scan (deferred, LOW/LOW)
- **Prior AGG-7:** Manual routes duplicate createApiHandler boilerplate (deferred, MEDIUM/MEDIUM)
- **Prior AGG-8:** Global timer HMR pattern duplication (deferred, LOW/MEDIUM)
- **Prior SEC-3:** Anti-cheat copies user text content (deferred, LOW/LOW)
- **Prior SEC-4:** Docker build error leaks paths (deferred, LOW/LOW)
- **Prior PERF-3:** Anti-cheat heartbeat gap query transfers up to 5000 rows (deferred, MEDIUM/MEDIUM)
- **Prior DES-1:** Chat widget button badge lacks ARIA announcement (deferred, LOW/LOW)
- **Prior DOC-1:** SSE route ADR (deferred, LOW/LOW)
- **Prior DOC-2:** Docker client dual-path docs (deferred, LOW/LOW)
- **Prior ARCH-2:** Stale-while-revalidate cache pattern duplication (deferred, LOW/LOW)

## Verified Fixes This Cycle

All fixes from cycles 37-41 remain intact:
1. `"redeemed"` removed from PATCH route state machine
2. `Date.now()` replaced with `getDbNowUncached()` in assignment PATCH
3. Non-null assertions removed from anti-cheat heartbeat gap detection
4. NaN guard in quick-create route
5. MAX_EXPIRY_MS guard in bulk route
6. Un-revoke transition removed from PATCH route
7. Exam session short-circuit for non-exam assignments
8. ESCAPE clause in SSE LIKE queries
9. Chat widget ARIA label with message count
10. Case-insensitive email dedup in bulk route
11. computeExpiryFromDays extracted to shared helper

## Deferred Items

| Finding | File+Line | Severity/Confidence | Reason for Deferral | Exit Criterion |
|---------|-----------|-------------------|--------------------|---------------|
| AGG-3: Redundant non-null assertion | recruiting-invitations.ts:253 | LOW/LOW | Safe today; cosmetic improvement | Refactoring cycle |
| Prior AGG-2: Audit logs LIKE-based JSON search | audit-logs/page.tsx:150 | LOW/LOW | Works today; robustness improvement | JSON serialization changes or PostgreSQL upgrade |
| Prior PERF-3: Anti-cheat heartbeat gap query transfers up to 5000 rows | anti-cheat/route.ts:195-204 | MEDIUM/MEDIUM | Could use SQL window function; currently bounded by limit | Long contest with many heartbeats causes slow API response |
| Prior AGG-5: Console.error in client components | discussions/*.tsx, groups/*.tsx | LOW/MEDIUM | Requires architectural decision; no data loss | Client error reporting feature request |
| Prior AGG-6: SSE O(n) eviction scan | events/route.ts:44-55 | LOW/LOW | Bounded by 1000-entry cap | Performance profiling shows bottleneck |
| Prior AGG-7: Manual routes duplicate createApiHandler | migrate/import, restore routes | MEDIUM/MEDIUM | Requires extending createApiHandler to support multipart | Next API framework iteration |
| Prior AGG-8: Global timer HPR pattern duplication | 4 modules | LOW/MEDIUM | DRY concern; each module works correctly | Module refactoring cycle |
| Prior SEC-3: Anti-cheat copies text content | anti-cheat-monitor.tsx:206 | LOW/LOW | 80-char limit; privacy notice accepted | Privacy audit or user complaint |
| Prior SEC-4: Docker build error leaks paths | docker/client.ts:169 | LOW/LOW | Admin-only; Docker output expected | Admin permission review |
| Prior DOC-1: SSE route ADR | events/route.ts | LOW/LOW | Documentation-only | Next documentation cycle |
| Prior DOC-2: Docker client dual-path docs | docker/client.ts | LOW/LOW | Documentation-only | Next documentation cycle |
| Prior ARCH-2: Stale-while-revalidate cache pattern duplication | contest-scoring.ts, analytics/route.ts | LOW/LOW | DRY concern; both modules work correctly | Module refactoring cycle |
| Prior DES-1: Chat widget button badge lacks ARIA announcement | chat-widget.tsx:284-288 | LOW/LOW | Screen reader edge case; badge is visual-only | Accessibility audit or user complaint |
