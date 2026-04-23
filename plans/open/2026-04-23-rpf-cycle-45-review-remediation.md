# RPF Cycle 45 — Review Remediation Plan

**Date:** 2026-04-23
**Cycle:** 45/100
**Base commit:** d96a984f
**Status:** In Progress

## Lanes

### Lane 1: Replace non-null assertions in client components [AGG-1]

**Severity:** MEDIUM/MEDIUM (7 of 11 perspectives)
**Files:**
1. `src/app/(dashboard)/dashboard/groups/[id]/assignments/[assignmentId]/student/[userId]/page.tsx:131` — `submissionsByProblem.get(sub.problemId)!.push(sub)`
2. `src/app/(dashboard)/dashboard/submissions/[id]/submission-detail-client.tsx:85` — `submission.problem!.id`
3. `src/app/(dashboard)/dashboard/contests/page.tsx:214` — `(contest.personalDeadline ?? contest.deadline)!.getTime()`
4. `src/app/(dashboard)/dashboard/problem-sets/_components/problem-set-form.tsx:200` — `problemSet!.id`
5. `src/app/(dashboard)/dashboard/admin/roles/role-editor-dialog.tsx:76` — `role!.id`

**Tasks:**
- [ ] In `student/[userId]/page.tsx:131`, replace `submissionsByProblem.get(sub.problemId)!.push(sub)` with explicit null guard
- [ ] In `submission-detail-client.tsx:85`, replace `submission.problem!.id` with `submission.problem?.id ?? "unknown"` and guard `handleResubmit`
- [ ] In `contests/page.tsx:214`, extract `(contest.personalDeadline ?? contest.deadline)` to a local variable and use without `!`
- [ ] In `problem-set-form.tsx:200`, replace `problemSet!.id` with `problemSet?.id` with fallback
- [ ] In `role-editor-dialog.tsx:76`, replace `role!.id` with `role?.id` with fallback
- [ ] Verify TypeScript compiles without errors
- [ ] Run existing tests to confirm no regressions
- [ ] Commit with message: `refactor(ui): ♻️ replace non-null assertions with null guards in client components`

---

### Lane 2: Run quality gates

**Severity:** Required
**Status:** Pending

**Tasks:**
- [ ] Run `eslint` — must pass
- [ ] Run `npm run build` — must pass
- [ ] Run `npm run test:unit` — must pass
- [ ] Run `npm run test:component` — must pass
- [ ] Fix any gate failures

---

## Deferred Items

| Finding | File+Line | Severity/Confidence | Reason for Deferral | Exit Criterion |
|---------|-----------|-------------------|--------------------|---------------|
| AGG-2: Rate-limiting Date.now() for DB timestamps | api-rate-limit.ts:54 | MEDIUM/MEDIUM | Adding DB query to hot path increases latency; rate-limit windows are minutes-level | Clock skew observed in production affecting rate limiting |
| AGG-3: Analytics progression unbounded query | contest-analytics.ts:242 | MEDIUM/LOW | Bounded by 5-min cache; typical contest sizes are manageable | Contest with >500 students causes slow analytics response |
| Prior AGG-2: Leaderboard freeze uses Date.now() | leaderboard.ts:52 | LOW/LOW | Display-only inaccuracy; seconds-level | Leaderboard freeze timing becomes a user-facing issue |
| Prior AGG-5: Console.error in client components | discussions/*.tsx, groups/*.tsx | LOW/MEDIUM | Requires architectural decision; no data loss | Client error reporting feature request |
| Prior AGG-6: SSE O(n) eviction scan | events/route.ts:44-55 | LOW/LOW | Bounded by 1000-entry cap | Performance profiling shows bottleneck |
| Prior AGG-7: Manual routes duplicate createApiHandler | migrate/import, restore routes | MEDIUM/MEDIUM | Requires extending createApiHandler to support multipart | Next API framework iteration |
| Prior AGG-8: Global timer HMR pattern duplication | 4 modules | LOW/MEDIUM | DRY concern; each module works correctly | Module refactoring cycle |
| Prior SEC-3: Anti-cheat copies text content | anti-cheat-monitor.tsx:206 | LOW/LOW | 80-char limit; privacy notice accepted | Privacy audit or user complaint |
| Prior SEC-4: Docker build error leaks paths | docker/client.ts:169 | LOW/LOW | Admin-only; Docker output expected | Admin permission review |
| Prior PERF-3: Anti-cheat heartbeat gap query transfers up to 5000 rows | anti-cheat/route.ts:195-204 | MEDIUM/MEDIUM | Could use SQL window function; currently bounded by limit | Long contest with many heartbeats causes slow API response |
| Prior DES-1: Chat widget button badge lacks ARIA announcement | chat-widget.tsx:284-288 | LOW/LOW | Screen reader edge case; badge is visual-only | Accessibility audit or user complaint |
| Prior DOC-1: SSE route ADR | events/route.ts | LOW/LOW | Documentation-only | Next documentation cycle |
| Prior DOC-2: Docker client dual-path docs | docker/client.ts | LOW/LOW | Documentation-only | Next documentation cycle |
| Prior ARCH-2: Stale-while-revalidate cache pattern duplication | contest-scoring.ts, analytics/route.ts | LOW/LOW | DRY concern; both modules work correctly | Module refactoring cycle |
| Prior SEC-2: Anti-cheat heartbeat dedup Date.now() | anti-cheat/route.ts:92 | LOW/LOW | Approximate by design; LRU cache is inherently imprecise | Performance profiling shows missed dedup |
