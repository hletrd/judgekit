# Aggregate Review — RPF Cycle 5/100

**Date:** 2026-04-26
**Cycle:** 5/100 of review-plan-fix loop
**Reviewers:** architect, code-reviewer, critic, debugger, designer, document-specialist, perf-reviewer, security-reviewer, test-engineer, tracer, verifier (11 lanes — designer covered as web frontend exists; no live runtime per cycle-3 sandbox limitation)
**Total findings (cycle 5 NEW):** 2 HIGH, 1 MEDIUM, ~16 LOW (mix of new + carried-deferred)
**Cross-agent agreement:** STRONG. Cycle 5's HIGH-severity cluster (drizzle-kit push vs. journal mismatch + judge-worker auth data-loss + deploy log dishonesty) was independently flagged by architect, security, critic, tracer, and verifier — five-agent convergence on a single root cause.

---

## Cross-Agent Convergence Map

| Topic | Agents flagging | Severity peak |
|-------|-----------------|---------------|
| Drizzle migration journal vs `drizzle-kit push` lifecycle drift (missing `0020_snapshot.json`) | ARCH5-1, SEC5-1, CRIT5-1, TRC5-1, VER5-1 | **HIGH** (5-agent convergence — highest signal this cycle) |
| `__test_internals` type cast `undefined as unknown as <type>` weakens fail-fast | ARCH5-2, CRIT5-3, SEC5-5, TRC5-2 | LOW (4-agent convergence) |
| `_refreshingKeys` cleanup depends on `finally` (architectural fragility) | CR5-2, DBG5-1 | LOW (2-agent) |
| `cacheClear` in `__test_internals` unused — YAGNI | CR5-1 | LOW (1-agent, noted by VER4-2 last cycle) |
| Workspace-to-public migration directive is stale | CRIT5-2, DOC5-1, VER5-2 | MEDIUM (3-agent convergence) |
| Deploy log "[OK] Database migrated" lies on data-loss prompt | CRIT5-1, TRC5-1 | HIGH (component of the deploy cluster) |
| `_refreshingKeys` leak scenario uncovered by tests | TE5-3 | LOW |
| `clearAuthSessionCookies` lacks dual-clear unit test | SEC5-2, TE5-2 | LOW (2-agent) |
| `formatDetailsJson` re-parses JSON on every render | PERF5-2 | LOW |
| Drizzle-kit npm install on every deploy | PERF5-1 | LOW |
| Filter chips in AntiCheatDashboard not keyboard-accessible | DES5-1 | LOW |
| `MIN_INTERVAL_MS` constant placement | CR5-3 | LOW (cosmetic) |
| `formatEventTime` ms-vs-seconds confusion | DBG5-2 | LOW |
| Plans archive convention drift | CRIT5-4 | LOW |
| `deploy-docker.sh` lacks comment explaining push-vs-migrate | DOC5-3 | LOW |
| Test-mode env-gate has no test asserting prod behavior | TE5-1 | LOW |
| Storage-quota-exceeded swallow uncovered by test | TE5-5 | LOW |
| Carried-deferred items (AGENTS.md, `__Secure-` HTTP, retry timing tests, privacy decline) | various | LOW-MEDIUM (all carried; reasons unchanged) |

---

## Deduplicated Findings (sorted by severity / actionability)

### AGG5-1: [HIGH, actionable, 5-agent convergence] Drizzle migration journal/snapshot drift + deploy uses `drizzle-kit push` (NOT `migrate`) + secret_token data-loss prompt

**Sources:** ARCH5-1, SEC5-1, CRIT5-1, TRC5-1, VER5-1 | **Confidence:** HIGH

**Cluster summary:** Three tightly-coupled symptoms with a single root cause:
1. **Schema drift (architect / verifier).** `drizzle/pg/0020_drop_judge_workers_secret_token.sql` exists in the journal but `drizzle/pg/meta/0020_snapshot.json` is MISSING. Latest snapshot (`0019_snapshot.json`) still contains `secret_token`. The migration was hand-authored without `drizzle-kit generate`.
2. **Deploy strategy mismatch (architect / tracer).** `deploy-docker.sh:564` runs `drizzle-kit push` (schema-vs-DB diff), not `drizzle-kit migrate` (journal-driven SQL apply). Push refuses to drop the column non-interactively → exits 0 with the prompt unanswered.
3. **Deploy log lies (critic / tracer).** Bash sees exit 0 → `success "Database migrated"` runs even though the column wasn't dropped. Operators see a green deploy.
4. **Data-loss risk (security).** When the destructive drop finally executes (e.g. with `--force`), any judge_worker rows where `secret_token_hash IS NULL AND secret_token IS NOT NULL` lose authentication permanently.

**Fix:** Layered remediation:
1. **Phase 1 (snapshot regen):** Run `npx drizzle-kit generate` to create a fresh `0020_snapshot.json` (or hand-author it). Commit.
2. **Phase 2 (deploy honesty):** Capture drizzle-kit push output in `deploy-docker.sh`; if "data loss"/"are you sure" detected, downgrade `success` to `warn` so operators see the truth.
3. **Phase 3 (judge-worker safety):** Author a pre-drop backfill migration that hashes any plaintext `secret_token` into `secret_token_hash` before the drop, with a verification query to confirm zero orphans.
4. **Phase 4 (long-term):** Switch deploy to `drizzle-kit migrate` so the journal IS the source of truth, OR add `--force` to push (with phase 1+3 in place first).

**Exit criteria:**
- `meta/0020_snapshot.json` exists and has no `secret_token` column.
- Deploy on a DB that still has `secret_token` either (a) drops it cleanly, or (b) prints a warning instead of `[OK] Database migrated` if it can't.
- A pre-drop verification query confirms zero workers would be orphaned.
- All gates green.

**Repo-policy note:** Per the deferred-fix rules, "Security, correctness, and data-loss findings are NOT deferrable unless the repo's own rules explicitly allow it." Repo rules do NOT permit deferring this. AGG5-1 must be planned for cycle 5 implementation.

---

### AGG5-2: [MEDIUM, actionable, 3-agent convergence] Workspace-to-public migration directive is stale relative to actual code state

**Sources:** CRIT5-2, DOC5-1, VER5-2 | **Confidence:** HIGH

`user-injected/workspace-to-public-migration.md` lists "Problems / Submissions / Compiler/Playground / Contests" as candidates for unifying. Actual code:
- `src/components/layout/app-sidebar.tsx:55-59`: "Non-admin nav items have been removed from the sidebar."
- `src/components/layout/app-sidebar.tsx:154-163`: sidebar returns null for non-admins.
- `src/lib/navigation/public-nav.ts:61-70`: dropdown carries Dashboard/Problems/Problem-Sets/Groups/My-Submissions/Contests/Profile/Admin.

The migration is largely DONE. The directive needs a freshness pass to either close the directive or identify SPECIFIC remaining work.

**Fix:** Update the directive to reflect reality. Mark milestones as DONE with citations. Identify specific residual items (e.g., admin-system pages that don't actually need admin gating) or close the directive entirely.

**Exit criteria:** Directive reflects reality; per-cycle reviews stop wasting attention on phantom backlog.

---

### AGG5-3: [LOW, 4-agent convergence] `__test_internals` type cast `undefined as unknown as <type>` weakens fail-fast contract

**Sources:** ARCH5-2, CRIT5-3, SEC5-5, TRC5-2 | **Confidence:** HIGH

`route.ts:101-118` runtime is correct (undefined in production) but the type system thinks the value is always present. A future refactor that calls `__test_internals.cacheClear()` from production code gets full IDE autocomplete.

**Fix:** Make the type honest: `TestInternals | undefined`. Tests use `__test_internals!.method()`.

**Combined with AGG5-4 (drop `cacheClear`):** Both fixes converge in a single edit to lines 101-118.

**Exit criteria:** Type of `__test_internals` is `TestInternals | undefined`; no double-cast; tests still pass.

---

### AGG5-4: [LOW, actionable] `cacheClear` exposed in `__test_internals` but never consumed

**Sources:** CR5-1 (carried from VER4-2) | **Confidence:** HIGH

Drop `cacheClear` from the methods bag.

**Exit criteria:** `grep -rn "cacheClear" src/ tests/` returns no hits; gates green.

---

### AGG5-5: [LOW, 2-agent convergence] `_refreshingKeys` cleanup depends on `finally` of an externally-called function

**Sources:** CR5-2, DBG5-1 | **Confidence:** MEDIUM

Move the `_refreshingKeys.add(cacheKey)` into the function (line 159 → first line of `refreshAnalyticsCacheInBackground`) so the function is the single owner of both add and delete.

**Exit criteria:** Single owner; existing dedup test still passes; new test confirms recovery from synchronous launch failure.

---

### AGG5-6: [LOW, 2-agent convergence] `clearAuthSessionCookies` lacks dual-clear unit test

**Sources:** SEC5-2, TE5-2 | **Confidence:** HIGH

Add a unit test that asserts both `authjs.session-token` and `__Secure-authjs.session-token` are cleared with `maxAge: 0` in a single response.

**Exit criteria:** New test passes; gates green.

---

### AGG5-7: [LOW, actionable] No test asserts production-mode `__test_internals === undefined`

**Sources:** TE5-1 | **Confidence:** HIGH

Add a test using `vi.stubEnv("NODE_ENV", "production")` + `vi.resetModules()` that asserts `__test_internals === undefined` after re-import.

**Exit criteria:** New test passes; runtime gate is now test-pinned.

---

### AGG5-8 through AGG5-N: [LOW, deferred / cosmetic / optional]

The remaining LOW findings are either cosmetic, opportunistically-deferred, or require user/PM decisions:

| ID | Finding | Status |
|----|---------|--------|
| AGG5-8 | `MIN_INTERVAL_MS` constant placement (CR5-3) | LOW; pick up opportunistically. |
| AGG5-9 | `lastEventRef` Record bound (CR5-4) | LOW; deferred (closed-set in practice). |
| AGG5-10 | `formatEventTime` ms-vs-seconds (DBG5-2) | LOW; pick up opportunistically. |
| AGG5-11 | First-render burst of distinct event types (DBG5-3) | LOW; deferred (server-side rate-limit handles). |
| AGG5-12 | `formatDetailsJson` re-parsing per render (PERF5-2) | LOW; pick up opportunistically. |
| AGG5-13 | Drizzle-kit `npm install` per-deploy (PERF5-1) | LOW; pick up opportunistically. |
| AGG5-14 | `vi.resetModules()` slow tests (PERF5-3) | LOW; deferred (works correctly). |
| AGG5-15 | Filter chips not keyboard-accessible (DES5-1) | LOW; pick up if a11y sweep is queued. |
| AGG5-16 | Dark-mode contrast not verified (DES5-3) | LOW; deferred (no live runtime). |
| AGG5-17 | Deploy script lacks push-vs-migrate comment (DOC5-3) | LOW; pick up alongside AGG5-1 fix. |
| AGG5-18 | Plans archive convention drift (CRIT5-4) | LOW; pick up in housekeeping. |
| AGG5-19 | Storage-quota-exceeded test gap (TE5-5) | LOW; pick up opportunistically. |
| AGG5-20 | Anti-cheat retry timer cross-assignment trace (TRC5-3) | LOW; deferred (likely re-keyed). |

---

## Carried Deferred Items (cycle 4 → cycle 5, unchanged)

| Cycle 4 ID | Description | Reason for deferral | Repo-rule citation |
|------------|-------------|---------------------|--------------------|
| AGG3-5 / SEC3-3 | AGENTS.md vs `password.ts` mismatch | Needs user/PM decision | Default — docs/code mismatch needs canonical declaration. No repo rule forbids deferring documentation/policy questions. |
| AGG3-6 / SEC3-1 | `__Secure-` cookie clear over HTTP no-op | Dev-only nuisance; production HTTPS guaranteed | Default — non-production-impacting. |
| AGG3-7 / TE3-2 | Anti-cheat retry/backoff lacks direct timing tests | Test setup non-trivial | Default — test gap, not a bug. |
| AGG3-8 / DES3-1 | Privacy notice has no decline path | UX/legal judgment call | Default — product decision. |
| AGG3-9 / ARCH3-2 | Anti-cheat at 335 lines | Refactor without behavior change; threshold 400 | Default — code quality threshold not breached. |
| AGG3-10 | Various cosmetic optional items | Each cosmetic; pick up opportunistically | Default — non-functional. |
| AGG-10 (cycle 2) | Anti-cheat online event can race with retry timer | Server-idempotent; duplicate POSTs benign | Default — behavior verified safe. |
| AGG-4 (cycle 1) | Anti-cheat retry timer holds stale closure across `assignmentId` change | Component is keyed on `assignmentId` | Default — likely-correct by convention. |
| DEFER-22..57 | Carried from cycles 38–48 | See `_aggregate-cycle-48.md` | Default. |

---

## Verification Notes

- `npm run lint`: 0 errors, 14 warnings (all in untracked dev `.mjs` scripts + `playwright.visual.config.ts` + `.context/tmp/uiux-audit.mjs`). No source-tree warnings.
- `npm run test:unit`: 304 files passed, 2232 tests passed. EXIT=0. Duration 31.55s.
- `npm run build`: EXIT=0.
- All cycle-4 task exit criteria verified (see verifier.md table).
- No security regressions in the recently-touched code itself.
- Plans/open count: stale-archive cleanup needed (CRIT5-4) — see plan housekeeping.

---

## Workspace-to-Public Migration Note

**Source:** `user-injected/workspace-to-public-migration.md`
**Confidence:** HIGH (3-agent convergence — see AGG5-2)

The migration is largely DONE. Cycle 5's plan must include a freshness-pass on the directive. After this update, future cycles can correctly identify residual work or close the directive entirely.

---

## No Agent Failures

All 11 reviewer lanes completed. No retries needed.
