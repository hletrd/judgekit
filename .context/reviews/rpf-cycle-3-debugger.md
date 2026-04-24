# RPF Cycle 3 — Debugger (Latent Bug Surface, Failure Modes, Regressions)

**Date:** 2026-04-24
**Scope:** Full repository — failure modes, latent bugs, regression risk

## Changed-File Review

### `src/lib/judge/sync-language-configs.ts` — SKIP_INSTRUMENTATION_SYNC

**Failure mode analysis:**

1. **Flag set but DB is available:** Sync is skipped, language configs may be stale. Impact: new languages added to `DEFAULT_JUDGE_LANGUAGES` won't appear in the DB until the flag is removed and the app restarts. **Low impact — flag is for environments without DB.**

2. **Flag NOT set but DB is unavailable:** Retry loop runs up to 10 times with exponential backoff (1s, 2s, 4s, ..., 30s cap). After ~5 minutes of retries, the app throws and the startup fails. **Correct failure mode — fail loudly rather than silently proceeding without language configs.**

3. **Race condition:** Could two instances of `syncLanguageConfigsOnStartup` run concurrently? **No** — this is called once during app startup via `instrumentation.ts`. Even in dev with HMR, the function is idempotent (it compares existing configs before inserting/updating).

**Verdict:** No latent bugs in the change.

## Full-Repository Failure Mode Sweep

### SSE Connection Tracking

**Failure mode:** If the process crashes, in-memory connection tracking is lost. On restart, stale SSE connections from clients will time out naturally. The `staleThreshold` cleanup (line 102-111) handles orphaned tracking entries in long-running processes. **Acceptable.**

### Rate Limiting

**Failure mode:** If the DB is slow, `atomicConsumeRateLimit` blocks on the transaction. The sidecar pre-check (line 157) provides a fast-path that can short-circuit without hitting the DB. If both sidecar and DB are unavailable, the API will hang or timeout. **No latent bug — expected degradation.**

### Compiler Execution

**Failure mode:** `spawn` errors (line 404) are caught and re-thrown. Container cleanup (`docker rm -f`) runs in a finally block. Orphan containers are cleaned up by the periodic orphan-sweep (separate mechanism). **Acceptable.**

### Previously Identified (Carry-Forward)

No new failure modes discovered this cycle beyond those already documented in prior cycles.

## Summary

**New findings this cycle: 0**

No new latent bugs, failure modes, or regressions found. The single code change has well-understood failure modes.
