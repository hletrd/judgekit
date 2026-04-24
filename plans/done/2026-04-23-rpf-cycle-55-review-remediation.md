# RPF Cycle 55 (Loop Cycle 3/100) — Review Remediation Plan

**Date:** 2026-04-23
**Base commit:** 64522fe9
**Source artifacts:** `.context/reviews/rpf-cycle-55-*.md`, `.context/reviews/designer-runtime-cycle-3.md`, `.context/reviews/_aggregate.md`

## Lanes

### Lane A — Implement this cycle

#### A1. User-injected TODO #1 (Languages → submenu) — VERIFY COMPLETE, CLEAN UP QUEUE

**Status:** Already implemented in prior commits `85ca2aab refactor(nav): 🏷️ move Languages from top-level nav to footer link` and `c7e8ca82 refactor(nav): 🏷️ remove Languages from top-level nav, already in footer`. Re-verified this cycle in `src/lib/navigation/public-nav.ts` (Languages absent from `getPublicNavItems()`, inline comment explains footer placement) and `src/components/layout/public-footer.tsx:23-29` (FooterLink appended unconditionally).

**Action this cycle:** Update `user-injected/pending-next-cycle.md` to remove TODO #1 or mark it done with date + commit SHAs, so it is not re-queued next cycle.

**Owner:** this-cycle implementer. **Exit criterion:** `user-injected/pending-next-cycle.md` no longer lists the Languages-submenu entry as pending.

#### A2. DES-RUNTIME-SANDBOX-BLOCK — add `SKIP_INSTRUMENTATION_SYNC` env short-circuit

**Severity:** MEDIUM / Confidence: HIGH.
**Source:** `designer-runtime-cycle-3.md`, section "Runtime Execution Attempt".
**Problem:** `src/instrumentation.ts` register hook runs `syncLanguageConfigsOnStartup()` which requires a live Postgres. Without a reachable DB the hook retries then throws, which terminates the dev server and blocks ALL runtime UI/UX review work (playwright, agent-browser, and any other tooling that needs HTTP).

**Fix:** Add an env short-circuit at the top of `syncLanguageConfigsOnStartup`: when `SKIP_INSTRUMENTATION_SYNC=1` (or when `NODE_ENV=development` AND `DISABLE_STARTUP_SYNC=1`), log a one-line warning and return early. Choose env-flag naming that is explicit and impossible to trigger in production by accident (require exact `SKIP_INSTRUMENTATION_SYNC=1`, not any truthy).

**Owner:** this-cycle implementer. **Exit criterion:** with `DATABASE_URL=<fake>` and `SKIP_INSTRUMENTATION_SYNC=1`, `npx next dev` stays up and `curl http://localhost:3000/languages` returns non-000 HTTP within 30s.

#### A3. User-injected TODO #2 (Runtime UI/UX review) — SATISFIED BY ARTIFACT

**Status:** The runtime review artifact at `.context/reviews/designer-runtime-cycle-3.md` IS the deliverable. Any HIGH-severity runtime findings are implementation targets this cycle; no HIGH findings were confirmable (the attempt was sandbox-blocked), so nothing additional to implement beyond A2 which unblocks the next runtime pass.

**Action this cycle:** Update `user-injected/pending-next-cycle.md` to mark TODO #2 as satisfied for this cycle.

**Owner:** this-cycle implementer. **Exit criterion:** `user-injected/pending-next-cycle.md` no longer lists the runtime-UI-review TODO as pending for this cycle (but may explicitly re-queue a follow-up contingent on A2 landing, so future cycles can do the real runtime walk).

### Lane B — Deferred (carry-over, preserved severity, existing exit criteria)

No changes to Lane B this cycle. All items in the aggregate "Carry-Over Items" and "New this cycle runtime-lane deferred" sections remain at their original severity and confidence with unchanged exit criteria. See `.context/reviews/_aggregate.md` for the canonical list.

## Quality Gates

- `npm run lint`: must stay PASS (0 errors).
- `npm run build`: must stay PASS.
- `npm run test:unit`: must stay PASS (ignoring the known 5000ms parallel-contention flake profile).
- `npm run test:component`: must stay PASS.
- `npm run test:integration`: expected SKIPPED under sandbox.
- `npm run test:e2e`: not run (sandbox limitation).

## Deployment

DEPLOY_MODE is end-only this cycle. No `./deploy.sh` invocation. Record `DEPLOY: end-only-deferred` in the cycle report.

## Progress

- [x] A1. Verified Languages-submenu TODO is complete. user-injected/pending-next-cycle.md cleaned.
- [x] A2. SKIP_INSTRUMENTATION_SYNC env short-circuit added to src/lib/judge/sync-language-configs.ts.
- [x] A3. user-injected/pending-next-cycle.md entry for runtime UI/UX review updated per cycle 3 (artifact delivered, follow-up re-queued contingent on A2).
