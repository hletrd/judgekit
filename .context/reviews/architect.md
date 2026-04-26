# Architect Review — RPF Cycle 6/100

**Date:** 2026-04-26
**Cycle:** 6/100 of review-plan-fix loop
**Lens:** architectural / design risk, coupling, layering, schema lifecycle
**Files inventoried (review-relevant):** `src/app/api/v1/contests/[assignmentId]/analytics/route.ts`, `src/components/exam/anti-cheat-monitor.tsx`, `src/components/exam/anti-cheat-storage.ts`, `src/components/contest/anti-cheat-dashboard.tsx`, `src/lib/security/env.ts`, `src/proxy.ts`, `src/lib/judge/auth.ts`, `src/lib/db/schema.pg.ts`, `drizzle/pg/*.sql`, `drizzle/pg/meta/*.json`, `deploy-docker.sh`, `package.json`, `drizzle.config.ts`.

**Cycle-5 carry-over verification:** All HIGH-severity items from cycle-5 cluster (ARCH5-1 / SEC5-1 / CRIT5-1 / TRC5-1 / VER5-1) are resolved at HEAD:
- `drizzle/pg/meta/0020_snapshot.json` exists and contains no `secret_token` column (only `secret_token_hash`).
- `drizzle/pg/0020_drop_judge_workers_secret_token.sql` now embeds a guarded backfill DO-block that hashes plaintext `secret_token` into `secret_token_hash` before the destructive DROP COLUMN.
- `drizzle/pg/0021_lethal_black_tom.sql` adds `tags.updated_at` matching the schema definition (`schema.pg.ts:1056`).
- `deploy-docker.sh:594-600` now scans `drizzle-kit push` stdout for the data-loss / interactive-prompt markers and downgrades `success "Database migrated"` to `warn "..."` when one is detected.
- `deploy-docker.sh:544-566` now contains a maintainer comment explaining the push-vs-migrate choice and DRIZZLE_PUSH_FORCE knob.
- `route.ts:115-130` now declares `__test_internals: TestInternals | undefined` (no double-cast); `cacheClear` removed.
- `route.ts:79-99` is the single owner of `_refreshingKeys.add` / `delete` (idempotent guard inside the function).

---

## ARCH6-1: [LOW, NEW] `DRIZZLE_PUSH_FORCE` is an undocumented operator knob

**Severity:** LOW (operational documentation gap)
**Confidence:** HIGH

**Evidence:**
- `deploy-docker.sh:557-559` mentions DRIZZLE_PUSH_FORCE in a script-internal comment.
- `deploy-docker.sh:577-579` reads `DRIZZLE_PUSH_FORCE=1` to add `--force` to `npx drizzle-kit push`.
- `deploy-docker.sh:597` mentions DRIZZLE_PUSH_FORCE in the warn message.
- `grep -rn "DRIZZLE_PUSH_FORCE" /Users/hletrd/flash-shared/judgekit/AGENTS.md /Users/hletrd/flash-shared/judgekit/CLAUDE.md /Users/hletrd/flash-shared/judgekit/README.md` returns NO hits.

**Why it's a problem:** The new env knob is the operator's escape hatch when drizzle-kit push hits a data-loss prompt. If the knob isn't documented in `AGENTS.md` (or a deploy runbook), an operator who sees `[WARN] drizzle-kit push detected a destructive schema change but did NOT apply it` only learns about DRIZZLE_PUSH_FORCE by reading the warn string itself or by spelunking through the bash script. The cycle 5 plan promised "operators see the truth" — partially true; they need to know the knob exists and what it does.

**Failure scenario:** A new operator running their first production deploy hits the warn, doesn't recognize it, restarts the deploy expecting different behavior, gets the warn again, and concludes the script is broken. They then either (a) escalate, blocking the deploy until someone with context responds, or (b) pass `--force` manually outside the deploy script (which bypasses the safety backfill in `0020_drop_judge_workers_secret_token.sql` if they go around the journal too).

**Fix:**
1. Add a short paragraph to `AGENTS.md` under "Deploy" or "Database migrations" describing:
   - When the warn appears (drizzle-kit push hit data-loss prompt non-interactively).
   - What DRIZZLE_PUSH_FORCE=1 does (passes --force, applies destructive change).
   - When NOT to use it (the journal SQL safety backfill in 0020 only runs via `drizzle-kit migrate`, NOT via `push --force` — so push --force will skip the backfill).
2. Optionally add a one-line `DRIZZLE_PUSH_FORCE` mention to `.env.example` / `.env.production.example`.

**Exit criteria:**
- `grep -rn "DRIZZLE_PUSH_FORCE" /Users/hletrd/flash-shared/judgekit/AGENTS.md` returns at least one hit with operator-facing description.
- All gates green.

---

## ARCH6-2: [LOW, NEW] Pre-drop backfill in `0020_drop_judge_workers_secret_token.sql` is dead under the current `drizzle-kit push` deploy flow

**Severity:** LOW (latent — only matters if/when deploy switches to `drizzle-kit migrate`, OR an operator uses `--force`)
**Confidence:** HIGH

**Evidence:**
- `drizzle/pg/0020_drop_judge_workers_secret_token.sql` contains a DO-block backfill followed by `ALTER TABLE "judge_workers" DROP COLUMN IF EXISTS "secret_token"`.
- `deploy-docker.sh:567,590` runs `npx drizzle-kit push`, NOT `npx drizzle-kit migrate`. `push` ignores the journal — it diffs `schema.pg.ts` against the live DB and synthesizes its own DDL. The backfill DO-block in 0020 is NEVER executed by `push`.
- The deploy script comment at `deploy-docker.sh:558-559` correctly documents this: "For journal-driven migrations instead, change `drizzle-kit push` to `drizzle-kit migrate` here AND verify drizzle/pg/meta/_journal.json + meta/<NN>_snapshot.json files stay in sync".

**Why it's a problem:** The backfill is genuinely needed safety code. Today it's a no-op because the journal is not consumed. A future operator who sees the warn (per ARCH6-1) and reaches for `DRIZZLE_PUSH_FORCE=1` to apply the destructive change will skip the backfill — `push --force` synthesizes its own ALTER without running the DO-block — and any judge_worker row with `secret_token IS NOT NULL AND secret_token_hash IS NULL` is silently locked out.

**Failure scenario:** Operator hits warn → reads warn → sets DRIZZLE_PUSH_FORCE=1 → deploys → drizzle-kit push --force drops the column synthesizing its own DDL → backfill DO-block in 0020 was never executed → orphaned workers locked out.

**Fix (choose one — both meet the exit criterion):**
1. **Recommended (small, defensive):** Modify `deploy-docker.sh` to ALWAYS pre-execute the inlined backfill DO-block via `psql` before `drizzle-kit push`. The DO-block is idempotent (checks for column existence), so running it on every deploy is safe.
2. **Larger (correctness):** Switch `deploy-docker.sh` to `drizzle-kit migrate` so the journal IS executed.

**Exit criteria:**
- Pre-drop backfill runs against any DB that still carries `secret_token`, regardless of the deploy strategy.
- All gates green.

---

## ARCH6-3: [LOW, NEW] Deploy script "additive PostgreSQL schema repairs" duplicates intent of journal-driven migrations

**Severity:** LOW (architectural — coupling between deploy script and schema)
**Confidence:** HIGH

**Evidence:**
- `deploy-docker.sh:603-617`:
  ```sh
  ALTER TABLE problems ADD COLUMN IF NOT EXISTS default_language text;
  ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS default_language text;
  ```
- These columns are also defined in `src/lib/db/schema.pg.ts` (the schema is the source of truth for `drizzle-kit push`).
- The "additive repairs" block runs AFTER `drizzle-kit push` — duplicating the intent.

**Why it's a problem:** Two sources of truth for schema diffs. If the operator forgets to update the additive block when a new column is added, deploys to older DBs will be missing the column until `drizzle-kit push` synthesizes the ALTER. This is defensive but implicitly assumes future column additions will be remembered here.

**Fix (defer if not chosen):** Add a comment block above explaining "this is a safety net for legacy DBs where drizzle-kit push has not yet been authoritative; new schema additions should be added here AND to schema.pg.ts." OR delete the block entirely once the production DB is confirmed to be on the current schema.

**Exit criteria:**
- Either (a) inline comment justifying the duplication, or (b) the additive block is removed.

---

## Final Sweep — Architectural Boundaries

- `src/lib/judge/auth.ts` is correct after cycle 5: only checks hash, falls back to shared token only when worker not found, logs migration-required warn when worker exists without hash.
- `src/proxy.ts` cookie clearing is now under test (cycle 5 AGG5-6) and asserts both cookie variants get Max-Age=0.
- `src/components/exam/anti-cheat-monitor.tsx` is at 302 lines (under the 400-line repo threshold).
- `src/components/exam/anti-cheat-storage.ts` has `MAX_PENDING_EVENTS = 200` and `isValidPendingEvent` validator. Unit tests assert both.

**No agent failures.**
