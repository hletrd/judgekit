# Document Specialist — RPF Cycle 6/100

**Date:** 2026-04-26
**Cycle:** 6/100
**Lens:** documentation accuracy, code/doc mismatches, plan hygiene

---

**Cycle-5 carry-over verification:**
- DOC5-1 (workspace-to-public migration directive stale): RESOLVED at HEAD via `user-injected/workspace-to-public-migration.md` "Status (as of 2026-04-26)" section.
- DOC5-3 (deploy-docker.sh push-vs-migrate comment): RESOLVED at `deploy-docker.sh:544-566`.

---

## DOC6-1: [MEDIUM, NEW] `DRIZZLE_PUSH_FORCE` env knob is undocumented in `AGENTS.md`, `CLAUDE.md`, `README.md`, `.env.example`, `.env.production.example`

**Severity:** MEDIUM (operational documentation gap; ties to ARCH6-1, CRIT6-1)
**Confidence:** HIGH

**Evidence:**
- `grep -rn "DRIZZLE_PUSH_FORCE" /Users/hletrd/flash-shared/judgekit/AGENTS.md /Users/hletrd/flash-shared/judgekit/CLAUDE.md /Users/hletrd/flash-shared/judgekit/README.md /Users/hletrd/flash-shared/judgekit/.env.example /Users/hletrd/flash-shared/judgekit/.env.production.example` returns NO hits.
- `deploy-docker.sh` mentions DRIZZLE_PUSH_FORCE only in a script-internal comment + warn message + the `if` block.

**Why it's a problem:** The escape-hatch knob is a critical operational control. Operators should learn about it from operator-facing docs, not from the script's warn message at 3am.

**Fix:**
1. Add a paragraph in `AGENTS.md` describing the knob, when to use it, and the gotcha that `push --force` skips the journal.
2. Add a `# DRIZZLE_PUSH_FORCE=0` commented entry to `.env.example` (and the production example) with a one-line description.

**Exit criteria:**
- AGENTS.md has at least one paragraph; `.env.example`/`.env.production.example` reference the knob.
- Gates green.

---

## DOC6-2: [LOW, NEW] `deploy-docker.sh` references `cycle 5 aggregate AGG5-1` — link will rot when `_aggregate.md` rotates next cycle

**Severity:** LOW (doc rot)
**Confidence:** HIGH

**Evidence:**
- `deploy-docker.sh:563-565` (also flagged by CRIT6-3):
  ```sh
  # Cycle 5 aggregate AGG5-1 documents the prior failure mode where the
  # success log was printed even though the destructive change was
  # unapplied, masking schema drift across deploys.
  ```
- The `_aggregate.md` file is overwritten every cycle. Cycle 6 onwards, AGG5-1 lives only in the cycle-5 archived copy `_aggregate-cycle-5.md`.

**Why it's a problem:** A reader of the deploy script in cycle 30 will see "AGG5-1" with no clear path to find it.

**Fix:** Replace the cycle-5 reference with the archived path `.context/reviews/_aggregate-cycle-5.md` (same content, but the path is stable). Or, expand the comment to include the actual rationale inline so the cross-reference becomes optional.

**Exit criteria:** No cycle-specific aggregate IDs (without an archived path) in long-lived source files. Gates green.

---

## DOC6-3: [LOW, NEW] `0021_lethal_black_tom.sql` filename is auto-generated drizzle-kit nonsense and conflicts with the team's naming convention

**Severity:** LOW (consistency / readability — same surface as CR6-3)
**Confidence:** HIGH

**Evidence:**
- `drizzle/pg/0021_lethal_black_tom.sql` vs `drizzle/pg/0018_add_late_penalty_check.sql`, `drizzle/pg/0020_drop_judge_workers_secret_token.sql` — the team renames migration files for clarity.

**Fix:** Rename to `0021_add_tags_updated_at.sql` AND update `meta/_journal.json` `tag` field for idx 21.

**Exit criteria:** Filename describes intent; gates green.

---

## DOC6-4: [LOW, carry-deferred] `AGENTS.md` vs `password.ts` mismatch — needs PM/user decision

**Severity:** MEDIUM (carried; deferred reason: needs human declaration of canonical source)
**Confidence:** HIGH

**Status:** Same as cycle 3. Reaffirm carried-deferred. No new evidence to change the deferral.

---

## Final Sweep — Documentation Surfaces

- README.md: not modified this cycle. No regressions.
- AGENTS.md: not modified this cycle. The new DRIZZLE_PUSH_FORCE knob is a doc gap (DOC6-1).
- CLAUDE.md: small project-specific rules; not modified this cycle.
- `.env.example`: missing DRIZZLE_PUSH_FORCE knob (DOC6-1).
- `user-injected/`: cycle-5 brought the migration directive up to date.

**No agent failures.**
