# RPF Cycle 38 — Review Remediation Plan

**Date:** 2026-04-23
**Cycle:** 38/100
**Base commit:** 4dd3d951
**Status:** In Progress

## Lanes

### Lane 1: Fix bulk invitation case-insensitive email dedup [AGG-1]

**Severity:** MEDIUM/HIGH (8 of 11 perspectives)
**File:** `src/app/api/v1/contests/[assignmentId]/recruiting-invitations/bulk/route.ts:41-49`
**Status:** Done

**Tasks:**
- [x] Replace `inArray(recruitingInvitations.candidateEmail, orderedEmails)` with case-insensitive query using `lower()`
- [x] Verify the fix rejects duplicate emails regardless of casing
- [x] Ensure the advisory lock pattern still works correctly after the change

**Commit:** 11012453

---

### Lane 2: Add `role="alert"` to chat widget error message [AGG-2]

**Severity:** MEDIUM/MEDIUM (2 of 11 perspectives)
**File:** `src/lib/plugins/chat-widget/chat-widget.tsx:353-356`
**Status:** Done

**Tasks:**
- [x] Add `role="alert"` attribute to the error message div in the chat widget

**Commit:** 2ce703e4

---

### Lane 3: Extract `computeExpiryFromDays` shared helper [AGG-3]

**Severity:** LOW/MEDIUM (2 of 11 perspectives)
**Files:** 5 route files (see AGG-3 for full list)
**Status:** Done

**Tasks:**
- [x] Add `computeExpiryFromDays(baseDate, expiryDays)` to `src/lib/assignments/recruiting-constants.ts`
- [x] Replace all 5 inline `new Date(dbNow.getTime() + expiryDays * 86400000)` with the shared helper
- [x] Verify all routes still work correctly after extraction

**Commit:** 263a5476

---

### Lane 4: Add auto-dismiss timer to API key created-key dialog [AGG-4]

**Severity:** LOW/MEDIUM (2 of 11 perspectives)
**File:** `src/app/(dashboard)/dashboard/admin/api-keys/api-keys-client.tsx:288-329`
**Status:** Done

**Tasks:**
- [x] Add a 5-minute auto-dismiss useEffect that clears `createdKey` from state
- [x] Clean up timer on unmount
- [x] Optionally add a visible countdown indicator

**Commit:** acb6c477

---

### Lane 5: Extract common invitation preparation logic [AGG-6]

**Severity:** LOW/MEDIUM (1 of 11 perspectives)
**Files:** `recruiting-invitations/route.ts:44-102` vs `bulk/route.ts:28-87`
**Status:** Deferred

**Tasks:**
- [ ] Extract shared expiry computation (also covered by Lane 3) into a helper
- [ ] Extract shared email dedup logic so both single and bulk routes use the same case-insensitive approach
- [ ] Verify both routes produce identical validation behavior

**Note:** Lane 1 already fixed the case-insensitive email dedup inconsistency. The broader DRY extraction is deferred to a future cycle as the immediate correctness issue is resolved.

---

### Lane 6: Run quality gates

**Severity:** Required
**Status:** In Progress

**Tasks:**
- [x] Run `eslint` and fix any failures
- [ ] Run `npm run build` and fix any failures (running)
- [ ] Run `npm run test:unit` and fix any failures (running)
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
| Prior AGG-5: Console.error in client components | discussions/*.tsx, groups/*.tsx | LOW/MEDIUM | Requires architectural decision; no data loss | Client error reporting feature request |
| Prior AGG-6: SSE O(n) eviction scan | events/route.ts:44-55 | LOW/LOW | Bounded by 1000-entry cap | Performance profiling shows bottleneck |
| Prior AGG-7: Manual routes duplicate createApiHandler | migrate/import, restore routes | MEDIUM/MEDIUM | Requires extending createApiHandler to support multipart | Next API framework iteration |
| Prior AGG-8: Global timer HMR pattern duplication | 4 modules | LOW/MEDIUM | DRY concern; each module works correctly | Module refactoring cycle |
| Prior SEC-3: Anti-cheat copies text content | anti-cheat-monitor.tsx:206 | LOW/LOW | 80-char limit; privacy notice accepted | Privacy audit or user complaint |
| Prior SEC-4: Docker build error leaks paths | docker/client.ts:169 | LOW/LOW | Admin-only; Docker output expected | Admin permission review |
| Prior DOC-1: SSE route ADR | events/route.ts | LOW/LOW | Documentation-only | Next documentation cycle |
| Prior DOC-2: Docker client dual-path docs | docker/client.ts | LOW/LOW | Documentation-only | Next documentation cycle |
