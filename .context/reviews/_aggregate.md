# Aggregate Review — RPF Cycle 6/100

**Date:** 2026-04-26
**Cycle:** 6/100 of review-plan-fix loop
**Reviewers:** architect, code-reviewer, critic, debugger, designer, document-specialist, perf-reviewer, security-reviewer, test-engineer, tracer, verifier (11 lanes — designer covered as web frontend exists; no live runtime per cycle-3 sandbox limitation)
**Total findings (cycle 6 NEW):** 0 HIGH, 3 MEDIUM (one is a 4-agent convergence on the same root cluster), ~16 LOW
**Cross-agent agreement:** STRONG. Cycle-6's MEDIUM cluster (deploy-script `DRIZZLE_PUSH_FORCE` knob bypasses the journal-only safety backfill in 0020) is independently flagged by architect (ARCH6-2), security (SEC6-1), tracer (TRC6-1), and verifier (VER6-1) — four-agent convergence. The doc gap (DRIZZLE_PUSH_FORCE undocumented for operators) is flagged by architect (ARCH6-1), critic (CRIT6-1), document-specialist (DOC6-1), and verifier (VER6-3) — also four-agent convergence.

---

## Cross-Agent Convergence Map

| Topic | Agents flagging | Severity peak |
|-------|-----------------|---------------|
| `0020` SQL safety backfill exists but is never executed (push-mode skips journal; `--force` skips backfill) | ARCH6-2, SEC6-1, TRC6-1, VER6-1 | **MEDIUM** (4-agent convergence — re-opening cycle-5 SEC5-1 root cluster from a different angle) |
| `DRIZZLE_PUSH_FORCE` operator knob undocumented in AGENTS.md / .env.example | ARCH6-1, CRIT6-1, DOC6-1, VER6-3 | MEDIUM (4-agent convergence) |
| `tags.updated_at` migration nullable inconsistency vs schema convention | CRIT6-4, SEC6-2, VER6-2 | LOW (3-agent convergence) |
| `0021_lethal_black_tom.sql` filename is auto-generated nonsense | CR6-3, DOC6-3 | LOW (2-agent) |
| Cycle-5 dispose-hook test name describes mechanism not invariant | CRIT6-2, TE6-2 | LOW (2-agent) |
| `setCooldown(key, valueMs)` parameter naming ambiguous | CR6-1, TE6-3 | LOW (2-agent) |
| `deploy-docker.sh` AGG5-1 reference will rot | CRIT6-3, DOC6-2 | LOW (2-agent) |
| `deploy-docker.sh:596` data-loss regex is broad | CR6-4, DBG6-2 | LOW (2-agent) |
| `_lastRefreshFailureAt` Map can leak in degenerate cases | PERF6-1, TRC6-2 | LOW (2-agent — current code is safe; defense-in-depth recommendation) |
| `__test_internals` block expression-vs-block style inconsistency | CR6-2 | LOW (1-agent, cosmetic) |
| `0020` backfill DO-block byte-encoding cross-references missing | DBG6-1 | LOW (1-agent) |
| `analyticsCache.dispose` synchronous-only not documented | DBG6-3 | LOW (1-agent, future-proofing) |
| Privacy notice ARIA hierarchy not explicit | DES6-2, DES6-3 | LOW |
| Privacy notice has no decline path (carried) | DES6-1 | LOW (carried-deferred) |
| Plans archive housekeeping (cycle-5 plan) | CRIT6-5 | LOW |
| Deploy `Schema repairs applied` log doesn't distinguish no-op | TRC6-3 | LOW |
| Deploy script holds full PUSH_OUT in shell variable | PERF6-3 | LOW |
| `info "DRIZZLE_PUSH_FORCE=1 set"` lacks audit trail | SEC6-3 | LOW |
| `0020` backfill idempotency not pinned by integration test | TE6-1 | LOW |
| `0021` schema-parity test coverage uncertain | TE6-4 | LOW |
| Carried-deferred items (AGENTS.md, `__Secure-` HTTP, retry timing tests, privacy decline) | various | LOW-MEDIUM (all carried; reasons unchanged) |

---

## Deduplicated Findings (sorted by severity / actionability)

### AGG6-1: [MEDIUM, actionable, 4-agent convergence] `0020` SQL safety backfill is dead under the actual deploy strategy — `DRIZZLE_PUSH_FORCE=1` (or any `drizzle-kit push --force`) skips the backfill and re-opens the orphan-worker risk

**Sources:** ARCH6-2, SEC6-1, TRC6-1, VER6-1 | **Confidence:** HIGH

**Cluster summary:**

The cycle-5 plan correctly addressed the schema drift + missing snapshot + safety backfill. BUT the safety backfill lives in `drizzle/pg/0020_drop_judge_workers_secret_token.sql`, and the deploy script runs `drizzle-kit push`, not `drizzle-kit migrate`. Drizzle-kit push synthesizes its own DDL from `schema.pg.ts`; it does NOT execute SQL files in the journal. So:

1. Without `DRIZZLE_PUSH_FORCE`: push hits the data-loss prompt → cycle-5 detection downgrades the success log to warn → operator sees "manual intervention required". OK so far.
2. With `DRIZZLE_PUSH_FORCE=1`: push synthesizes `ALTER TABLE judge_workers DROP COLUMN secret_token` and applies it. The DO-block backfill in 0020 is NEVER touched. Workers with `secret_token IS NOT NULL AND secret_token_hash IS NULL` are silently locked out. `src/lib/judge/auth.ts:75-82` rejects them.

This is the EXACT failure mode cycle-5 SEC5-1 / ARCH5-1 was supposed to prevent. The fix exists in code; the runtime path is unprotected.

**Repo-policy note:** Per the deferred-fix rules, "Security, correctness, and data-loss findings are NOT deferrable unless the repo's own rules explicitly allow it." Repo rules do NOT permit deferring this. AGG6-1 must be planned for cycle-6 implementation.

**Fix (smallest change):** Modify `deploy-docker.sh` to ALWAYS pre-execute the backfill DO-block via psql BEFORE `drizzle-kit push`, regardless of force mode. The DO-block is idempotent (information_schema guard).

**Exit criteria:**
- A deploy with `DRIZZLE_PUSH_FORCE=1` against a DB with `secret_token IS NOT NULL` rows produces zero `secret_token_hash IS NULL AND secret_token IS NOT NULL` rows immediately before the DROP.
- All gates green.

---

### AGG6-2: [MEDIUM, actionable, 4-agent convergence] `DRIZZLE_PUSH_FORCE` is undocumented for operators — recovery path is opaque

**Sources:** ARCH6-1, CRIT6-1, DOC6-1, VER6-3 | **Confidence:** HIGH

`DRIZZLE_PUSH_FORCE=1` is referenced only in `deploy-docker.sh` (script-internal comment + warn message + the `if` block). Operators have no entry in `AGENTS.md` / `CLAUDE.md` / `README.md` / `.env.example` / `.env.production.example` (verified via grep).

The cycle-5 fix promised "[OK] Database migrated" no longer lies — TRUE. But operators who hit the warn at 3am have no documented recovery path except reading the bash script.

**Fix:**
1. Add a paragraph in `AGENTS.md` describing `DRIZZLE_PUSH_FORCE`: when to use, when NOT to use (because push --force skips the journal — the backfill won't run), and the recovery procedure.
2. Add a commented `# DRIZZLE_PUSH_FORCE=0` to `.env.example` and `.env.production.example` (one-liner with description).
3. Optionally reference the AGENTS.md section from the warn at `deploy-docker.sh:597`.

**Exit criteria:**
- `grep -rn "DRIZZLE_PUSH_FORCE" AGENTS.md` returns at least one operator-facing description.
- `.env.example` / `.env.production.example` reference the knob.
- Gates green.

---

### AGG6-3: [LOW, 3-agent convergence] `tags.updated_at` migration is nullable; every other `updated_at` column in the schema is `.notNull()` — inconsistency

**Sources:** CRIT6-4, SEC6-2, VER6-2 | **Confidence:** HIGH

`schema.pg.ts:1056-1057` defines `tags.updatedAt` without `.notNull()`. `drizzle/pg/0021_lethal_black_tom.sql` adds it as `timestamp with time zone` (no NOT NULL, no DEFAULT now()). All other `updated_at` columns (18 instances) are `.notNull()`.

**Fix (choose one):**
1. Backfill + add `.notNull()`: emit a follow-up migration `UPDATE tags SET updated_at = created_at WHERE updated_at IS NULL; ALTER TABLE tags ALTER COLUMN updated_at SET NOT NULL;`. Update schema.pg.ts to `.notNull()`.
2. Document explicitly why this column is intentionally nullable (with a code comment in `schema.pg.ts:1056`).

Pick (2) if there's a real reason; pick (1) for consistency with the rest of the schema.

**Exit criteria:** Schema and migration are consistent; consumers don't crash on NULL.

---

### AGG6-4 through AGG6-N: [LOW, deferred / cosmetic / housekeeping]

The remaining LOW findings are either cosmetic, opportunistically-deferred, or single-agent:

| ID | Finding | Status |
|----|---------|--------|
| AGG6-4 | `0021_lethal_black_tom.sql` filename rename to `0021_add_tags_updated_at.sql` (CR6-3, DOC6-3) | LOW; pick up alongside AGG6-3 fix. |
| AGG6-5 | Cycle-5 dispose-hook test name (CRIT6-2, TE6-2) | LOW; pick up opportunistically. |
| AGG6-6 | `setCooldown(key, valueMs)` rename (CR6-1, TE6-3) | LOW; pick up alongside AGG6-5. |
| AGG6-7 | `deploy-docker.sh` AGG5-1 reference rot (CRIT6-3, DOC6-2) | LOW; pick up alongside AGG6-1 / AGG6-2. |
| AGG6-8 | `deploy-docker.sh:596` regex broadness (CR6-4, DBG6-2) | LOW; pick up alongside AGG6-1. |
| AGG6-9 | `_lastRefreshFailureAt` Map independent bound (PERF6-1, TRC6-2) | LOW; deferred (current code correct). |
| AGG6-10 | `__test_internals` style consistency (CR6-2) | LOW; pick up opportunistically. |
| AGG6-11 | `0020` backfill UTF-8 encoding cross-references (DBG6-1) | LOW; pick up alongside AGG6-1. |
| AGG6-12 | `analyticsCache.dispose` synchronous-only doc (DBG6-3) | LOW; pick up opportunistically. |
| AGG6-13 | Privacy notice ARIA hierarchy (DES6-2, DES6-3) | LOW; defer. |
| AGG6-14 | Privacy notice no decline path (DES6-1, carried) | LOW; deferred (UX/legal). |
| AGG6-15 | Cycle-5 plan archive housekeeping (CRIT6-5) | LOW; pick up this cycle. |
| AGG6-16 | Deploy "Schema repairs" log granularity (TRC6-3) | LOW; defer. |
| AGG6-17 | Deploy PUSH_OUT memory (PERF6-3) | LOW; defer. |
| AGG6-18 | DRIZZLE_PUSH_FORCE audit trail (SEC6-3) | LOW; defer. |
| AGG6-19 | `0020` backfill idempotency integration test (TE6-1) | LOW; defer. |
| AGG6-20 | `0021` schema-parity test coverage (TE6-4) | LOW; pick up opportunistically. |

---

## Carried Deferred Items (cycle 5 → cycle 6, unchanged)

| Cycle 5 ID | Description | Reason for deferral | Repo-rule citation |
|------------|-------------|---------------------|--------------------|
| AGG5-8 | `MIN_INTERVAL_MS` constant placement (CR5-3) | Cosmetic | Default — non-functional. |
| AGG5-9 | `lastEventRef` Record bound (CR5-4) | Closed-set in practice | Default. |
| AGG5-10 | `formatEventTime` ms-vs-seconds (DBG5-2) | Number branch unreachable | Default. |
| AGG5-11 | First-render burst of distinct event types (DBG5-3) | Server-side rate-limit handles | Default. |
| AGG5-12 | `formatDetailsJson` re-parsing (PERF5-2) | Cosmetic perf | Default. |
| AGG5-13 | Drizzle-kit `npm install` per-deploy (PERF5-1) | Deploy slow but reliable | Default. |
| AGG5-14 | `vi.resetModules()` slow tests (PERF5-3) | Tests work correctly | Default. |
| AGG5-15 | Filter chips not keyboard-accessible (DES5-1) | a11y on instructor-only surface | Default. |
| AGG5-16 | Dark-mode contrast not verified (DES5-3) | No live runtime | Default. |
| AGG5-19 | Storage-quota-exceeded test gap (TE5-5) | Source code has the catch | Default. |
| AGG5-20 | Anti-cheat retry timer cross-assignment trace (TRC5-3) | Likely re-keyed by parent | Default. |
| AGG3-5 / SEC3-3 | AGENTS.md vs `password.ts` mismatch | Needs PM/user decision | Default — docs/policy needs canonical declaration. |
| AGG3-6 / SEC3-1 | `__Secure-` cookie clear over HTTP no-op | Dev-only nuisance; production HTTPS guaranteed | Default. |
| AGG3-7 / TE3-2 | Anti-cheat retry/backoff lacks direct timing tests | Test setup non-trivial | Default. |
| AGG3-8 / DES3-1 | Privacy notice has no decline path | UX/legal judgment call | Default. |
| AGG3-9 / ARCH3-2 | Anti-cheat at 335 lines | Threshold 400 not breached | Default. |
| DEFER-various | Other carried items from cycles 1-4, 38-48 | See `_aggregate-cycle-48.md` / `_aggregate-cycle-5.md` | Default. |

---

## Verification Notes

- `npm run lint`: 0 errors, 14 warnings (all in untracked dev `.mjs` scripts + `playwright.visual.config.ts` + `.context/tmp/uiux-audit.mjs`). No source-tree warnings.
- `npm run test:unit`: 304 files passed, 2234 tests passed. EXIT=0. Duration 66.27s.
- `npm run build`: EXIT=0.
- All cycle-5 task exit criteria verified PASS (see verifier.md table).
- The cycle-5 SEC5-1 cluster (drizzle data-loss) is reopened with cycle-6 evidence — the safety mechanism exists in code but is bypassed by the actual deploy path (push instead of migrate).

---

## Workspace-to-Public Migration Note

**Source:** `user-injected/workspace-to-public-migration.md`
**Confidence:** HIGH

The migration is largely DONE per cycle-5 fix. Cycle-6 reviews surfaced no new migration findings. The directive remains a placeholder for opportunistic edge cases.

---

## No Agent Failures

All 11 reviewer lanes completed. No retries needed.
