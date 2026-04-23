# RPF Cycle 39 — Aggregate Review

**Date:** 2026-04-23
**Base commit:** c176d8f5
**Review artifacts:** code-reviewer.md, perf-reviewer.md, security-reviewer.md, architect.md, critic.md, verifier.md, debugger.md, test-engineer.md, tracer.md, designer.md, document-specialist.md

## Deduped Findings (sorted by severity then signal)

### AGG-1: Bulk invitation `expiryDays` path missing `MAX_EXPIRY_MS` guard [MEDIUM/HIGH]

**Flagged by:** code-reviewer (CR-1), security-reviewer (SEC-1), critic (CRI-1), verifier (V-1), debugger (DBG-1), tracer (TRACE-1), test-engineer (TE-1), architect (implied)
**Signal strength:** 8 of 11 review perspectives

**File:** `src/app/api/v1/contests/[assignmentId]/recruiting-invitations/bulk/route.ts:64-66`

**Description:** The bulk invitation route checks `MAX_EXPIRY_MS` when `expiryDate` is set (line 78) but not when `expiryDays` is used (line 64-66). The single-create route performs this check at line 90-92. The Zod schema's `max(3650)` makes this safe today (3650 * 86400000 < MAX_EXPIRY_MS), but the missing defense-in-depth guard is inconsistent with the single-create route.

**Concrete failure scenario:** A future PR raises `expiryDays` max to 10000 (about 27 years). The single-create route's `MAX_EXPIRY_MS` check would reject it, but the bulk route would accept it, creating invitations that expire unreasonably far in the future.

**Fix:** Add `MAX_EXPIRY_MS` check after `computeExpiryFromDays` in the bulk route:
```typescript
if (expiresAt && (expiresAt.getTime() - dbNow.getTime()) > MAX_EXPIRY_MS) {
  throw new Error("expiryDateTooFar");
}
```

---

### AGG-2: Invitation "un-revoke" feature is broken — route allows it but library rejects it [MEDIUM/MEDIUM]

**Flagged by:** code-reviewer (CR-3), architect (ARCH-1), critic (CRI-2), verifier (V-2), debugger (DBG-2), tracer (TRACE-2), test-engineer (TE-2)
**Signal strength:** 7 of 11 review perspectives

**Files:** `src/app/api/v1/contests/[assignmentId]/recruiting-invitations/[invitationId]/route.ts:96-99` vs `src/lib/assignments/recruiting-invitations.ts:207-213`

**Description:** The PATCH route's state machine (line 96-99) allows `revoked -> ["pending"]` transitions, but `updateRecruitingInvitation` (line 207-213) has `WHERE status = 'pending'` in its UPDATE, which rejects the update when the current status is "revoked". The function throws "invitationCannotBeRevoked" which is semantically wrong for an un-revoke attempt. The error propagates as an unhandled 500 "internalServerError" to the client.

**Concrete failure scenario:** An instructor revokes an invitation by mistake and tries to un-revoke it via PATCH with `{ status: "pending" }`. The route's state machine allows the transition, but `updateRecruitingInvitation` silently fails (0 rows updated) and throws a misleading error. The client sees a 500 error instead of a meaningful response.

**Fix:** Option A: Remove "pending" from the allowed targets of "revoked" in the route's state machine (simplest fix, consistent with the library's behavior). Option B: Update `updateRecruitingInvitation` to support un-revoking by adding a separate `WHERE status = 'revoked'` path with proper handling. Option C: At minimum, add "invitationCannotBeRevoked" to the route's catch block to return a proper 400 error instead of a 500.

---

### AGG-3: Exam session POST route does not short-circuit for non-exam assignments [LOW/MEDIUM]

**Flagged by:** architect (ARCH-3), critic (CRI-3), verifier (V-3), debugger (DBG-3)
**Signal strength:** 4 of 11 review perspectives

**File:** `src/app/api/v1/groups/[id]/assignments/[assignmentId]/exam-session/route.ts:24-28`

**Description:** The exam session POST route fetches the assignment with only `{ id: true, groupId: true }` columns, then delegates to `startExamSession` which queries the assignment again. If `examMode` is "none", the second query and validation happen unnecessarily. The route could short-circuit earlier by checking exam mode in the initial query.

**Concrete failure scenario:** A student sends a POST to start an exam session for a non-exam assignment. The route queries the assignment (1 DB round trip), validates access (2+ more queries), then calls `startExamSession` which queries the assignment again (1 more DB round trip) before returning "examModeInvalid". Total: 4+ DB queries for an operation that should fail after 1-2 queries.

**Fix:** Include `examMode` in the initial assignment query and return an error immediately if it's "none".

---

### AGG-4: API key dialog auto-dismiss has no visual countdown [LOW/LOW]

**Flagged by:** designer (DES-1)
**Signal strength:** 1 of 11 review perspectives

**File:** `src/app/(dashboard)/dashboard/admin/api-keys/api-keys-client.tsx:113-120`

**Description:** The 5-minute auto-dismiss timer (added in cycle 38) silently clears the raw API key from state. There is no visual indication to the admin that the key will disappear after 5 minutes. The original plan noted the countdown indicator as "optional."

**Fix:** Add a countdown text near the key display area (e.g., "This key will be hidden in 3:42").

---

## Carry-Over Items (Still Unfixed from Prior Cycles)

- **Prior AGG-5:** Console.error in client components instead of structured logging (deferred)
- **Prior AGG-6:** SSE O(n) eviction scan (deferred — bounded by 1000 cap)
- **Prior AGG-7:** Manual routes duplicate createApiHandler boilerplate (deferred)
- **Prior AGG-8:** Global timer HMR pattern duplication (deferred)
- **Prior SEC-3:** Anti-cheat copies user text content (deferred)
- **Prior SEC-4:** Docker build error leaks paths (deferred)
- **Prior DOC-1:** SSE route ADR (deferred)
- **Prior DOC-2:** Docker client dual-path behavior documentation (deferred)
- **Prior AGG-6 (cycle 38):** Bulk route DRY extraction (deferred — immediate correctness issue resolved)

## Verified Fixes This Cycle

All fixes from cycle 38 remain intact and working:
1. Bulk invitation case-insensitive email dedup (AGG-1 from cycle 38)
2. `computeExpiryFromDays` shared helper (AGG-3 from cycle 38)
3. Chat widget `role="alert"` (AGG-2 from cycle 38)
4. API key auto-dismiss timer (AGG-4 from cycle 38)

## Deferred Items

| Finding | File+Line | Severity/Confidence | Reason for Deferral | Exit Criterion |
|---------|-----------|-------------------|--------------------|---------------|
| PERF-1: Shared poll timer reads config on restart | events/route.ts:161 | LOW/LOW | Timer only restarts on first subscriber after quiet period; infrequent | Performance profiling shows bottleneck |
| PERF-2: SSE connection eviction linear search | events/route.ts:44-55 | LOW/LOW | Bounded by 1000-entry cap; O(n) is acceptable | Cap is raised significantly |
| CRI-2: Quick-create orphan groups | quick-create/route.ts:61-66 | LOW/LOW | Design concern, not a bug; groups serve as containers | Product decision on cascade deletion |
| CRI-3: Chat widget hides on contest list page | chat-widget.tsx:61-65 | LOW/LOW | UX preference; current behavior is conservative | Product decision on visibility rules |
| DOC-1: recruiting-constants JSDoc "~10 years" | recruiting-constants.ts:7 | LOW/LOW | Documentation-only | Next documentation cycle |
| DOC-2: Bulk route dedup strategy docs | bulk/route.ts | LOW/LOW | Documentation-only | Next documentation cycle |
| DBG-2: Anti-cheat retry timer overlap | anti-cheat-monitor.tsx:130-135 | LOW/LOW | Server-side idempotency mitigates; practical impact minimal | Race condition causes user-visible issues |
| PERF-1(analytics): entryProblemMaps per-entry | contest-analytics.ts:125-128 | LOW/LOW | Bounded by contest size; one-time calculation | Analytics query takes >1s |
| PERF-2(cycle-39): Anti-cheat heartbeat gap query transfers up to 5000 rows | anti-cheat/route.ts:195-204 | MEDIUM/MEDIUM | Could use SQL window function; currently bounded by limit | Long contest with many heartbeats causes slow API response |
| Prior AGG-5: Console.error in client components | discussions/*.tsx, groups/*.tsx | LOW/MEDIUM | Requires architectural decision; no data loss | Client error reporting feature request |
| Prior AGG-6: SSE O(n) eviction scan | events/route.ts:44-55 | LOW/LOW | Bounded by 1000-entry cap | Performance profiling shows bottleneck |
| Prior AGG-7: Manual routes duplicate createApiHandler | migrate/import, restore routes | MEDIUM/MEDIUM | Requires extending createApiHandler to support multipart | Next API framework iteration |
| Prior AGG-8: Global timer HMR pattern duplication | 4 modules | LOW/MEDIUM | DRY concern; each module works correctly | Module refactoring cycle |
| Prior SEC-3: Anti-cheat copies text content | anti-cheat-monitor.tsx:206 | LOW/LOW | 80-char limit; privacy notice accepted | Privacy audit or user complaint |
| Prior SEC-4: Docker build error leaks paths | docker/client.ts:169 | LOW/LOW | Admin-only; Docker output expected | Admin permission review |
| Prior DOC-1: SSE route ADR | events/route.ts | LOW/LOW | Documentation-only | Next documentation cycle |
| Prior DOC-2: Docker client dual-path docs | docker/client.ts | LOW/LOW | Documentation-only | Next documentation cycle |
