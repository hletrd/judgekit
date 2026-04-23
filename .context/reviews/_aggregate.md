# RPF Cycle 49 — Aggregate Review

**Date:** 2026-04-23
**Base commit:** b6daa282
**Review artifacts:** code-reviewer, perf-reviewer, security-reviewer, architect, critic, verifier, debugger, test-engineer, tracer, designer, document-specialist

## Deduped Findings (sorted by severity then signal)

### AGG-1: ICPC leaderboard sort lacks deterministic `userId` tie-breaker [LOW/MEDIUM]

**Flagged by:** code-reviewer (CR-1), perf-reviewer (PERF-1), architect (ARCH-1), critic (CRI-1), verifier (V-1), debugger (DBG-1), test-engineer (TE-1), tracer (TR-1), designer (DES-1), document-specialist (DOC-3)
**Signal strength:** 10 of 11 review perspectives

**File:** `src/lib/assignments/contest-scoring.ts:346-357`

**Description:** The IOI leaderboard sort (line 359) includes `|| a.userId.localeCompare(b.userId)` as a final deterministic tie-breaker, added in cycle 46. The ICPC sort (lines 346-357) compares solved count, penalty, and last AC time but has no such tie-breaker. When two users have identical values on all three criteria, the sort comparator returns 0, leaving the relative order implementation-defined by the JavaScript engine.

**Concrete failure scenario:** Two students each solve 3 problems with 200 penalty minutes and last AC at 10:30:00. The sort comparator returns 0. Between page loads, Alice and Bob may swap positions on the leaderboard, causing visual flicker.

**Fix:** Add `|| a.userId.localeCompare(b.userId)` as the final tie-breaker in the ICPC sort, matching the IOI pattern from cycle 46.

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
- **Prior DES-1 (cycle 46):** Contests page badge hardcoded colors (deferred, LOW/LOW)
- **Prior DOC-1:** SSE route ADR (deferred, LOW/LOW)
- **Prior DOC-2:** Docker client dual-path docs (deferred, LOW/LOW)
- **Prior ARCH-2:** Stale-while-revalidate cache pattern duplication (deferred, LOW/LOW)
- **Prior SEC-2 (from cycle 43):** Anti-cheat heartbeat dedup uses Date.now() for LRU cache (deferred, LOW/LOW)
- **Prior AGG-2 (from cycle 45):** `atomicConsumeRateLimit` uses Date.now() in hot path (deferred, MEDIUM/MEDIUM)
- **Prior AGG-3 (from cycle 48):** Practice page unsafe type assertion (deferred, LOW/LOW)
- **Prior AGG-4 (from cycle 48):** Anti-cheat privacy notice accessibility (deferred, LOW/LOW)

## Verified Fixes From Prior Cycles (All Still Intact)

All fixes from cycles 37-48 remain intact:
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
15. `checkServerActionRateLimit` uses `getDbNowUncached()` (cycle 47)
16. Last remaining `Map.get()!` replaced with null guard (cycle 47)
17. Deterministic tie-breaking in IOI leaderboard sort (cycle 46)
18. Remaining non-null assertions replaced with null guards (cycle 46)
19. `Map.get()` non-null assertions replaced with null guards (cycle 46)
20. DB time for SSE coordination (cycle 46)
21. Judge claim route uses DB time (cycle 48)
22. rateLimitedResponse X-RateLimit-Reset uses DB-consistent time (cycle 48)
