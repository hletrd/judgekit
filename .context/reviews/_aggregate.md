# RPF Cycle 40 — Aggregate Review

**Date:** 2026-04-23
**Base commit:** f030233a
**Review artifacts:** code-reviewer.md, perf-reviewer.md, security-reviewer.md, architect.md, critic.md, verifier.md, debugger.md, test-engineer.md, tracer.md, designer.md, document-specialist.md

## Deduped Findings (sorted by severity then signal)

### AGG-1: Assignment PATCH uses `Date.now()` instead of DB time for active-contest check — clock-skew bypass [MEDIUM/MEDIUM]

**Flagged by:** code-reviewer (CR-1), security-reviewer (SEC-1), architect (ARCH-1), critic (CRI-1), verifier (V-1), debugger (DBG-1), tracer (TR-1), test-engineer (TE-1), document-specialist (DOC-1)
**Signal strength:** 9 of 11 review perspectives

**File:** `src/app/api/v1/groups/[id]/assignments/[assignmentId]/route.ts:99-101`

**Description:** The assignment PATCH route blocks problem changes during active exam-mode contests. At line 99, it uses `Date.now()` (app server local time) to check if `now >= startsAt`. However, `assignment.startsAt` comes from the database, and the rest of the codebase consistently uses DB server time (`getDbNowUncached()`) for schedule comparisons to avoid clock skew.

If the app server clock is behind the DB server clock, `Date.now()` could return a time before `startsAt` even though the contest has already started in DB time. An instructor could then modify problems during an active contest.

**Concrete failure scenario:** App server clock is 2 minutes behind DB server clock. An exam starts at 10:00 DB time. At 10:01 DB time (9:59 app time), an instructor sends a PATCH to change problem points. The `Date.now()` check returns 9:59, which is < 10:00, so the active-contest block is bypassed. Problems are modified during an active exam.

**Fix:** Replace `Date.now()` with `getDbNowUncached()`:
```typescript
// Use DB server time to avoid clock skew between app and DB servers,
// consistent with the recruiting invitation routes.
const now = await getDbNowUncached();
const startsAt = assignment.startsAt ? new Date(assignment.startsAt).getTime() : null;
if (startsAt && now.getTime() >= startsAt) {
  return { error: apiError("contestProblemsLockedDuringActive", 409) };
}
```

---

### AGG-2: Anti-cheat heartbeat gap detection uses non-null assertions on nullable `createdAt` field [LOW/LOW]

**Flagged by:** code-reviewer (CR-2), critic (CRI-2), debugger (DBG-2)
**Signal strength:** 3 of 11 review perspectives

**File:** `src/app/api/v1/contests/[assignmentId]/anti-cheat/route.ts:211-213`

**Description:** The heartbeat gap detection loop accesses `heartbeats[i - 1].createdAt!` and `heartbeats[i].createdAt!` with non-null assertions. While the preceding `if` check at line 211 already guards against null values, the `!` assertions are misleading and would hide a future regression if the null check were removed.

**Fix:** Remove the non-null assertions since the null guard already handles the case:
```typescript
if (!heartbeats[i - 1].createdAt || !heartbeats[i].createdAt) continue;
const prev = new Date(heartbeats[i - 1].createdAt).getTime();
const curr = new Date(heartbeats[i].createdAt).getTime();
```

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
- **Prior DES-1:** Chat widget button badge lacks ARIA announcement (deferred)
- **Prior PERF-3:** Anti-cheat heartbeat gap query transfers up to 5000 rows (deferred)

## Verified Fixes This Cycle

All fixes from cycles 38-39 remain intact and working:
1. Quick-create route NaN guard for Date construction (AGG-1 from cycle 38/39)
2. Bulk invitation MAX_EXPIRY_MS guard (AGG-1 from cycle 39)
3. Un-revoke transition removed (AGG-2 from cycle 39)
4. Exam session short-circuit for non-exam assignments (AGG-3 from cycle 39)
5. API key auto-dismiss countdown feature (AGG-4 from cycle 38)
6. MAX_EXPIRY_MS extracted to shared constant (CRI-2 from cycle 37)
7. ESCAPE clause added to SSE LIKE queries (CRI-3 from cycle 37)
8. Chat widget button aria-label with message count (DES-1 from cycle 37)

## Deferred Items

| Finding | File+Line | Severity/Confidence | Reason for Deferral | Exit Criterion |
|---------|-----------|-------------------|--------------------|---------------|
| PERF-1: Shared poll timer reads config on restart | events/route.ts:161 | LOW/LOW | Timer only restarts on first subscriber after quiet period; infrequent | Performance profiling shows bottleneck |
| PERF-2: SSE connection eviction linear search | events/route.ts:44-55 | LOW/LOW | Bounded by 1000-entry cap; O(n) is acceptable | Cap is raised significantly |
| PERF-3: Anti-cheat heartbeat gap query transfers up to 5000 rows | anti-cheat/route.ts:195-204 | MEDIUM/MEDIUM | Could use SQL window function; currently bounded by limit | Long contest with many heartbeats causes slow API response |
| DES-1: Chat widget button badge lacks ARIA announcement | chat-widget.tsx:284-288 | LOW/LOW | Screen reader edge case; badge is visual-only | Accessibility audit or user complaint |
| Prior AGG-5: Console.error in client components | discussions/*.tsx, groups/*.tsx | LOW/MEDIUM | Requires architectural decision; no data loss | Client error reporting feature request |
| Prior AGG-6: SSE O(n) eviction scan | events/route.ts:44-55 | LOW/LOW | Bounded by 1000-entry cap | Performance profiling shows bottleneck |
| Prior AGG-7: Manual routes duplicate createApiHandler | migrate/import, restore routes | MEDIUM/MEDIUM | Requires extending createApiHandler to support multipart | Next API framework iteration |
| Prior AGG-8: Global timer HMR pattern duplication | 4 modules | LOW/MEDIUM | DRY concern; each module works correctly | Module refactoring cycle |
| Prior SEC-3: Anti-cheat copies text content | anti-cheat-monitor.tsx:206 | LOW/LOW | 80-char limit; privacy notice accepted | Privacy audit or user complaint |
| Prior SEC-4: Docker build error leaks paths | docker/client.ts:169 | LOW/LOW | Admin-only; Docker output expected | Admin permission review |
| Prior DOC-1: SSE route ADR | events/route.ts | LOW/LOW | Documentation-only | Next documentation cycle |
| Prior DOC-2: Docker client dual-path docs | docker/client.ts | LOW/LOW | Documentation-only | Next documentation cycle |
