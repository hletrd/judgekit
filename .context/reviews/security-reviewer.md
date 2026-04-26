# Security Reviewer — RPF Cycle 6/100

**Date:** 2026-04-26
**Cycle:** 6/100
**Lens:** OWASP top 10, secrets, unsafe patterns, auth/authz, schema-level data exposure
**Files inventoried:** Same as architect.md, plus `src/app/api/v1/contests/[assignmentId]/anti-cheat/route.ts`, `src/lib/judge/auth.ts`, `src/app/api/v1/judge/{claim,heartbeat}/route.ts`.

---

**Cycle-5 carry-over verification:**
- SEC5-1 (drizzle-kit push secret_token data-loss): RESOLVED at HEAD — backfill DO-block in 0020 SQL hashes plaintext into hash before drop. Note ARCH6-2 / CRIT6-1: backfill only runs via `drizzle-kit migrate`, not via `push`. Operational gap remains.
- SEC5-2 (`clearAuthSessionCookies` dual-clear test): RESOLVED at `tests/unit/proxy.test.ts:488-507` (verifies Max-Age=0 + Secure attribute).
- SEC5-5 (`__test_internals` type cast weakens fail-fast): RESOLVED at `route.ts:115-130`.

---

## SEC6-1: [MEDIUM, NEW] Pre-drop secret_token backfill is journal-only — push --force skips it

**Severity:** MEDIUM (auth lockout / data-loss potential — overlaps with ARCH6-2)
**Confidence:** HIGH

**Evidence:**
- `drizzle/pg/0020_drop_judge_workers_secret_token.sql` contains the safety backfill DO-block AND the destructive `DROP COLUMN`.
- `deploy-docker.sh` runs `drizzle-kit push`, which synthesizes its own DDL from `schema.pg.ts` and DOES NOT execute SQL files in the journal.
- An operator who passes `DRIZZLE_PUSH_FORCE=1` in response to the warn at deploy-docker.sh:597 will run `drizzle-kit push --force`, which skips the backfill DO-block.
- Workers with `secret_token IS NOT NULL AND secret_token_hash IS NULL` will be silently locked out.

**Why it's a problem:** This is the EXACT same data-loss scenario cycle-5 tried to address (SEC5-1), but only one of the two execution paths (migrate) is protected. The push-with-force path is unprotected.

**Repo-policy note:** Per the RPF deferred-fix rules, "Security, correctness, and data-loss findings are NOT deferrable unless the repo's own rules explicitly allow it." Repo rules do NOT permit deferring this. SEC6-1 must be planned for cycle-6 implementation.

**Fix:** Modify `deploy-docker.sh` to always run the backfill DO-block via psql BEFORE `drizzle-kit push`, regardless of force mode. The DO-block is idempotent — safe to run on every deploy.

**Exit criteria:**
- Deploy with DRIZZLE_PUSH_FORCE=1 against a DB still carrying `secret_token` does NOT orphan workers — verified by running an inline SELECT before push to confirm zero `secret_token IS NOT NULL AND secret_token_hash IS NULL` rows post-backfill.
- All gates green.

---

## SEC6-2: [LOW, NEW] `tags.updated_at` migration adds nullable timestamp without DB-level default — UPSERT semantics differ from other tables

**Severity:** LOW (data integrity — all other tables enforce NOT NULL; tags is the outlier)
**Confidence:** HIGH

**Evidence:** Same as CRIT6-4. Other 18 `updated_at` columns in schema are `.notNull()`; tags is the only nullable one.

**Why it's a security concern (not just CR/CRIT):** If `updated_at` is used in audit/freshness queries (e.g., "tags modified in the last 7 days"), NULL values silently exclude older rows from the audit. An attacker who modifies a tag could leverage the nullable column if any audit query relies on `WHERE updated_at > now() - interval '7 days'` — old NULL rows pre-migration won't appear in audits.

**Fix:** Same as CRIT6-4 — backfill + add `.notNull()`.

**Exit criteria:** `tags.updated_at` is NOT NULL after a follow-up migration; gates green.

---

## SEC6-3: [LOW, NEW] `info "DRIZZLE_PUSH_FORCE=1 set — destructive schema changes WILL be applied"` is a deploy-time signal but does NOT log an audit event

**Severity:** LOW (operational audit trail)
**Confidence:** HIGH

**Evidence:**
- `deploy-docker.sh:578-579` only echoes the warning to stdout. No audit event is recorded in the DB or to a log aggregator.

**Why it's a problem:** A future post-incident review ("who pushed --force on 2026-05-XX?") relies on grepping deploy logs. If logs are rotated or lost, the destructive event has no audit trail.

**Fix:** Add an `audit_events` row (or write to a deploy log file with timestamp + operator) when `DRIZZLE_PUSH_FORCE=1` is used. This requires injecting an audit-write step into the deploy script via psql.

**Exit criteria:** Use of DRIZZLE_PUSH_FORCE creates a queryable audit trail. Gates green.

---

## Final Sweep — Security Surfaces

- `proxy.ts` cookie clearing: now under test (SEC5-2 resolved). No new findings.
- `judge/auth.ts`: only checks hash; rejects workers without a hash. Sound.
- API routes: rate-limit + auth wrappers in place; no new exposure.
- Drizzle SQL: hand-authored DO-block uses parameterless static UPDATE — no SQL injection surface.

**No agent failures.**
