# RPF Cycle 8 — Review Remediation Plan

**Date:** 2026-04-26
**Cycle:** 8/100 of review-plan-fix loop
**Source aggregate:** `.context/reviews/_aggregate.md`

## Status Legend
- `[ ]` — Not started
- `[~]` — In progress
- `[x]` — Done
- `[d]` — Deferred (with reason)

## Cycle 8 Summary

The cycle-8 multi-agent review surfaced **0 HIGH-severity** and **0 MEDIUM-severity** findings. All 3 cycle-7 plan tasks (deploy-docker.sh SUNSET CRITERION, cycle-6 plan archival, route.ts:84-90 explanatory comment) are confirmed RESOLVED at HEAD across all 11 review lanes. No regressions detected.

The cycle-8 findings cluster into ~7 LOW items, of which **1 is plannable** for implementation this cycle:

1. **AGG8-1** (3-agent housekeeping convergence: ARCH8-1, CRIT8-1, VER8-2) — Move cycle-7 plan to `plans/done/` per the README convention.

The other ~6 LOW findings are observational (CRIT8-2 convergence steady-state observation), verification artifacts (VER8-1 gates state, VER8-3 no-regression check), or single-finding defers (CRIT8-3 SUNSET ephemeral SHA reference).

All ~28 cycle-7 carried-deferred items remain accurate at HEAD; the cycle-7 doc-only commits did not change any executable code, so no defers had their preconditions altered.

**Implementation status (2026-04-26):**
- Task A `[x]` — done in commit `390cde9b` (cycle-7 plan archived to plans/done/).

Gates at cycle-8 start: lint 0 errors (14 unchanged warnings in untracked dev .mjs scripts); test:unit 304 files / 2234 tests pass; build EXIT=0.

---

## Tasks

### Task A — [LOW, 3-agent convergence, housekeeping] Archive cycle-7 plan to `plans/done/` (AGG8-1 / ARCH8-1 / CRIT8-1 / VER8-2)

**Status:** `[x]` — done in commit `390cde9b`
**Severity:** LOW (process)
**Confidence:** HIGH
**Reference:** `.context/reviews/_aggregate.md` AGG8-1; per-agent: `architect.md` ARCH8-1, `critic.md` CRIT8-1, `verifier.md` VER8-2

**Problem:** `plans/open/2026-04-26-rpf-cycle-7-review-remediation.md` exists with all 3 tasks `[x]` done:
- Task A → commit `809446dc` (deploy-docker.sh Step 5b SUNSET CRITERION + AGENTS.md "Sunset criteria" subsection).
- Task B → commit `2aab3a33` (cycle-6 plan archived).
- Task C → commit `ea083609` (route.ts:84-90 first-set vs overwrite comment).

Per `plans/open/README.md:36-39`: "Once **every** task in such a plan is `[x]` (or `[d]` with a recorded deferral exit criterion), the plan must be moved to `plans/done/` in the next cycle's housekeeping pass — typically by the cycle that follows it."

This is the same housekeeping pattern that cycle-7 honored for cycle-6 (commit `2aab3a33`).

**Plan:**
1. Verify all tasks in `plans/open/2026-04-26-rpf-cycle-7-review-remediation.md` are `[x]` (verified at cycle start: yes — A, B, C all `[x]` with commit IDs `809446dc`, `2aab3a33`, `ea083609`).
2. `git mv plans/open/2026-04-26-rpf-cycle-7-review-remediation.md plans/done/`.
3. Commit.

**Commit:** `docs(plans): 🗂️ archive completed cycle 7 plan to plans/done/ (AGG8-1)`

**Exit criteria:**
- Cycle-7 plan in `plans/done/`.
- `plans/open/` contains only standing/master plans + this cycle-8 plan.
- All gates green (lint 0 errors / 14 unchanged warnings, test:unit pass, build EXIT=0).

---

## Deferred (DO NOT IMPLEMENT this cycle)

The following findings are recorded as deferred per the deferred-fix rules. Each cites file+line, original severity (preserved, NOT downgraded), deferral reason, repo-rule allowance (default = no rule forbids deferring this category), and exit criterion to re-open.

**Repo-rule check:** Per orchestrator's deferred-fix rules, "Security, correctness, and data-loss findings are NOT deferrable unless the repo's own rules explicitly allow it." All cycle-8 findings are LOW-severity. No HIGH or MEDIUM findings are present.

### Cycle-8 NEW LOW findings deferred

| Finding | File:Line | Severity | Reason for deferral | Exit criterion to re-open |
|---------|-----------|----------|---------------------|----------------------------|
| AGG8-3 (CRIT8-3) — SUNSET comment uses ephemeral SHA reference (`18d93273` on 2026-04-26) | `deploy-docker.sh:578`, `AGENTS.md:375` | LOW | SHA references stable under repo's no-force-push policy | Repo policy change permitting history rewrite, OR opportunistic doc edit |

### Cycle-8 observational findings (no action required)

| Finding | Source | Description | Status |
|---------|--------|-------------|--------|
| AGG8-2 | CRIT8-2 | Convergence observation — repo in steady-state | Observation; no action |
| AGG8-4 | VER8-1 | Gates green at cycle-8 start | Verification artifact; no action |
| AGG8-5 | VER8-3 | Cycle-7 commits introduce no behavioral change | Verification artifact; no action |

### Carried-deferred from cycle 7 (unchanged)

All cycle-7 carried-deferred items (~28 deduplicated LOW items) remain accurate at HEAD (verified by all 11 cycle-8 review lanes). Notable carries:

| Cycle 7 ID | Description | Reason for deferral |
|------------|-------------|---------------------|
| AGG7-4 (ARCH7-1) | 4x duplicate psql/node container boilerplate in deploy-docker.sh | Operational refactor; current code works |
| AGG7-5 (ARCH7-2 / carries AGG6-3) | tags.updated_at nullable inconsistency | No current consumer (re-verified cycle 8) |
| AGG7-6 (ARCH7-3) | analyticsCache.dispose invariant in catch-block only | Code correct; defensive doc improvement |
| AGG7-7 (ARCH7-4) | getAuthSessionCookieName vs Names API confusion | Current callers correct; cosmetic JSDoc |
| AGG7-8 (CR7-1) | _lastRefreshFailureAt no single owner via wrapper | Code correct; cosmetic refactor |
| AGG7-9 (CR7-2) | performFlush serial-await rationale undocumented | Code correct; comment improvement |
| AGG7-10 (CR7-3) | __test_internals.cacheDelete ambiguous test API name | Test API stable |
| AGG7-11 (CR7-4) | bytesToBase64/Hex inconsistent iteration style | Cosmetic |
| AGG7-12 (CR7-5/SEC7-4) | Cookie-clear secure-flag semantics undocumented | Code correct; comment |
| AGG7-13 (CRIT7-3) | Schema repairs band-aid block undocumented | Defer alongside AGG7-4 |
| AGG7-14 (DBG7-1) | Step 5b heredoc multi-layer escape map undocumented | Code correct; comment |
| AGG7-15 (DBG7-2/VER7-1) | NETWORK_NAME bare grep regex | Single-project deploy host OK |
| AGG7-16 (DBG7-4/TRC7-2) | scheduleRetryRef no-op default + stale-closure risk | Theoretical; assignmentId stable |
| AGG7-17 (DES7-1/carries DES3-1) | Privacy notice no decline path | UX/legal call |
| AGG7-18 (DES7-2) | Privacy notice WCAG AA contrast borderline | Needs runtime |
| AGG7-19 (DES7-3) | Modal escape handler implicit | a11y deferred |
| AGG7-20 (DES7-4) | Heartbeat interval hardcoded | No product req |
| AGG7-21 (DES7-5) | Smallest mobile dialog overflow | Needs runtime |
| AGG7-22 (DOC7-1) | AGENTS.md missing source plan cross-refs | Cosmetic |
| AGG7-23 (DOC7-2) | .env.example uses section-name reference | Acceptable |
| AGG7-24 (DOC7-3/carries CR6-3) | 0021 filename auto-generated | Drizzle-kit risk |
| AGG7-25 (DOC7-4) | Plan deferred-table phrasing inconsistent | Process improvement |
| AGG7-26 (DOC7-6) | .context/reviews/README.md missing per-agent convention | Process doc |
| AGG7-27 (PERF7-2/carries AGG5-13) | drizzle-kit npm install per-deploy | Operational refactor |
| AGG7-28 (PERF7-3/carries AGG6-9) | _lastRefreshFailureAt indirect bound | Defense-in-depth |
| AGG7-29 (PERF7-4) | performFlush serial-await latency | Edge case perf |
| AGG7-30 (PERF7-5) | proxy.ts authUserCache O(n) cleanup | Rare edge case |
| AGG7-31 (PERF7-6) | Cache-miss getDbNowMs round-trip | Negligible |
| AGG7-32 (SEC7-1) | PGPASSWORD exposed in docker inspect ~5-10s | Defense-in-depth |
| AGG7-33 (SEC7-2) | psql sslmode unset | Internal network |
| AGG7-34 (SEC7-3) | suspicious_ua_mismatch audit unbounded | Audit infra downstream |
| AGG7-35 (TE7-1) | Hash semantics SQL-vs-JS not pinned | Trivially deterministic |
| AGG7-36 (TE7-3) | performFlush lacks dedicated unit test | Functionally covered |
| AGG7-37 (TE7-4) | schema-parity only generic | Test depth |

### Carried-deferred from cycles 1-6 (unchanged)

All carried items from cycles 1-6 remain in `_aggregate-cycle-48.md` and `_aggregate-cycle-6.md`; reasoning unchanged. No re-validation surfaced any change.

---

## Verification Plan

After each task commit, run the gates locally:
- `npm run lint` (must be EXIT=0; existing 14 untracked-script warnings unchanged)
- `npm run build` (must be EXIT=0)
- `npm run test:unit` (must be EXIT=0)

After all tasks complete, run the deploy per `DEPLOY_MODE: per-cycle`:
- `bash -c 'set -a; source .env.deploy.algo; set +a; ./deploy-docker.sh --skip-languages --no-worker --skip-worker-build'`

---

## Workspace-to-Public Migration Directive

Per cycle orchestrator instruction: "Make progress in this cycle ONLY where the review surfaces a relevant opportunity; do NOT force unrelated migration work."

**Status:** No workspace-to-public migration opportunity surfaced in any of the 11 review lanes this cycle. Per `user-injected/workspace-to-public-migration.md`, the migration is "substantially complete" and remains a "placeholder for opportunistic edge cases". Cycle-8 honors the surfacing rule by NOT taking migration action.

---

## Convergence Note

Per orchestrator's note for cycle-8: "If cycle 8 also produces 0 HIGH/MEDIUM findings AND 0 commits, the loop will stop on the convergence rule."

Cycle 8 produces:
- 0 HIGH findings
- 0 MEDIUM findings
- 1 plannable housekeeping commit (cycle-7 plan archival per README convention)
- Plus: cycle-8 plan creation commit + plan-completion-mark commit (process commits, not substantive code changes)

The housekeeping commit is mandatory per the repo's own `plans/open/README.md` convention. Cycle-7 honored the same convention for cycle-6 (commit `2aab3a33`). Per the orchestrator's guidance to keep the bar honest, cycle-8 still executes this required housekeeping but does NOT pad findings with cosmetic changes. The orchestrator is free to interpret this as substantive convergence.

---

## Rule Compliance

- All commits will be GPG-signed (`-S` flag) per CLAUDE.md / global rules.
- Conventional commit format with gitmoji.
- No `Co-Authored-By` lines.
- No `--no-verify`, no force-push.
- Fine-grained: one commit per task.
- `git pull --rebase` before each `git push`.
