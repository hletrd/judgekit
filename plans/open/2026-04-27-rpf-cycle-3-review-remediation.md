# RPF Cycle 3 — Review Remediation Plan

**Date:** 2026-04-27
**Cycle:** 3/100 of review-plan-fix loop
**Source aggregate:** `.context/reviews/_aggregate.md`

## Status Legend
- `[ ]` — Not started
- `[~]` — In progress
- `[x]` — Done
- `[d]` — Deferred (with reason)

## Cycle 3 Summary

The cycle-3 review was a steady-state pass. Cycles 1–2 closed the high-impact analytics + cookie clearing surface; cycle 3 surfaces 1 MEDIUM and 2 LOW actionable items plus a handful of carried-deferred items. The plan below covers all converging actionable findings.

Key observation during planning: AGG3-2 (literal-value test for `getAuthSessionCookieNames`) was flagged by two reviewers (TE3-1, DBG3-4) but is **already covered** in `tests/unit/security/env.test.ts:415-419` (verified). Removed from the task list and noted as a resolved false-positive in the aggregate.

**Implementation status (2026-04-27):**
- Task A `[x]` commit `56dd6957` — `_lastRefreshFailureAt` bound via `lru-cache` `dispose` hook; new test added (suite 2217 → 2218).
- Task B `[x]` commit `d0751786` — 76 completed cycle plans archived from `plans/open/` to `plans/done/`; conflicting older cycle-28 duplicate moved to `plans/open/_archive/`; archival convention added to `plans/open/README.md`.
- Task C `[x]` commit `56dd6957` — inline comments added to `vi.runAllTimersAsync()` calls explaining microtask drain (shipped together with task A).

Gates: lint 0 errors, build green, full unit suite 2218/2218.

---

## Tasks

### Task A — [MEDIUM] Bound `_lastRefreshFailureAt` via `lru-cache` dispose hook (AGG3-1)

**Status:** `[x]` — done in commit `56dd6957`. Added `dispose` callback to `analyticsCache` LRUCache; added `__test_internals` named export for test-only access; added unit test "evicts cooldown metadata when the cache entry is removed (dispose hook)". Suite 2217 → 2218.
**Severity:** MEDIUM
**Reference:** `.context/reviews/_aggregate.md` AGG3-1, `.context/reviews/perf-reviewer.md` PERF3-2

**Problem:**
`src/app/api/v1/contests/[assignmentId]/analytics/route.ts:24` declares `const _lastRefreshFailureAt = new Map<string, number>()`. Entries are deleted explicitly on successful refresh (line 48) but never on LRU eviction or TTL expire of the cache entry they relate to. Long-running app servers seeing many distinct `assignmentId`s with refresh failures will leak memory slowly.

**Plan:**
1. Add a `dispose` callback to the `analyticsCache` `LRUCache` constructor in `src/app/api/v1/contests/[assignmentId]/analytics/route.ts:17`:
   ```ts
   const analyticsCache = new LRUCache<string, CacheEntry>({
     max: 100,
     ttl: CACHE_TTL_MS,
     dispose: (_value, key, _reason) => {
       _lastRefreshFailureAt.delete(key);
     },
   });
   ```
   This fires for every dispose reason (`evict`, `set`, `delete`, `expire`, `fetch`). Net effect: when the cache loses an entry for any reason, the corresponding cooldown metadata is cleaned. Even on `set` (which fires when the same key gets a fresh entry), this is fine because the new entry's success path either reasserts the cooldown metadata (failure) or is implicitly cleared (success).
2. Add a unit test asserting that, after `analyticsCache.delete(key)`, `_lastRefreshFailureAt.has(key) === false`. Place under `tests/unit/api/contests-analytics-route.test.ts`.
3. Update doc comment near `_lastRefreshFailureAt` declaration to note that it shares lifecycle with `analyticsCache` via the dispose hook.

**Exit criteria:**
- `analyticsCache` has a `dispose` callback that removes keys from `_lastRefreshFailureAt`.
- New unit test passes.
- All gates green (lint, build, test).
- Total unit-test count grows by 1.

**Commit:** `fix(analytics): 🐛 bound _lastRefreshFailureAt via lru-cache dispose hook`

---

### Task B — [LOW] Archive completed cycle plans from `plans/open/` to `plans/done/` and document convention (AGG3-3)

**Status:** `[x]` — done in commit `d0751786`. Moved 76 completed cycle plans via `git mv` (history preserved). Conflicting older cycle-28 plan moved to `plans/open/_archive/`. Added "RPF Per-Cycle Plan Convention" section to `plans/open/README.md`.
**Severity:** LOW
**Reference:** `.context/reviews/_aggregate.md` AGG3-3, `.context/reviews/critic.md` CRIT3-1, `.context/reviews/document-specialist.md` DOC3-2

**Problem:**
~70 plan files under `plans/open/` from cycles 1–55+ are fully implemented (all tasks `[x]`) but still in the open dir. Discoverability suffers and the open dir grows monotonically.

**Plan:**
1. Use a script-like loop to move every plan whose tasks are all `[x]` (no `[ ]` or `[~]`) from `plans/open/` to `plans/done/`. Cycle-1 and cycle-2 plans (`2026-04-26-rpf-cycle-1-review-remediation.md`, `2026-04-26-rpf-cycle-2-review-remediation.md`) are also fully done and should be moved.
2. Preserve the standing plan `plans/open/2026-04-19-workspace-to-public-migration.md` (still has open work).
3. Preserve the master backlog plans (`2026-04-14-master-review-backlog.md`, `2026-04-17-execution-roadmap.md`, `2026-04-17-full-review-plan-index.md`, `2026-04-18-comprehensive-review-remediation.md`).
4. Append a one-line convention to `plans/open/README.md`:
   > **Per-cycle convention:** Each RPF cycle archives the prior cycle's plan from `plans/open/` to `plans/done/` once all tasks are `[x]`. Standing/master plans (workspace migration, execution roadmap) stay in `open/`.

**Exit criteria:**
- `plans/open/` has only the workspace-migration plan, the master backlogs, and the cycle-3 plan itself.
- `plans/done/` gains the moved files.
- `plans/open/README.md` documents the convention.

**Commit:** `chore(plans): 🗂️ archive completed cycle plans + document archival convention` (single fine-grained commit; could also split into "archive" + "doc" if size warrants).

---

### Task C — [LOW] Add comment to cooldown test explaining `vi.runAllTimersAsync` microtask drain (AGG3-4)

**Status:** `[x]` — shipped together with task A (commit `56dd6957`). Comments added at all four `vi.runAllTimersAsync()` callsites in `tests/unit/api/contests-analytics-route.test.ts`.
**Severity:** LOW
**Reference:** `.context/reviews/_aggregate.md` AGG3-4, `.context/reviews/debugger.md` DBG3-2

**Problem:**
The cycle-2 test "respects cooldown — does not retry refresh within REFRESH_FAILURE_COOLDOWN_MS" relies on `await vi.runAllTimersAsync()` draining the detached `.catch` chain on the failed refresh. This pattern is correct in Vitest 4.x but isn't obvious to readers; a future contributor swapping it for `vi.runAllTimers()` (sync version) or removing it would silently break the assertion.

**Plan:**
1. Add a one-line comment near each `await vi.runAllTimersAsync()` call in `tests/unit/api/contests-analytics-route.test.ts` explaining: `// drains both timers and pending microtasks so the detached refresh's .catch chain runs`.
2. Run gates to confirm no test regressions.

**Exit criteria:**
- Comment present on the relevant `vi.runAllTimersAsync()` calls.
- Tests pass unchanged.

**Commit:** `docs(tests): 📝 explain vi.runAllTimersAsync microtask drain in analytics cooldown test`

---

## Deferred Items

| ID | Description | File:line | Severity | Confidence | Reason | Exit criterion |
|----|-------------|-----------|----------|------------|--------|----------------|
| AGG3-2 (resolved) | `getAuthSessionCookieNames` literal-value test | `tests/unit/security/env.test.ts:415-419` | — | HIGH | **Already exists.** Initially flagged by TE3-1/DBG3-4; verification during plan synthesis confirmed three tests covering literal values. No action. | N/A |
| AGG3-5 (cycle 3) | AGENTS.md vs `password.ts` policy mismatch | `AGENTS.md:516-521`, `src/lib/security/password.ts:45,50,59` | LOW | MEDIUM | **Quoted policy:** AGENTS.md says "Password validation MUST only check minimum length"; code does dictionary + similarity. Removing checks would weaken security; updating doc would change rule. Requires user/PM decision before any code or doc edit. | User decision on which side to reconcile. |
| AGG3-6 (cycle 3) | `__Secure-` cookie clear over HTTP no-op | `src/proxy.ts:94` | LOW | MEDIUM | Dev-only nuisance; production HTTPS-only via TLS. Conditional `secure` would add code without prod value. | Reopen if a developer reports stuck `__Secure-` cookie in dev. |
| AGG3-7 (cycle 3) | Anti-cheat retry/backoff lacks direct timing tests | `src/components/exam/anti-cheat-monitor.tsx` | LOW | LOW | Component-level testing of timing-based hooks requires `vi.useFakeTimers` + `apiFetch` mock + simulated `localStorage`; non-trivial setup. | Pick up in a dedicated testing-focused cycle. |
| AGG3-8 (cycle 3) | Privacy notice has no decline path | `src/components/exam/anti-cheat-monitor.tsx:307-332` | LOW | LOW | UX judgment call; current flow assumes exam staff already authorized monitoring. | Reopen with explicit UX direction (e.g., "show decline button that exits to dashboard"). |
| AGG3-9 (cycle 3) | Anti-cheat at 336 lines borders single-component complexity | `src/components/exam/anti-cheat-monitor.tsx` | LOW | MEDIUM | Refactor would touch many lines for no behavioral change; risk-vs-reward unfavorable in tight cycle. | Reopen when adding a feature that pushes file past 400 lines. |
| AGG3-10 (cycle 3) | Various cosmetic/optional items (`_refreshingKeys` underscore convention, `getAuthSessionCookieNames` per-call allocation, `Date.now()` for `createdAt` to drop per-refresh DB call, `any` type in test mock signature, `user.id` in refresh-error log, dedup test extension to assert cache update, `refreshAnalyticsCacheInBackground` doc addition) | various | LOW | various | Each is cosmetic or marginal optimization. None block correctness, security, or perf today. | Pick up opportunistically. |
| AGG-10 (cycle 2 → carried) | Anti-cheat online event can race with retry timer | `src/components/exam/anti-cheat-monitor.tsx:280` | LOW | LOW | Server is idempotent; duplicate POST wastes a request but produces no incorrect state. | Reopen if duplicate anti-cheat events appear in audit logs. |
| AGG-4 (cycle 1 → carried) | Anti-cheat retry timer holds stale closure across `assignmentId` change | `src/components/exam/anti-cheat-monitor.tsx:138-141` | MEDIUM | MEDIUM | `assignmentId` doesn't change in component lifetime today; component is keyed on it. | Reopen if a future caller passes `assignmentId` as a changing prop. |
| DEFER-22..57 | Carried from cycles 38–48 | various | LOW–MEDIUM | various | See `.context/reviews/_aggregate-cycle-48.md`. | Each item has its own deferral rationale tracked. |

**Repo policy compliance:** All deferred items respect:
- CLAUDE.md: no destructive deferrals; security-relevant items (AGG3-5) explicitly call out the policy ambiguity per repo rule.
- AGENTS.md: deferral notes do not contradict GPG signing, conventional commits, or required language versions.
- No security or correctness items deferred without explicit repo-policy quote (AGG3-5 quotes AGENTS.md:516-521).

---

## Workspace-to-Public Migration Note (long-term directive)

The user-injected directive at `user-injected/workspace-to-public-migration.md` requests incremental migration of dashboard-only pages to the public top navbar where appropriate. **Cycle 3 review surfaced no findings related to that migration**, so no migration task is added to this cycle. The standing plan at `plans/open/2026-04-19-workspace-to-public-migration.md` continues to track that work. Reopen if a future cycle's review highlights a candidate page.

---

## Cycle Gate Plan

After each task above commits, run:
1. `npm run lint` — must be clean (errors blocking).
2. `npm run build` — must succeed.
3. `npm run test:unit` — all unit tests must pass.

If any gate fails, fix root cause before moving on. No suppressions.

After all tasks land, run the deploy command per orchestrator `DEPLOY_MODE: per-cycle`:
```bash
bash -c 'set -a; source .env.deploy.algo; set +a; ./deploy-docker.sh'
```
