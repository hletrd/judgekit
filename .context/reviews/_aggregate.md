# RPF Cycle 48 — Aggregate Review

**Date:** 2026-04-23
**Base commit:** 6831c05e
**Review artifacts:** code-reviewer.md, perf-reviewer.md, security-reviewer.md, architect.md, critic.md, verifier.md, debugger.md, test-engineer.md, tracer.md, designer.md, document-specialist.md

## Deduped Findings (sorted by severity then signal)

### AGG-1: Judge claim route uses `Date.now()` for `claimCreatedAt` — clock-skew in stale claim detection [MEDIUM/MEDIUM]

**Flagged by:** code-reviewer (CR-1), perf-reviewer (PERF-1), security-reviewer (SEC-1), architect (ARCH-1), critic (CRI-1), verifier (V-1), debugger (DBG-1), test-engineer (TE-1), tracer (TR-1), document-specialist (DOC-1)
**Signal strength:** 10 of 11 review perspectives

**File:** `src/app/api/v1/judge/claim/route.ts:122`

**Description:** The judge claim route captures `const claimCreatedAt = Date.now()` and uses it in the SQL query `to_timestamp(@claimCreatedAt::double precision / 1000)` to set `judge_claimed_at`. The stale claim detection then uses `s.judge_claimed_at < NOW() - interval`, comparing the app-time-originated timestamp against DB `NOW()`. This is the same clock-skew class fixed in `realtime-coordination.ts` (cycle 46), `checkServerActionRateLimit` (cycle 47), `validateAssignmentSubmission` (cycle 45), and the assignment PATCH route (cycle 40).

**Concrete failure scenario (premature stale detection):** App clock 30 seconds behind DB. A worker claims a submission at app time 10:00:00 (DB time 10:00:30). `judge_claimed_at` is stored as 10:00:00. After 4m30s of DB time, `NOW()` = 10:05:00, and `10:00:00 < 10:05:00 - 5min` = `10:00:00 < 10:00:00` = false (barely not stale). After 4m31s, the claim is marked stale — 30 seconds earlier than intended. With larger clock drift, the window shrinks further. In extreme cases (e.g., NTP step correction), a freshly claimed submission could be immediately eligible for re-claim, causing duplicate judging (wasted container starts, compilation, execution).

**Fix:** Use `getDbNowUncached()` inside the transaction:
```typescript
const now = (await getDbNowUncached()).getTime();
const claimCreatedAt = now;
```

---

### AGG-2: `rateLimitedResponse` uses `Date.now()` for `X-RateLimit-Reset` header [LOW/LOW]

**Flagged by:** code-reviewer (CR-2), critic (CRI-2), verifier (V-3), debugger (DBG-2)
**Signal strength:** 4 of 11 review perspectives

**File:** `src/lib/security/api-rate-limit.ts:125`

**Description:** The `rateLimitedResponse` function computes the `X-RateLimit-Reset` header as `Math.ceil((Date.now() + windowMs) / 1000)`. Under clock skew, this gives clients an incorrect reset timestamp. The actual DB-stored `windowStartedAt + windowMs` may differ from `Date.now() + windowMs`. Not a functional bug since the DB check is authoritative, but undermines the API contract.

**Fix:** Use `getDbNowUncached()` or pass the DB-consistent timestamp from the caller.

---

### AGG-3: Practice page `resolvedSearchParams?.sort as SortOption` — unsafe type assertion (carry-over from cycle 47) [LOW/LOW]

**Flagged by:** code-reviewer (CR-3), critic (CRI-3)
**Signal strength:** 2 of 11 review perspectives

**File:** `src/app/(public)/practice/page.tsx:128-129`

**Description:** The code casts `resolvedSearchParams?.sort` as `SortOption` before the `includes` check validates it. The `includes` check does validate the runtime value, so this is safe in practice, but the type assertion is misleading.

**Fix:** Cosmetic — use a more type-safe approach.

---

### AGG-4: Anti-cheat privacy notice accessibility — keyboard focus verification needed [LOW/LOW]

**Flagged by:** designer (DES-3)
**Signal strength:** 1 of 11 review perspectives

**File:** `src/components/exam/anti-cheat-monitor.tsx:261`

**Description:** The privacy notice dialog prevents dismissal. The "Accept" button should receive initial focus and the focus trap should be confirmed via manual testing.

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

## Verified Fixes From Prior Cycles (All Still Intact)

All fixes from cycles 37-47 remain intact:
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
