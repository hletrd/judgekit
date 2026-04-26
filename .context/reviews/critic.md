# Critic — RPF Cycle 6/100

**Date:** 2026-04-26
**Cycle:** 6/100
**Lens:** multi-perspective critique; what's missing, over-engineered, assumed-invisible

---

**Cycle-5 carry-over verification:** All cycle-5 critic findings (CRIT5-1, CRIT5-2, CRIT5-3, CRIT5-4) are resolved at HEAD. Plan archive cleanup and directive freshness pass both done.

---

## CRIT6-1: [MEDIUM, NEW] The cycle-5 fix to `deploy-docker.sh` "operators see the truth" goal is half-done — operators see the warn, but they don't see HOW to recover

**Severity:** MEDIUM (operational ergonomics)
**Confidence:** HIGH

**Evidence:**
- `deploy-docker.sh:596-600` correctly downgrades the success log to warn when the data-loss prompt is detected.
- The warn message references `DRIZZLE_PUSH_FORCE=1` and "the journal-driven migrate strategy" — both undocumented in `AGENTS.md`/`CLAUDE.md`/`README.md` (verified via grep).
- Mentioned only in the script-internal comment at `deploy-docker.sh:557-558` and in this warn string.

**Why it's a problem:** The cycle-5 plan promised "[OK] Database migrated" no longer lies — TRUE. But the recovery path is opaque: an operator who sees this warn for the first time has no documentation to consult except the script itself. This forces tribal knowledge and re-discovery cost on every new operator.

**Fix:**
1. Add a runbook section to `AGENTS.md` describing:
   - What the warn means (drizzle-kit push hit data-loss prompt).
   - DRIZZLE_PUSH_FORCE=1 escape hatch — when to use, when NOT to use (when a journal-only safety migration like `0020` exists).
   - The fact that `push --force` SKIPS the journal — so the safety backfill in `0020_drop_judge_workers_secret_token.sql` won't run.
   - Recovery: either (a) manually run the backfill DO-block via psql before push --force, or (b) switch the deploy to `drizzle-kit migrate` for that one deploy.

**Exit criteria:**
- Runbook section exists and is referenced from the warn or comment block.
- A new operator following only the README + AGENTS.md can resolve the warn without consulting source code.
- All gates green.

---

## CRIT6-2: [LOW, NEW] Cycle-5 dispose-hook test name describes the mechanism, not the invariant

**Severity:** LOW (test-quality / readability)
**Confidence:** HIGH

**Evidence:**
- `tests/unit/api/contests-analytics-route.test.ts:248-265`: test "evicts cooldown metadata when the cache entry is removed (dispose hook)".
- The test reads `__test_internals!.setCooldown(...)` then `cacheDelete(...)` then asserts `hasCooldown(...) === false`.

**Why it's a problem:** The test is correct but the name describes the mechanism (dispose hook), not the invariant. A future contributor who refactors away the dispose hook and replaces it with a different cleanup strategy may delete this test as "implementation detail" without realizing it pins a load-bearing memory-leak invariant.

**Fix:** Rename to "cooldown metadata cannot outlive its cache entry (memory leak guard)" or similar. The test body remains identical.

**Exit criteria:** Test name describes the invariant, not the mechanism. Gates green.

---

## CRIT6-3: [LOW, NEW] The `cycle 5 aggregate AGG5-1 documents the prior failure mode` comment in `deploy-docker.sh` will rot

**Severity:** LOW (documentation rot)
**Confidence:** HIGH

**Evidence:**
- `deploy-docker.sh:563-565`:
  ```sh
  # Cycle 5 aggregate AGG5-1 documents the prior failure mode where the
  # success log was printed even though the destructive change was
  # unapplied, masking schema drift across deploys.
  ```
- `AGG5-1` references `.context/reviews/_aggregate.md` at the time of cycle 5. Once the aggregate is rotated (every cycle overwrites `_aggregate.md`), the AGG5-1 ID lives only in the cycle-5 archived copy `_aggregate-cycle-5.md`.

**Why it's a problem:** Cross-references that point to ephemeral cycle artifacts will become stale.

**Fix:** Replace the cycle-specific reference with a permanent doc citation, OR explicitly point to the archived path `.context/reviews/_aggregate-cycle-5.md` so the link stays stable.

**Exit criteria:** No cycle-specific aggregate IDs in long-lived source files (without an archived path). Gates green.

---

## CRIT6-4: [LOW, NEW] `tags.updated_at` migration is added without `notNull()` default — silent semantic difference vs other tables

**Severity:** LOW (consistency / migration semantics)
**Confidence:** HIGH

**Evidence:**
- `src/lib/db/schema.pg.ts:1056-1057`:
  ```ts
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .$defaultFn(() => new Date()),
  ```
- Compare to `users` table at `schema.pg.ts:54`:
  ```ts
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .$defaultFn(() => new Date()),
  ```
- `drizzle/pg/0021_lethal_black_tom.sql`: `ALTER TABLE "tags" ADD COLUMN "updated_at" timestamp with time zone;` — no NOT NULL, no DEFAULT now().

**Why it's a problem:** Existing rows in `tags` will have `updated_at = NULL` after the migration. The schema permits this (no `.notNull()`), but every other `updated_at` column in the schema is `.notNull()`. This inconsistency means:
1. Code that does `tag.updatedAt.toISOString()` will throw on existing rows.
2. ORDER BY `updated_at` will sort NULLs unpredictably.

**Fix:** Either (a) backfill existing rows + add `.notNull()` (run a follow-up migration `UPDATE tags SET updated_at = created_at WHERE updated_at IS NULL; ALTER TABLE tags ALTER COLUMN updated_at SET NOT NULL;` and update schema), or (b) document explicitly why this column is intentionally nullable (with a code comment in `schema.pg.ts:1056`).

**Exit criteria:** Schema and migration are consistent; consumers don't crash on NULL. Gates green.

---

## CRIT6-5: [LOW, carry-forward from cycle 5] Plans archive convention drift continues to need housekeeping

**Severity:** LOW
**Confidence:** HIGH

**Evidence:** `plans/open/` currently contains cycle-5 plan + master plans. Cycle-5 plan should move to `plans/done/` once cycle-6 is in progress (or once verified all tasks `[x]`).

**Status:** The cycle-5 plan IS marked all `[x]` per `plans/open/2026-04-26-rpf-cycle-5-review-remediation.md`. Move it.

**Fix:** `git mv plans/open/2026-04-26-rpf-cycle-5-review-remediation.md plans/done/`.

**Exit criteria:** Cycle-5 plan in `plans/done/`. Gates green.

---

## Final Sweep — Critique Surface

- The cycle-5 fixes addressed the symptoms and added safeguards, but the operational-knowledge gap (CRIT6-1) is the real follow-up. Tooling alone doesn't ship recovery procedures.
- The cycle-5 dispose-hook test (CRIT6-2) is a great example of a load-bearing test whose name doesn't reflect what it pins.
- The migration filename + nullability (CR6-3 / CRIT6-4) are easy housekeeping that compounds if left.

**No agent failures.**
