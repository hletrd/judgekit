# Cycle 21 Review Remediation Plan

**Date:** 2026-04-19
**Source**: Cycle 21 aggregate review (`.context/reviews/_aggregate.md`)

---

## MEDIUM Priority

### M1: Extract shared IOI scoring SQL fragment
- **Source**: architect F2, critic F1, code-reviewer
- **Files**: `src/lib/assignments/contest-scoring.ts`, `src/lib/assignments/leaderboard.ts`
- **Plan**:
  1. Create a helper function `buildIoiScoringCaseExpression(params)` that returns the SQL CASE expression for IOI late penalty handling (non-windowed vs windowed exam mode).
  2. Use this helper in both `contest-scoring.ts:buildScoringQuery` and `leaderboard.ts:computeSingleUserLiveRank`.
  3. Ensure the parameter names match between both call sites.
- **Status**: DONE (commit 301bbc56, 71b2c3c1)

### M2: Optimize `participant-audit.ts` single-user lookup
- **Source**: code-reviewer F1, perf-reviewer F1, critic F2
- **Files**: `src/lib/assignments/participant-audit.ts`
- **Plan**:
  1. Document that `getParticipantAuditData` computes the full leaderboard (the cache mitigates repeated calls within 15s).
  2. For a proper optimization, create a lightweight single-user query that fetches only the target user's per-problem data and computes their entry directly. This is a larger change — defer if time-constrained.
- **Status**: DONE (documented in commit 7c21c5ac; optimization deferred)

### M3: Add tests for `computeSingleUserLiveRank`
- **Source**: test-engineer F1, critic F4
- **Files**: `src/lib/assignments/leaderboard.ts`, new test file
- **Plan**:
  1. Create integration test file for leaderboard live rank.
  2. Test cases: IOI without late penalty, IOI with non-windowed late penalty, IOI with windowed late penalty, ICPC mode, user with no submissions returns null.
  3. Verify that the live rank matches the main leaderboard rank for the same user.
- **Status**: TODO

### M4: Add tests for `getParticipantTimeline`
- **Source**: test-engineer F2
- **Files**: `src/lib/assignments/participant-timeline.ts`, new test file
- **Plan**:
  1. Create unit tests for `wrongBeforeAc` calculation with ICPC and IOI scoring models.
  2. Test `isFirstAc` function behavior (ICPC: status === "accepted", IOI: score >= problemPoints).
  3. Test `sortTimeline` ordering.
- **Status**: TODO

---

## LOW Priority

### L1: Rename `adjustedScore` to `rawScaledScore` in `contest-analytics.ts`
- **Source**: code-reviewer F2, critic F3
- **Files**: `src/lib/assignments/contest-analytics.ts:242`
- **Plan**: Rename the variable and update the comment.
- **Status**: DONE (commit ab8fe63b)

### L2: Fix anti-cheat `limit`/`offset` NaN handling
- **Source**: code-reviewer F3, test-engineer F3, debugger F1
- **Files**: `src/app/api/v1/contests/[assignmentId]/anti-cheat/route.ts:148-149`
- **Plan**: Change `Number(...)` to `parseInt(..., 10) || defaultValue` for both `limit` and `offset`.
- **Status**: DONE (commit 88391c26)

### L3: Parallelize independent DB queries in `contest-analytics.ts`
- **Source**: perf-reviewer F3
- **Files**: `src/lib/assignments/contest-analytics.ts:92-292`
- **Plan**: Wrap independent queries (problems, firstAcMap, contestMeta, cheatRows) in `Promise.all`.
- **Status**: DONE (commit ab8fe63b)

### L4: Make anti-cheat heartbeat gap detection lazy
- **Source**: perf-reviewer F2
- **Files**: `src/app/api/v1/contests/[assignmentId]/anti-cheat/route.ts:189-198`
- **Plan**: Add `?includeGaps=true` query parameter; only run gap detection when explicitly requested.
- **Status**: TODO

### L5: Use `ROUND` in `computeSingleUserLiveRank` IOI rank query for tie consistency
- **Source**: verifier F1
- **Files**: `src/lib/assignments/leaderboard.ts:186-187`
- **Plan**: Change `us.total_score > t.total_score` to `ROUND(us.total_score, 2) > ROUND(t.total_score, 2)` in the IOI live rank query.
- **Status**: DONE (commit 71b2c3c1)

### L6: Add ICPC last-AC-time tiebreaker to live rank query
- **Source**: debugger F3
- **Files**: `src/lib/assignments/leaderboard.ts:106-146`
- **Plan**: Add the last AC time computation and tiebreaker logic to the ICPC branch. This is a low-priority refinement since the scenario (identical solved count and penalty) is rare.
- **Status**: TODO

### L7: Add comment explaining why `userId` is cleared for non-instructors in leaderboard API
- **Source**: architect F1
- **Files**: `src/app/api/v1/contests/[assignmentId]/leaderboard/route.ts:72`
- **Plan**: Add a code comment explaining the anonymity-by-default design decision.
- **Status**: DONE (commit 7c21c5ac)

### L8: Improve IOI cell dark mode contrast
- **Source**: designer F3
- **Files**: `src/components/contest/leaderboard-table.tsx:189-201`
- **Plan**: Increase dark mode text lightness from 65% to 70% for better contrast.
- **Status**: DONE (commit 559596bc)

### L9: Add audit log for anti-cheat PII access
- **Source**: security-reviewer F1
- **Files**: `src/app/api/v1/contests/[assignmentId]/anti-cheat/route.ts:157-174`
- **Plan**: Add an audit log entry when anti-cheat data with IP addresses is accessed. Document the data classification.
- **Status**: TODO

---

## Deferred Items (No Action This Cycle)

| Finding | Severity | Reason | Exit Criterion |
|---------|----------|--------|----------------|
| L6: ICPC last-AC-time tiebreaker | LOW | Rare edge case (identical solved+penalty); low user impact | User report of rank discrepancy in ICPC contest |
| L9: Anti-cheat PII audit log | LOW | Requires audit infrastructure; no current reports of misuse | Compliance requirement or user report |
| L10: Contest-scoring single-instance cache | LOW | Mitigated by short 30s TTL; Redis migration is a large architectural change | Performance reports of stale data across workers |
| L4: Anti-cheat lazy gap detection | LOW | Performance is acceptable for current scale; 5000 rows is bounded | Latency reports on anti-cheat endpoint |
