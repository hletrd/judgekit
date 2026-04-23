# RPF Cycle 45 — Aggregate Review

**Date:** 2026-04-23
**Base commit:** d96a984f
**Review artifacts:** code-reviewer.md, perf-reviewer.md, security-reviewer.md, architect.md, critic.md, verifier.md, debugger.md, test-engineer.md, tracer.md, designer.md, document-specialist.md

## Deduped Findings (sorted by severity then signal)

### AGG-1: Non-null assertions on `Map.get()` and optional relations in client components — 5 remaining instances [MEDIUM/MEDIUM]

**Flagged by:** code-reviewer (CR-1, CR-2), critic (CRI-1), debugger (DBG-1), tracer (TR-1), designer (DES-2), test-engineer (TE-3)
**Signal strength:** 7 of 11 review perspectives

**Files:**
1. `src/app/(dashboard)/dashboard/groups/[id]/assignments/[assignmentId]/student/[userId]/page.tsx:131` — `submissionsByProblem.get(sub.problemId)!.push(sub)`
2. `src/app/(dashboard)/dashboard/submissions/[id]/submission-detail-client.tsx:85` — `submission.problem!.id`
3. `src/app/(dashboard)/dashboard/contests/page.tsx:214` — `(contest.personalDeadline ?? contest.deadline)!.getTime()`
4. `src/app/(dashboard)/dashboard/problem-sets/_components/problem-set-form.tsx:200` — `problemSet!.id`
5. `src/app/(dashboard)/dashboard/admin/roles/role-editor-dialog.tsx:76` — `role!.id`

**Description:** Cycles 43-44 removed non-null assertions from server-side assignment code. Five instances remain in client components. Items 1-2 are the most risky: (1) a `Map.get()` assertion that could throw if the map is concurrently modified, (2) `submission.problem!.id` that throws if the problem has been deleted. Items 3-5 are guarded by surrounding conditionals but are fragile.

**Concrete failure scenario (item 2):** An instructor deletes a problem. A student opens their submission detail for that problem and clicks "resubmit." `submission.problem!.id` throws `TypeError: Cannot read properties of null`, and the resubmit button silently fails with no user feedback.

**Fix:** Replace with explicit null guards or optional chaining with fallbacks.

---

### AGG-2: API rate-limiting module uses `Date.now()` for DB-timestamp comparisons — architectural inconsistency [MEDIUM/MEDIUM]

**Flagged by:** security-reviewer (SEC-1), architect (ARCH-1), critic (CRI-2)
**Signal strength:** 3 of 11 review perspectives

**Files:**
- `src/lib/security/api-rate-limit.ts:54,86,90`
- `src/lib/security/rate-limit.ts:39,77`

**Description:** The `atomicConsumeRateLimit` function uses `Date.now()` to compare against DB-stored `rateLimits` columns (`windowStartedAt`, `blockedUntil`, `lastAttempt`). This is the same clock-skew class of issue fixed in submissions, assignments, and anti-cheat routes. The codebase has converged on `getDbNowUncached()` for DB-timestamp comparisons.

However, rate-limit windows are measured in minutes (not seconds), and adding a DB query to every rate-limited request would increase latency on the hot path. The in-memory rate limiter (`in-memory-rate-limit.ts`) is purely process-local and `Date.now()` is appropriate there.

**Concrete failure scenario:** App server clock is 60 seconds behind DB clock. A user whose rate-limit window has expired (per DB time) is still blocked for 60 extra seconds. Or conversely, if the app clock is ahead, a user could make requests slightly before the window resets.

**Fix:** For `api-rate-limit.ts` (DB-backed path), cache `getDbNowUncached()` at the start of the transaction. For `in-memory-rate-limit.ts` and `rate-limit.ts`, `Date.now()` is appropriate. This may be deferred given the performance trade-off.

---

### AGG-3: Contest analytics student progression fetches all submissions without LIMIT — memory pressure on large contests [MEDIUM/LOW]

**Flagged by:** perf-reviewer (PERF-1), critic (CRI-3)
**Signal strength:** 2 of 11 review perspectives

**File:** `src/lib/assignments/contest-analytics.ts:242-250`

**Description:** The `includeTimeline` path fetches ALL submissions for a contest into memory. For large contests (200+ students, 10+ problems, 50+ attempts each), this could be 100K+ rows. The analytics cache (5-minute TTL) limits the frequency, but the query itself is unbounded.

**Fix:** Add a LIMIT clause or compute the progression using SQL window functions instead of fetching all rows.

---

## Carry-Over Items (Still Unfixed from Prior Cycles)

- **Prior AGG-2:** Leaderboard freeze uses Date.now() (deferred, LOW/LOW)
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
- **Prior SEC-2 (from cycle 43):** Anti-cheat heartbeat dedup uses Date.now() for LRU cache (deferred, LOW/LOW)

## Verified Fixes This Cycle (From Prior Cycles)

All fixes from cycles 37-44 remain intact:
1. `"redeemed"` removed from PATCH route state machine
2. `Date.now()` replaced with `getDbNowUnc()` in assignment PATCH
3. Non-null assertions removed from anti-cheat heartbeat gap detection
4. NaN guard in quick-create route
5. MAX_EXPIRY_MS guard in bulk route
6. Un-revoke transition removed from PATCH route
7. Exam session short-circuit for non-exam assignments
8. ESCAPE clause in SSE LIKE queries
9. Chat widget ARIA label with message count
10. Case-insensitive email dedup in bulk route
11. computeExpiryFromDays extracted to shared helper
12. problemPoints/refine validation in quick-create
13. Capability-based auth on access-code routes
14. Redundant non-null assertion removed from userId
15. Submission rate-limit uses `getDbNowUncached()` for clock-skew consistency
16. Contest join route has explicit `auth: true`
17. `validateAssignmentSubmission` uses `getDbNowUncached()` for deadline enforcement
18. Map.get() non-null assertions replaced in contest-scoring, submissions, contest-analytics

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
