# RPF Cycle 43 — Aggregate Review

**Date:** 2026-04-23
**Base commit:** b0d843e7
**Review artifacts:** code-reviewer.md, perf-reviewer.md, security-reviewer.md, architect.md, critic.md, verifier.md, debugger.md, test-engineer.md, tracer.md, designer.md, document-specialist.md

## Deduped Findings (sorted by severity then signal)

### AGG-1: Submission rate-limit `oneMinuteAgo` uses `Date.now()` instead of DB time — clock-skew inconsistency [MEDIUM/MEDIUM]

**Flagged by:** code-reviewer (CR-1), security-reviewer (SEC-1), architect (ARCH-1), critic (CRI-1), verifier (V-1), debugger (DBG-1), test-engineer (TE-1), tracer (TR-1), document-specialist (DOC-1)
**Signal strength:** 9 of 11 review perspectives

**File:** `src/app/api/v1/submissions/route.ts:249,257,318`

**Description:** The submission creation route computes `oneMinuteAgo = new Date(Date.now() - 60_000)` using the app server's clock at line 249, then compares it against `submissions.submittedAt` (a DB-stored timestamp set via `getDbNowUncached()` at line 318) in the SQL query at line 257. The codebase has consistently converged on using `getDbNowUncached()` for all schedule comparisons involving DB data to avoid clock skew. This is the last remaining place that uses `Date.now()` for a comparison against DB-stored timestamps.

**Concrete failure scenario:** App server clock is 30 seconds behind DB server clock. The `oneMinuteAgo` threshold is computed as 90 seconds ago in DB time. A user can submit 50% more than the intended rate limit per minute. Conversely, if the app server clock is ahead, users are rate-limited too aggressively.

**Fix:** Replace `Date.now()` with `getDbNowUncached()` for the rate-limit window computation:
```typescript
const dbNow = await getDbNowUncached();
const oneMinuteAgo = new Date(dbNow.getTime() - 60_000);
```
Reuse `dbNow` for the `submittedAt` insert at line 318 (currently calls `getDbNowUncached()` separately, so this also eliminates one DB round-trip).

---

### AGG-2: Contest join route lacks explicit `auth: true` — relies on handler factory default [LOW/LOW]

**Flagged by:** code-reviewer (CR-2), test-engineer (TE-2)
**Signal strength:** 2 of 11 review perspectives

**File:** `src/app/api/v1/contests/join/route.ts:9-11`

**Description:** The contest join route uses `createApiHandler({ rateLimit: ..., schema: ..., handler: ... })` without explicitly setting `auth: true`. The factory defaults `auth` to `true`, so the behavior is correct, but most routes explicitly declare their auth config for clarity and auditability.

**Fix:** Add `auth: true` for explicit clarity.

---

## Carry-Over Items (Still Unfixed from Prior Cycles)

- **Prior AGG-2:** Audit logs LIKE-based JSON search (deferred, LOW/LOW)
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

## Verified Fixes This Cycle (From Prior Cycles)

All fixes from cycles 37-42 remain intact:
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

## Deferred Items

| Finding | File+Line | Severity/Confidence | Reason for Deferral | Exit Criterion |
|---------|-----------|-------------------|--------------------|---------------|
| AGG-2: Contest join lacks explicit auth:true | contests/join/route.ts:9 | LOW/LOW | Works correctly via default; cosmetic | Auth audit cycle |
| Prior AGG-2: Audit logs LIKE-based JSON search | audit-logs/page.tsx:150 | LOW/LOW | Works today; robustness improvement | JSON serialization changes or PostgreSQL upgrade |
| Prior PERF-3: Anti-cheat heartbeat gap query transfers up to 5000 rows | anti-cheat/route.ts:195-204 | MEDIUM/MEDIUM | Could use SQL window function; currently bounded by limit | Long contest with many heartbeats causes slow API response |
| Prior AGG-5: Console.error in client components | discussions/*.tsx, groups/*.tsx | LOW/MEDIUM | Requires architectural decision; no data loss | Client error reporting feature request |
| Prior AGG-6: SSE O(n) eviction scan | events/route.ts:44-55 | LOW/LOW | Bounded by 1000-entry cap | Performance profiling shows bottleneck |
| Prior AGG-7: Manual routes duplicate createApiHandler | migrate/import, restore routes | MEDIUM/MEDIUM | Requires extending createApiHandler to support multipart | Next API framework iteration |
| Prior AGG-8: Global timer HMR pattern duplication | 4 modules | LOW/MEDIUM | DRY concern; each module works correctly | Module refactoring cycle |
| Prior SEC-3: Anti-cheat copies text content | anti-cheat-monitor.tsx:206 | LOW/LOW | 80-char limit; privacy notice accepted | Privacy audit or user complaint |
| Prior SEC-4: Docker build error leaks paths | docker/client.ts:169 | LOW/LOW | Admin-only; Docker output expected | Admin permission review |
| Prior DOC-1: SSE route ADR | events/route.ts | LOW/LOW | Documentation-only | Next documentation cycle |
| Prior DOC-2: Docker client dual-path docs | docker/client.ts | LOW/LOW | Documentation-only | Next documentation cycle |
| Prior ARCH-2: Stale-while-revalidate cache pattern duplication | contest-scoring.ts, analytics/route.ts | LOW/LOW | DRY concern; both modules work correctly | Module refactoring cycle |
| Prior DES-1: Chat widget button badge lacks ARIA announcement | chat-widget.tsx:284-288 | LOW/LOW | Screen reader edge case; badge is visual-only | Accessibility audit or user complaint |
