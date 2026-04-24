# RPF Cycle 3 — Architect

**Date:** 2026-04-24
**Scope:** Full repository architecture, coupling, layering

## Changed-File Review

### `src/lib/judge/sync-language-configs.ts` — SKIP_INSTRUMENTATION_SYNC

The flag is an appropriate escape hatch for environments without a DB. It sits at the entry point of a startup-only function and does not alter the runtime architecture. The strict-literal check and loud warning prevent accidental production use. No architectural concern.

**Verdict:** Clean.

## Full-Repository Architecture Sweep

### Layering & Coupling

1. **API handler factory** (`src/lib/api/handler.ts`): Centralizes auth, CSRF, rate-limit, body parsing, and Zod validation. All API routes use `createApiHandler`. Consistent pattern, no drift. **Good.**

2. **Permission model** (`src/lib/auth/permissions.ts`): Three-tier check — capability-based first, then role-based, then enrollment-based. Clean separation. **Good.**

3. **Capability system** (`src/lib/capabilities/`): Cache-backed resolution with DB fallback. Custom roles supported. **Good.**

4. **SSE connection management** (`events/route.ts`): Module-level in-memory state with `globalThis` timer pattern. This is the standard Next.js approach for module-level timers in App Router. Acceptable for single-instance deployments. For multi-instance, the `realtime-coordination.ts` shared-Redis path exists. **Good.**

### Previously Identified (Carry-Forward)

- **AGG-7 / ARCH-2:** Manual routes duplicate `createApiHandler` boilerplate — MEDIUM/MEDIUM, deferred
- **ARCH-3:** Stale-while-revalidate cache pattern duplication — LOW/LOW, deferred

### New Observations

1. The SSE route (`events/route.ts`) is explicitly documented as "not migrated to createApiHandler due to streaming response" — this is a justified architectural decision. No issue.

2. The recruiting context cache via `withRecruitingContextCache` (handler.ts line 109) wraps every API handler call. This is a clean use of AsyncLocalStorage for per-request deduplication. **Good.**

## Summary

**New findings this cycle: 0**

No new architectural issues. The `SKIP_INSTRUMENTATION_SYNC` flag is architecturally sound. All prior architectural findings remain deferred.
