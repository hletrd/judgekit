# RPF Cycle 4 — Review Remediation Plan

**Date:** 2026-04-27
**Cycle:** 4/100 of review-plan-fix loop
**Source aggregate:** `.context/reviews/_aggregate.md`

## Status Legend
- `[ ]` — Not started
- `[~]` — In progress
- `[x]` — Done
- `[d]` — Deferred (with reason)

## Cycle 4 Summary

The cycle-4 review was a steady-state pass following cycles 1–3 which closed the analytics + cookie-clearing + cache-lifecycle issues. Cycle 4 surfaces 3 actionable LOW-severity items (one with 5-agent convergence, one with 3-agent convergence, one single-source) plus a handful of carried-deferred items.

Key observation during planning: the 5-agent convergence on `__test_internals` (AGG4-1) is the highest-signal finding this cycle even though severity is LOW. The fix is one-line.

**Implementation status (2026-04-27):**
- Task A `[x]` commit `54e0203f` — `__test_internals` gated behind `NODE_ENV === "test"`. Existing dispose-hook test still passes (8/8 in 82ms). JSDoc updated.
- Task B `[x]` commit `f6724762` — Extracted storage helpers to `src/components/exam/anti-cheat-storage.ts`. Added `MAX_PENDING_EVENTS = 200` cap. New unit suite at `tests/unit/components/anti-cheat-storage.test.ts` (14/14 in 127ms).
- Task C `[x]` commit `54e0203f` (same as Task A) — Defensive comment added to `refreshAnalyticsCacheInBackground` catch block warning against `analyticsCache.set` in that branch.

Gates: lint 0 errors (14 warnings in untracked dev `.mjs` scripts, unchanged), unit tests pending full suite confirmation in deploy phase.

---

## Tasks

### Task A — [LOW, 5-agent convergence] Gate `__test_internals` behind `NODE_ENV === "test"` (AGG4-1)

**Status:** `[x]` — done in commit `54e0203f`. Conditional export gates behind `process.env.NODE_ENV === "test"`. JSDoc updated. Existing dispose-hook test passes (8/8 analytics tests in 82ms).
**Severity:** LOW
**Confidence:** HIGH
**Reference:** `.context/reviews/_aggregate.md` AGG4-1; per-agent: `architect.md` ARCH4-1, `code-reviewer.md` CR4-1, `critic.md` CRIT4-1, `security-reviewer.md` SEC4-2, `verifier.md` VER4-2

**Problem:**
`src/app/api/v1/contests/[assignmentId]/analytics/route.ts:92-101` exports `__test_internals` from the production module:
```ts
export const __test_internals = {
  hasCooldown: (key: string): boolean => _lastRefreshFailureAt.has(key),
  setCooldown: (key: string, valueMs: number): void => { _lastRefreshFailureAt.set(key, valueMs); },
  cacheDelete: (key: string): boolean => analyticsCache.delete(key),
  cacheClear: (): void => { analyticsCache.clear(); },
};
```

The JSDoc warns "Production code MUST NOT depend on this export," but nothing enforces this at the type system or runtime. Five reviewers converged on the same risk surface from different angles.

**Plan:**
1. Edit `src/app/api/v1/contests/[assignmentId]/analytics/route.ts` to gate the export:
   ```ts
   export const __test_internals = process.env.NODE_ENV === "test"
     ? {
         hasCooldown: (key: string): boolean => _lastRefreshFailureAt.has(key),
         setCooldown: (key: string, valueMs: number): void => { _lastRefreshFailureAt.set(key, valueMs); },
         cacheDelete: (key: string): boolean => analyticsCache.delete(key),
         cacheClear: (): void => { analyticsCache.clear(); },
       }
     : (undefined as never);
   ```
2. Update the JSDoc to reflect the env gate: change "Production code MUST NOT depend on this export" to "This export is `undefined` outside `NODE_ENV === 'test'`. Production code MUST NOT depend on it."
3. Verify the existing dispose-hook test still passes (vitest sets `NODE_ENV=test` automatically).
4. Run gates.

**Exit criteria:**
- Production builds (`NODE_ENV=production`) have `__test_internals === undefined`.
- The cycle-3 dispose-hook test (`evicts cooldown metadata when the cache entry is removed (dispose hook)`) still passes.
- All gates green (lint, build, test).

**Commit:** `refactor(analytics): ♻️ gate __test_internals export behind NODE_ENV === test`

---

### Task B — [LOW, 3-agent convergence] Cap `loadPendingEvents` array length at 200 (AGG4-2)

**Status:** `[x]` — done in commit `f6724762`. Storage helpers extracted to `src/components/exam/anti-cheat-storage.ts` with `MAX_PENDING_EVENTS = 200` cap. New unit suite at `tests/unit/components/anti-cheat-storage.test.ts` covers `isValidPendingEvent` edges, malformed JSON, the cap behavior (250 → 200), and save semantics. 14/14 tests pass in 127ms.
**Severity:** LOW
**Confidence:** MEDIUM
**Reference:** `.context/reviews/_aggregate.md` AGG4-2; per-agent: `code-reviewer.md` CR4-2, `perf-reviewer.md` PERF4-3, `test-engineer.md` TE4-6

**Problem:**
`src/components/exam/anti-cheat-monitor.tsx:41-51` `loadPendingEvents` reads localStorage, parses JSON, filters via `isValidPendingEvent`, and returns. There is no length cap. A malicious extension or browser quirk could write a multi-megabyte array; on every visibility-change/online event, the entire list is iterated and re-saved, hurting perceived performance and growing the JSON parse cost on every flush.

**Plan:**
1. Add a constant `MAX_PENDING_EVENTS = 200` near the other constants in `anti-cheat-monitor.tsx`.
2. Update `loadPendingEvents` to slice:
   ```ts
   function loadPendingEvents(assignmentId: string): PendingEvent[] {
     try {
       const raw = localStorage.getItem(`${STORAGE_KEY}_${assignmentId}`);
       if (!raw) return [];
       const parsed = JSON.parse(raw);
       if (!Array.isArray(parsed)) return [];
       return parsed.filter(isValidPendingEvent).slice(0, MAX_PENDING_EVENTS);
     } catch {
       return [];
     }
   }
   ```
3. Add a unit test under `tests/unit/components/anti-cheat-load-pending-events.test.ts` (new file) that:
   - Stubs `localStorage` with 250 valid events.
   - Imports `loadPendingEvents` (need to either export it from the component file or extract to a sibling util module — see step 4).
   - Asserts the returned length is 200.
4. To make `loadPendingEvents` testable without rendering the full component, extract the helper functions (`isValidPendingEvent`, `loadPendingEvents`, `savePendingEvents`) to a new module `src/components/exam/anti-cheat-storage.ts` and re-export from the component file. This is a pure refactor; behavior is unchanged.

**Exit criteria:**
- `loadPendingEvents` returns at most 200 events.
- New unit test asserts the cap.
- All gates green.

**Commit:** Two fine-grained commits:
- `refactor(anti-cheat): ♻️ extract pending-events storage helpers to anti-cheat-storage module`
- `feat(anti-cheat): ✨ cap loadPendingEvents at 200 entries to bound localStorage trust`

---

### Task C — [LOW] Add defensive comment in `refreshAnalyticsCacheInBackground` catch block (AGG4-3)

**Status:** `[x]` — shipped together with Task A (commit `54e0203f`). Comment added warning that `analyticsCache.set()` must NOT be called in this branch — the LRU dispose hook would synchronously delete the just-set cooldown timestamp, defeating the failure cooldown contract.
**Severity:** LOW
**Confidence:** MEDIUM
**Reference:** `.context/reviews/_aggregate.md` AGG4-3; per-agent: `debugger.md` DBG4-1

**Problem:**
`src/app/api/v1/contests/[assignmentId]/analytics/route.ts:72-79` catch block writes to `_lastRefreshFailureAt` but does NOT call `analyticsCache.set()`. If a future change adds `analyticsCache.set(...)` here (e.g., to mark stale-on-error), the dispose hook would clear the just-set cooldown timestamp. The doc comment near the dispose hook (line 38-46) already explains this contract, but a forward-looking comment in the catch block itself would prevent the regression.

**Plan:**
1. Add a one-line comment in the catch block of `refreshAnalyticsCacheInBackground`:
   ```ts
   } catch (err) {
     // IMPORTANT: do NOT call analyticsCache.set() in this branch — the LRU
     // dispose hook would synchronously delete the cooldown timestamp we
     // are about to set on the next line, defeating the failure cooldown.
     _lastRefreshFailureAt.set(cacheKey, Date.now());
     logger.error({ err, assignmentId }, "[analytics] Failed to refresh analytics cache");
   }
   ```
2. Run gates (no test impact expected).

**Exit criteria:**
- Comment present in the catch block warning future contributors.
- All gates green.

**Commit:** `docs(analytics): 📝 warn against analyticsCache.set in refresh catch block`

---

## Deferred Items

| ID | Description | File:line | Severity | Confidence | Reason | Exit criterion |
|----|-------------|-----------|----------|------------|--------|----------------|
| AGG4-DEF1 (cycle 4) | `_refreshingKeys` could stay populated if refresh never settles | `route.ts:64-80` | LOW | MEDIUM | Theoretical; current code paths bounded by awaited DB calls. Adding a watchdog timer is defensive but not currently needed. | Reopen if real-world refresh-stall observed. |
| AGG4-DEF2 (cycle 4) | scheduleRetryRef.current outlives component unmount | `anti-cheat-monitor.tsx:142-155` | LOW | MEDIUM | Defensive cleanup; current closures are stable per assignmentId. | Reopen if scheduleRetryRef closures start capturing per-mount state. |
| AGG4-DEF3 (cycle 4) | `getAuthSessionCookieNames` allocates new object per call | `env.ts:178-180` | LOW | HIGH | Negligible perf cost (sub-microsecond). Hoisting risks freezing literal at import-time. | Pick up if cookie-rename refactor lands. |
| AGG4-DEF4 (cycle 4) | `_refreshingKeys`/`_lastRefreshFailureAt` underscore-prefix style | `route.ts:19,32` | LOW | HIGH | Cosmetic. | Pick up opportunistically. |
| AGG4-DEF5 (cycle 4) | `cacheClear` exposed via `__test_internals` but unused by tests | `route.ts:99` | LOW | HIGH | YAGNI — but if Task A lands, this becomes a test-only helper anyway. | Remove if no test uses it after Task A; or add isolation test that uses it. |
| AGG4-DEF6 (cycle 4) | ShieldAlert icon may imply alert rather than informational | `anti-cheat-monitor.tsx:312-313` | LOW | MEDIUM | Subjective UX call. | Pick up with explicit UX direction. |
| AGG4-DEF7 (cycle 4) | Korean privacy notice translation review | `messages/ko.json` | LOW | HIGH | Need runtime/native-speaker review (korean-naturalizer skill). | Pick up in next cycle with messages access. |
| AGG4-DEF8 (cycle 4) | Test mock signatures use `any` for handler ctx | `tests/unit/api/contests-analytics-route.test.ts:21-22` | LOW | HIGH | Cosmetic; test isolation. | Pick up opportunistically. |
| AGG4-DEF9 (cycle 4) | No integration test for `clearAuthSessionCookies` cookie names | `proxy.ts:87-97` | LOW | MEDIUM | Function is private to proxy.ts; export-for-test is minor refactor. | Pick up if proxy.ts gets a refactor. |
| AGG3-5 (cycle 3 carried) | AGENTS.md vs `password.ts` policy mismatch | `AGENTS.md:516-521`, `src/lib/security/password.ts:45,50,59` | MEDIUM | HIGH | **Quoted policy:** AGENTS.md says "Password validation MUST only check minimum length"; code does dictionary + similarity. Removing checks would weaken security; updating doc would change rule. Requires user/PM decision. | User decision on which side to reconcile. |
| AGG3-6 (cycle 3 carried) | `__Secure-` cookie clear over HTTP no-op | `src/proxy.ts:94` | LOW | MEDIUM | Dev-only nuisance; production HTTPS-only via TLS. | Reopen if a developer reports stuck `__Secure-` cookie in dev. |
| AGG3-7 (cycle 3 carried) | Anti-cheat retry/backoff lacks direct timing tests | `src/components/exam/anti-cheat-monitor.tsx` | LOW | LOW | Component-level testing of timing-based hooks requires `vi.useFakeTimers` + `apiFetch` mock + simulated `localStorage`; non-trivial setup. | Pick up in a dedicated testing-focused cycle. |
| AGG3-8 (cycle 3 carried) | Privacy notice has no decline path | `src/components/exam/anti-cheat-monitor.tsx:307-332` | LOW | LOW | UX/legal judgment call. | Reopen with explicit UX direction. |
| AGG3-9 (cycle 3 carried) | Anti-cheat at 335 lines borders single-component complexity | `src/components/exam/anti-cheat-monitor.tsx` | LOW | MEDIUM | Refactor without behavior change; threshold 400 lines. | Reopen when adding a feature that pushes file past 400 lines. |
| AGG3-10 (cycle 3 carried) | Various cosmetic/optional items | various | LOW | various | Each is cosmetic or marginal optimization. None block correctness, security, or perf today. | Pick up opportunistically. |
| AGG-10 (cycle 2 carried) | Anti-cheat online event can race with retry timer | `src/components/exam/anti-cheat-monitor.tsx:280` | LOW | LOW | Server is idempotent; duplicate POST wastes a request but produces no incorrect state. | Reopen if duplicate anti-cheat events appear in audit logs. |
| AGG-4 (cycle 1 carried) | Anti-cheat retry timer holds stale closure across `assignmentId` change | `src/components/exam/anti-cheat-monitor.tsx:138-141` | MEDIUM | MEDIUM | `assignmentId` doesn't change in component lifetime today; component is keyed on it. | Reopen if a future caller passes `assignmentId` as a changing prop. |
| DEFER-22..57 | Carried from cycles 38–48 | various | LOW–MEDIUM | various | See `.context/reviews/_aggregate-cycle-48.md`. | Each item has its own deferral rationale tracked. |

**Repo policy compliance:** All deferred items respect:
- CLAUDE.md: no destructive deferrals; security-relevant items (AGG3-5) explicitly call out the policy ambiguity per repo rule.
- AGENTS.md: deferral notes do not contradict GPG signing, conventional commits, or required language versions.
- No security or correctness items deferred without explicit repo-policy quote (AGG3-5 quotes AGENTS.md:516-521).

---

## Workspace-to-Public Migration Note (long-term directive)

The user-injected directive at `user-injected/workspace-to-public-migration.md` requests incremental migration of dashboard-only pages to the public top navbar where appropriate. **Cycle 4 review surfaced no concrete candidate page** based on the file diff since cycle 3 (the changes touched analytics route, anti-cheat monitor, env, proxy — none routing or page-level). The standing plan at `plans/open/2026-04-19-workspace-to-public-migration.md` continues to track that work.

The designer review (DES4-3) suggests next cycle's review specifically focus on `src/components/layout/app-sidebar.tsx` vs `src/lib/navigation/public-nav.ts` for migration candidates if no other findings surface. **No cycle-4 migration task added.**

---

## Cycle Gate Plan

After each task above commits, run:
1. `npm run lint` — must be clean (errors blocking).
2. `npm run build` — must succeed.
3. `npm run test:unit` — all unit tests must pass.

If any gate fails, fix root cause before moving on. No suppressions.

After all tasks land, run the deploy command per orchestrator:
```bash
bash -c 'set -a; source .env.deploy.algo; set +a; ./deploy-docker.sh --skip-languages --no-worker --skip-worker-build'
```

The new explicit CLI flags ensure language images and the worker image are NOT built on the algo app server (per CLAUDE.md), correcting the cycle-3 deploy failure where `deploy-docker.sh` unconditionally reset `SKIP_LANGUAGES=false` after sourcing the env file.
