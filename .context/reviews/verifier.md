# Verifier — RPF Cycle 6/100

**Date:** 2026-04-26
**Cycle:** 6/100
**Lens:** evidence-based verification of cycle-5 task exit criteria + general correctness check

---

## Cycle-5 task exit criterion verification

| Cycle-5 Task | Exit Criterion | HEAD Verification | Status |
|--------------|----------------|-------------------|--------|
| Task A.1 | `meta/0020_snapshot.json` exists, no `secret_token` column | `python3 -c "..."` returns columns including `secret_token_hash` (no plain `secret_token`) | PASS |
| Task A.2 | Pre-drop backfill SQL exists at 0020 (cycle-5 plan rolled it into 0020 + added 0021_lethal_black_tom) | `0020_drop_judge_workers_secret_token.sql` contains the DO-block + DROP | PASS |
| Task A.3 | `deploy-docker.sh` no longer prints `[OK] Database migrated` when push hits data-loss prompt | `deploy-docker.sh:594-600` correctly downgrades to warn | PASS |
| Task A.4 | Maintainer comment explains push-vs-migrate choice | `deploy-docker.sh:544-566` contains the comment block | PASS |
| Task B | Workspace-to-public migration directive reflects reality | `user-injected/workspace-to-public-migration.md` Status section dated 2026-04-26 | PASS |
| Task C | `__test_internals: TestInternals \| undefined` (no double-cast); cacheClear removed | `route.ts:115-130` — type is honest, cacheClear gone | PASS |
| Task D | `_refreshingKeys` lifecycle co-located inside refresh function | `route.ts:79-99` — function is single owner | PASS |
| Task E | New `clearAuthSessionCookies` dual-clear test passes | `tests/unit/proxy.test.ts:488-507` exists and asserts Max-Age=0 + Secure | PASS |
| Task F | New test pins `__test_internals === undefined` in production NODE_ENV | `tests/unit/api/contests-analytics-route.test.ts:234-247` | PASS |
| Task G | Cycle-4 plan moved to plans/done/ | Verified: plans/done/2026-04-27-rpf-cycle-4-review-remediation.md exists | PASS |

**All cycle-5 exit criteria verified.**

---

## VER6-1: [MEDIUM, NEW] `0020` backfill DO-block exit criterion is incomplete — verifies presence, not execution

**Severity:** MEDIUM (verification gap — overlaps with SEC6-1, ARCH6-2, TRC6-1)
**Confidence:** HIGH

**Evidence:** Cycle-5 verifier confirmed the SQL DO-block exists in 0020. But the deploy script (`drizzle-kit push`) does NOT execute SQL files from the journal. So the DO-block is present-but-dead under the current deploy strategy. A complete exit criterion would require: "the backfill ACTUALLY runs against any deploy that targets a DB carrying `secret_token` — verified by either (a) deploy-time invocation of the DO-block via psql, or (b) switching the deploy to drizzle-kit migrate."

**Fix:** Re-open the cycle-5 SEC5-1 finding under cycle-6 (now SEC6-1 / ARCH6-2 / TRC6-1) and ensure the backfill is actually executed during deploy, not just present in the file system.

**Exit criteria:** A deploy against a DB with `secret_token IS NOT NULL` produces zero `secret_token_hash IS NULL AND secret_token IS NOT NULL` rows immediately before the DROP. Gates green.

---

## VER6-2: [LOW, NEW] `tags.updated_at` migration nullable is inconsistent with the schema's stated convention

**Severity:** LOW (data-model consistency)
**Confidence:** HIGH

**Evidence:** Schema convention (verified via grep) — every other `updated_at` column in `schema.pg.ts` uses `.notNull()`. Only `tags.updated_at` (line 1056-1057) omits it.

**Fix:** Same as CRIT6-4 / SEC6-2. Backfill + add `.notNull()` OR explicit code comment justifying the deviation.

**Exit criteria:** Either consistent NOT NULL OR explicit documented exception. Gates green.

---

## VER6-3: [LOW, NEW] DRIZZLE_PUSH_FORCE knob has no operator-facing documentation

**Severity:** LOW (verification gap on operator ergonomics)
**Confidence:** HIGH

**Evidence:** Same as DOC6-1 / ARCH6-1.

**Fix:** Document in AGENTS.md and .env.example.

**Exit criteria:** Knob is discoverable from operator-facing docs. Gates green.

---

## Final Sweep — Verification

- All cycle-5 task exit criteria PASS.
- New cycle-6 findings are smaller-scope (LOW-MEDIUM); the highest-impact one (SEC6-1 / ARCH6-2 / TRC6-1 / VER6-1) is the same root cluster as cycle-5 SEC5-1 — the safety mechanism exists in code but is bypassed by the actual deploy path.

**Gates at cycle-6 baseline:**
- `npm run lint`: 0 errors, 14 warnings (untracked dev .mjs scripts).
- `npm run test:unit`: 304 files passed, 2234 tests passed, EXIT=0.
- `npm run build`: EXIT=0.

**No agent failures.**
