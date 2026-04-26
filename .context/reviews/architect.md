# Architect Review — RPF Cycle 5/100

**Date:** 2026-04-26
**Lens:** architectural / design risk, coupling, layering, schema lifecycle
**Files inventoried (review-relevant):** `src/app/api/v1/contests/[assignmentId]/analytics/route.ts`, `src/components/exam/anti-cheat-monitor.tsx`, `src/components/exam/anti-cheat-storage.ts`, `src/components/contest/anti-cheat-dashboard.tsx`, `src/lib/security/env.ts`, `src/proxy.ts`, `src/lib/navigation/public-nav.ts`, `src/components/layout/app-sidebar.tsx`, `src/lib/db/schema.pg.ts`, `drizzle/pg/*.sql`, `drizzle/pg/meta/*.json`, `deploy-docker.sh`, `package.json`, `drizzle.config.ts`.

---

## ARCH5-1: [HIGH, actionable, NEW] Drizzle migration journal vs `drizzle-kit push` lifecycle mismatch — schema drop blocked at deploy

**Severity:** HIGH (architectural — schema-vs-deploy contract violated)
**Confidence:** HIGH (orchestrator surfaced the symptom; verified mechanics directly)

**Evidence:**
- `drizzle/pg/0020_drop_judge_workers_secret_token.sql` exists and contains `ALTER TABLE "judge_workers" DROP COLUMN "secret_token";`.
- `drizzle/pg/meta/_journal.json` lists `idx: 20, tag: "0020_drop_judge_workers_secret_token"` (line 145-150).
- BUT `drizzle/pg/meta/0020_snapshot.json` is **MISSING**. The latest snapshot file is `0019_snapshot.json`, and it still contains a `secret_token` column entry.
- `meta/0017_snapshot.json` and `meta/0019_snapshot.json` BOTH still contain `secret_token` — the snapshot was never regenerated to reflect the drop.
- `src/lib/db/schema.pg.ts:418-420` no longer has `secretToken`; only `secretTokenHash`.
- `deploy-docker.sh:547,564-565` runs `npx drizzle-kit push`, NOT `npx drizzle-kit migrate`. `drizzle-kit push` ignores SQL files in the journal — it diffs `schema.pg.ts` against the live DB and errors interactively on data loss.

**Why it's a problem:**
1. Schema-vs-DB drift is unbounded. Each deploy attempts to drop `secret_token`; the prompt fails non-interactively; `[OK] Database migrated` is reported anyway because the script runs additive repairs after the push, masking the failure.
2. The 0020 SQL migration is dead code. It was authored but the deploy mechanism doesn't consume it.
3. Snapshot lifecycle is broken. Drizzle-kit's "generate" command produces both the SQL file AND a fresh `<idx>_snapshot.json` — the missing snapshot for `0020` indicates the migration was hand-authored without `drizzle-kit generate`. Future `drizzle-kit generate` runs will incorrectly diff against `0019_snapshot.json` (which still has `secret_token`), producing duplicate or conflicting migrations.
4. Production data is at risk. When `drizzle-kit push` finally executes (with `--force` or after someone hits "y" interactively), it'll drop the column. If any auth-token migration to the hash column failed silently, plaintext tokens are dropped without a rollback path.

**Failure scenario:** A future maintainer runs `npx drizzle-kit generate` after editing the schema. Drizzle-kit reads `meta/0019_snapshot.json` (which still has `secret_token`), diffs against the new schema (which has neither), and emits a NEW `drop_secret_token` migration on top of the orphaned 0020. The journal accumulates duplicate intent.

**Fix:**
1. Regenerate the snapshot. Either: (a) `npx drizzle-kit generate` to refresh `0020_snapshot.json` from `schema.pg.ts`, then commit; or (b) hand-author `meta/0020_snapshot.json` matching the post-drop state.
2. Switch `deploy-docker.sh` from `drizzle-kit push` to `drizzle-kit migrate` so the journal IS the source of truth and destructive migrations are applied via the SQL file (no interactive prompt).
3. Alternatively, if `drizzle-kit push` must stay, add `--force` (only after confirming the snapshot is consistent with the schema).
4. Document in `AGENTS.md` and the deploy script which command is canonical.

**Exit criteria:**
- `drizzle/pg/meta/0020_snapshot.json` exists and reflects the post-drop state (no `secret_token` column).
- A clean deploy from a state where the column already exists in the DB succeeds without the data-loss prompt erroring out.
- A future `drizzle-kit generate` does NOT emit another `drop_secret_token` migration.

---

## ARCH5-2: [LOW, actionable, NEW] `__test_internals` runtime gate uses double-cast `undefined as unknown as <type>` — type-system foot-gun

**Severity:** LOW
**Confidence:** HIGH

**Evidence:** `src/app/api/v1/contests/[assignmentId]/analytics/route.ts:101-118`:
```ts
export const __test_internals =
  process.env.NODE_ENV === "test"
    ? { hasCooldown, setCooldown, cacheDelete, cacheClear }
    : (undefined as unknown as {
        hasCooldown: (key: string) => boolean;
        ...
      });
```

**Why it's a problem:** The `undefined as unknown as <type>` double-cast tells TypeScript the value is the methods object even when it isn't. Any test that imports `__test_internals` from a non-`test` build will type-check successfully and crash at runtime with "Cannot read properties of undefined (reading 'hasCooldown')". The cycle-4 plan wanted fail-fast behavior; the actual implementation hides the type from the type-system. A future contributor who calls `__test_internals.cacheClear()` from a non-test code path gets full IDE autocomplete and zero warning.

**Fix:** Make the type honest: `... | undefined`. Force callers to null-check.
```ts
type TestInternals = { hasCooldown: ...; setCooldown: ...; cacheDelete: ... };
export const __test_internals: TestInternals | undefined =
  process.env.NODE_ENV === "test"
    ? { hasCooldown, setCooldown, cacheDelete }
    : undefined;
```
Update the test to `__test_internals!.setCooldown(...)` (the `!` is acceptable in tests where we know NODE_ENV is `test`).

**Exit criteria:**
- The TypeScript type of `__test_internals` is `TestInternals | undefined`.
- No double-cast `as unknown as`.
- Tests still pass (using non-null assertion).

---

## ARCH5-3: [LOW, deferred-carry] Anti-cheat monitor scheduleRetryRef latching pattern is intentional but fragile to future contributors

**Severity:** LOW
**Confidence:** MEDIUM

**Evidence:** `src/components/exam/anti-cheat-monitor.tsx:95,109-122`. `scheduleRetryRef` is initialized with a no-op then mutated in a `useEffect`. Cycle 4 reviewed and accepted this pattern, but the pattern is non-obvious. The recursion `scheduleRetryRef.current(retryRemaining)` inside the timer means if the effect re-runs between `setTimeout` and timer fire, the mid-flight closure points to the old `performFlush`. Documented at lines 82-94, but this is exactly the kind of subtle pattern that breaks under refactor.

**Why deferring:** Pattern works correctly; cycles 1-4 documented and verified. Risk is hypothetical-future, not present.

**Exit criterion for re-open:** A bug report where retry timer references stale state, or a refactor that touches lines 95-122 without being deeply familiar with the latch pattern.

---

## Final Sweep

- All four files modified relative to last cycle (`route.ts`, `anti-cheat-monitor.tsx`, `env.ts`, `proxy.ts`) are committed and clean.
- The schema/deploy drift (ARCH5-1) was the only material new architectural finding this cycle. It is high-signal because deploy log evidence is observed and reproduces deterministically.
- No new coupling/layering regressions detected.
- No agent failures.
