# Cycle 49 Review Remediation Plan

**Date:** 2026-04-23
**Cycle:** 49/100
**Base commit:** b6daa282

## Findings to Address

### Lane 1: Add deterministic `userId` tie-breaker to ICPC leaderboard sort [LOW/MEDIUM]

**Source:** AGG-1 (10-agent consensus: CR-1, PERF-1, ARCH-1, CRI-1, V-1, DBG-1, TE-1, TR-1, DES-1, DOC-3)

**File:**
- `src/lib/assignments/contest-scoring.ts:346-357`

**Changes:**
1. In the ICPC sort comparator, after the last AC time comparison, add `|| a.userId.localeCompare(b.userId)` as a final tie-breaker, matching the IOI pattern on line 359
2. Add a comment explaining the tie-breaking strategy for maintainability

**Exit criteria:** ICPC leaderboard sort produces deterministic ordering for tied entries, consistent with the IOI sort pattern.

---

## Deferred Items (from this cycle's reviews)

| Finding | File+Line | Severity/Confidence | Reason for Deferral | Exit Criterion |
|---------|-----------|-------------------|--------------------|---------------|
| AGG-3 (cycle 48): Practice page unsafe type assertion | practice/page.tsx:128-129 | LOW/LOW | Type-safe by runtime validation; cosmetic carry-over | Module refactoring cycle |
| AGG-4 (cycle 48): Anti-cheat privacy notice accessibility | anti-cheat-monitor.tsx:261 | LOW/LOW | Requires manual keyboard testing; no code change identified yet | Manual a11y audit |

All prior deferred items from cycles 37-48 remain deferred as documented in `_aggregate.md`.

## Progress

- [x] Lane 1: ICPC leaderboard sort userId tie-breaker (commit 39dcd495)
