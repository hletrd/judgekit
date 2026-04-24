# RPF Cycle 3 — Test Engineer

**Date:** 2026-04-24
**Scope:** Test coverage gaps, flaky tests, TDD opportunities

## Changed-File Review

### `src/lib/judge/sync-language-configs.ts` — SKIP_INSTRUMENTATION_SYNC

The flag is a conditional early-return in a startup-only function. Testing would require:
- Setting `SKIP_INSTRUMENTATION_SYNC=1` and verifying the function returns without DB access
- Setting `SKIP_INSTRUMENTATION_SYNC=0` (or unset) and verifying normal sync behavior

This is an infrastructure-level flag for environments without DB. Unit testing it would require mocking `process.env` and the DB layer, which provides low value given the simplicity of the guard. **No test gap.**

**Verdict:** No new test issues.

## Full Test Suite Assessment

### Test Inventory

- **Unit tests:** `tests/unit/` directory with API route tests, component tests, security tests
- **E2E tests:** `tests/e2e/` with 30+ spec files covering admin, contests, groups, problems, auth, etc.
- **Component tests:** Vitest config for component tests exists

### Previously Identified (Carry-Forward)

- **TE-1 (cycle 51):** Missing integration test for concurrent recruiting token redemption — LOW/MEDIUM, deferred (requires DB)
- **#21:** vitest unit parallel-contention flakes — LOW/MEDIUM, deferred (sandbox CPU/IO contention)

### New Observations

1. The `eslint-disable` in `plugin-config-client.tsx` is for `react-hooks/static-components` with an explanatory comment. This is a legitimate override for lazily-prebuilt admin components. **No test concern.**

2. The SSE route test coverage would benefit from testing the `SKIP_INSTRUMENTATION_SYNC` interaction with the broader app startup, but this is an integration-level concern requiring a running app. **Not a unit test gap.**

## Summary

**New findings this cycle: 0**

No new test gaps. The flake (#21) remains the primary test concern and is deferred.
