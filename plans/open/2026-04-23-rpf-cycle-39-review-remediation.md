# RPF Cycle 39 — Review Remediation Plan

**Date:** 2026-04-23
**Cycle:** 39/100
**Base commit:** c176d8f5
**Status:** In Progress

## Lanes

### Lane 1: Add `MAX_EXPIRY_MS` guard to bulk invitation `expiryDays` path [AGG-1]

**Severity:** MEDIUM/HIGH (8 of 11 perspectives)
**File:** `src/app/api/v1/contests/[assignmentId]/recruiting-invitations/bulk/route.ts:64-66`
**Status:** Pending

**Tasks:**
- [ ] Add `MAX_EXPIRY_MS` check after `computeExpiryFromDays` in the bulk route, consistent with the single-create route (line 90-92)
- [ ] Handle the new "expiryDateTooFar" error in the catch block
- [ ] Verify that the Zod schema `max(3650)` is still below `MAX_EXPIRY_MS` (3650 * 86400000 < MAX_EXPIRY_MS)

**Fix:**
```typescript
// After line 66 (expiresAt = computeExpiryFromDays(dbNow, inv.expiryDays))
if (expiresAt && (expiresAt.getTime() - dbNow.getTime()) > MAX_EXPIRY_MS) {
  throw new Error("expiryDateTooFar");
}
```

---

### Lane 2: Fix invitation "un-revoke" feature — remove broken state transition [AGG-2]

**Severity:** MEDIUM/MEDIUM (7 of 11 perspectives)
**Files:** `src/app/api/v1/contests/[assignmentId]/recruiting-invitations/[invitationId]/route.ts:96-99` and `src/lib/assignments/recruiting-invitations.ts:207-213`
**Status:** Pending

**Tasks:**
- [ ] Remove `"pending"` from the allowed targets of `"revoked"` in the PATCH route's state machine (line 97-99), since the library function does not support un-revoking and the current behavior returns a 500 error
- [ ] Add a catch handler for "invitationCannotBeRevoked" in the PATCH route to return a proper 400 error instead of 500 (defense-in-depth in case other callers trigger it)
- [ ] Verify the PATCH route returns proper error responses for all status transitions

**Fix (route.ts state machine):**
```typescript
const allowed: Record<string, string[]> = {
  pending: ["revoked"],
  // revoked invitations cannot be un-revoked; the user must create a new invitation
};
```

**Fix (route.ts catch block):**
```typescript
if (error instanceof Error && error.message === "invitationCannotBeRevoked") {
  return apiError("invitationCannotBeRevoked", 400);
}
```

---

### Lane 3: Add exam mode check to exam session POST route [AGG-3]

**Severity:** LOW/MEDIUM (4 of 11 perspectives)
**File:** `src/app/api/v1/groups/[id]/assignments/[assignmentId]/exam-session/route.ts:24-28`
**Status:** Pending

**Tasks:**
- [ ] Include `examMode` in the initial assignment query columns
- [ ] Return an error immediately if `examMode` is "none", before performing access checks
- [ ] Verify the route still works correctly for valid exam assignments

**Fix:**
```typescript
const assignment = await db.query.assignments.findFirst({
  where: eq(assignments.id, assignmentId),
  columns: { id: true, groupId: true, examMode: true },
});
if (!assignment || assignment.groupId !== id) return notFound("Assignment");
if (assignment.examMode === "none") return apiError("examModeInvalid", 400);
```

---

### Lane 4: Add API key dialog countdown indicator [AGG-4]

**Severity:** LOW/LOW (1 of 11 perspectives)
**File:** `src/app/(dashboard)/dashboard/admin/api-keys/api-keys-client.tsx:113-120`
**Status:** Pending

**Tasks:**
- [ ] Add a `timeRemaining` state that counts down from 5 minutes
- [ ] Display the remaining time below the raw key in the dialog
- [ ] Clean up the interval on unmount

---

### Lane 5: Run quality gates

**Severity:** Required
**Status:** Pending

**Tasks:**
- [ ] Run `eslint` and fix any failures
- [ ] Run `npm run build` and fix any failures
- [ ] Run `npm run test:unit` and fix any failures
- [ ] Run `npm run test:integration` and fix any failures
- [ ] Run `npm run test:component` and fix any failures

---

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
| PERF-2(cycle-39): Anti-cheat heartbeat gap query | anti-cheat/route.ts:195-204 | MEDIUM/MEDIUM | Could use SQL window function; currently bounded by limit | Long contest with many heartbeats causes slow API response |
| Prior AGG-5: Console.error in client components | discussions/*.tsx, groups/*.tsx | LOW/MEDIUM | Requires architectural decision; no data loss | Client error reporting feature request |
| Prior AGG-6: SSE O(n) eviction scan | events/route.ts:44-55 | LOW/LOW | Bounded by 1000-entry cap | Performance profiling shows bottleneck |
| Prior AGG-7: Manual routes duplicate createApiHandler | migrate/import, restore routes | MEDIUM/MEDIUM | Requires extending createApiHandler to support multipart | Next API framework iteration |
| Prior AGG-8: Global timer HMR pattern duplication | 4 modules | LOW/MEDIUM | DRY concern; each module works correctly | Module refactoring cycle |
| Prior SEC-3: Anti-cheat copies text content | anti-cheat-monitor.tsx:206 | LOW/LOW | 80-char limit; privacy notice accepted | Privacy audit or user complaint |
| Prior SEC-4: Docker build error leaks paths | docker/client.ts:169 | LOW/LOW | Admin-only; Docker output expected | Admin permission review |
| Prior DOC-1: SSE route ADR | events/route.ts | LOW/LOW | Documentation-only | Next documentation cycle |
| Prior DOC-2: Docker client dual-path docs | docker/client.ts | LOW/LOW | Documentation-only | Next documentation cycle |
| CR-2: Recruiting panel uses browser time for min date | recruiting-invitations-panel.tsx:462 | LOW/MEDIUM | Server-side validation catches; UX polish | Client time sync improvement |
