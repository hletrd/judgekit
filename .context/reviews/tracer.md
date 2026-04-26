# Tracer — RPF Cycle 6/100

**Date:** 2026-04-26
**Cycle:** 6/100
**Method:** causal tracing of suspicious flows; competing-hypothesis evaluation

---

**Cycle-5 carry-over verification:**
- TRC5-1 (drizzle-kit push lifecycle drift): RESOLVED via cycle-5 fixes.
- TRC5-2 (`__test_internals` cast hides production crash): RESOLVED at `route.ts:115-130`.
- TRC5-3 (anti-cheat retry timer cross-assignment): UNCHANGED — carried deferred.

---

## TRC6-1: [MEDIUM, NEW] Causal trace: `DRIZZLE_PUSH_FORCE=1` deploy path → bypasses 0020 backfill → orphan workers

**Severity:** MEDIUM (matches SEC6-1; tracing the failure path explicitly)
**Confidence:** HIGH

**Trace:**

1. Operator sees deploy warn: "drizzle-kit push detected a destructive schema change but did NOT apply it."
2. Operator reads warn → identifies `DRIZZLE_PUSH_FORCE=1` as the recovery flag.
3. Operator restarts deploy: `DRIZZLE_PUSH_FORCE=1 ./deploy-docker.sh ...`.
4. `deploy-docker.sh:577-579` sets `PUSH_FORCE_FLAG=" --force"`.
5. `deploy-docker.sh:590` invokes `npx drizzle-kit push --force`.
6. `drizzle-kit push --force` reads `schema.pg.ts`, computes diff vs live DB, synthesizes its own DDL (`ALTER TABLE judge_workers DROP COLUMN secret_token`), and applies it.
7. The DO-block in `0020_drop_judge_workers_secret_token.sql` is NOT executed because `push` ignores the journal.
8. Workers with `secret_token IS NOT NULL AND secret_token_hash IS NULL` are immediately orphaned.
9. `src/lib/judge/auth.ts:75-82` rejects them with `"workerSecretNotMigrated"`.
10. Operator sees workers failing auth post-deploy. No clear connection to the schema change.

**Competing hypothesis (refuted):** "drizzle-kit push reads `_journal.json` and runs the SQL files." False — verified per drizzle-kit docs: push is schema-vs-DB diff only.

**Competing hypothesis (refuted):** "0020 SQL would still run because it's in the journal directory." False — drizzle-kit push does not execute SQL from the journal directory.

**Fix:** Same as SEC6-1. Inline the backfill DO-block (or call psql with the SQL file) before `drizzle-kit push` in the deploy script, regardless of force mode.

**Exit criteria:** A traced deploy with DRIZZLE_PUSH_FORCE=1 against a DB carrying `secret_token` orphans zero workers (verified by SELECT COUNT(*) WHERE secret_token IS NOT NULL AND secret_token_hash IS NULL = 0 immediately before the DROP). Gates green.

---

## TRC6-2: [LOW, NEW] Causal trace: `_lastRefreshFailureAt.set` for a never-cached key → leak

**Severity:** LOW (latent; current code is correct)
**Confidence:** HIGH

**Trace (showing why the current code is SAFE):**

1. Request hits `/api/v1/contests/[assignmentId]/analytics`.
2. Cache miss path (route.ts:188-191) — `await computeContestAnalytics(...)` runs first, then `analyticsCache.set(...)`.
3. If `computeContestAnalytics` throws here, the throw propagates to the caller. NO cooldown is set. The cache also remains empty for this key. Result: no leak.
4. Cache hit path (route.ts:154-186) — only fires if there's already an entry. The cooldown can only be set in `refreshAnalyticsCacheInBackground`, which is invoked from the stale-but-fresh branch. So the cache MUST have an entry before cooldown is touched.
5. When the cached entry is evicted (TTL or capacity), dispose fires and clears the cooldown.

**Conclusion:** The lifecycle is correct. The invariant "cooldown lifecycle is bounded by cache lifecycle" holds.

**Why it's STILL a tracer note:** A future contributor adding a new code path that sets the cooldown without first ensuring a cache entry will leak. The invariant is enforced by remote-coupling.

**Fix:** Same as PERF6-1. Replace the Map with an LRU + TTL so the invariant is enforced locally.

**Exit criteria:** No path can leak `_lastRefreshFailureAt` entries. Gates green.

---

## TRC6-3: [LOW, NEW] Causal trace: deploy log says `[OK] Database migrated` after the schema repairs, even when the additive block runs against a fully-aligned DB

**Severity:** LOW (cosmetic — log is technically correct)
**Confidence:** HIGH

**Trace:**

1. `deploy-docker.sh:566-600` runs drizzle-kit push and decides `success "Database migrated"` vs `warn "..."`.
2. `deploy-docker.sh:603-617` runs additive PSQL repairs.
3. `deploy-docker.sh:617`: `success "Schema repairs applied"`.
4. The additive block always runs, even when there's nothing to repair (because `ADD COLUMN IF NOT EXISTS` is a no-op on aligned schemas).

**Why it's a (low-severity) trace finding:** The "Schema repairs applied" log message claims something happened even when nothing was applied. Operators reading the deploy log can't distinguish "additive ran, made changes" from "additive ran, no-op".

**Fix:** Either (a) capture and check the additive output, downgrading to `info "Schema repairs ran (no-op)"` when nothing happened, or (b) leave as-is and accept the log noise.

**Exit criteria:** Log distinguishes no-op from real changes, OR explicit defer. Gates green.

---

## Final Sweep — Causal Traces

- `proxy.ts` flows: cookie clearing now traced + tested.
- `analytics/route.ts` flows: cache lifecycle is correct; minor lifecycle invariant concerns documented above.
- `deploy-docker.sh` flows: the `DRIZZLE_PUSH_FORCE=1 → push --force → skip backfill` path (TRC6-1 / SEC6-1) is the highest-priority trace this cycle.

**No agent failures.**
