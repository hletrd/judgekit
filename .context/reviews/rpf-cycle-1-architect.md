# RPF Cycle 1 (loop cycle 1/100) — Architect

**Date:** 2026-04-24
**HEAD:** 8af86fab
**Reviewer:** architect

## Scope

Reviewed architectural patterns, coupling, and layering across:
- `src/lib/api/handler.ts` — createApiHandler factory pattern
- `src/lib/db/schema.pg.ts` — schema design, table relationships
- `src/lib/db/queries.ts` — query patterns
- `src/lib/auth/` — auth layer architecture
- `src/lib/security/` — security layer architecture
- `src/lib/realtime/` — SSE coordination architecture
- `src/lib/compiler/` — Docker execution architecture
- `src/app/api/v1/` — API route structure
- `judge-worker-rs/` — Rust worker architecture

## New Findings

**No new findings this cycle.**

## Architectural Assessment

1. **API handler factory** — `createApiHandler` is a well-designed middleware pipeline: rate-limit -> auth -> CSRF -> body parsing -> handler. The factory pattern eliminates boilerplate across 60+ API routes. The capability-based authorization (`capabilities` + `requireAllCapabilities`) is a good pattern for fine-grained access control.

2. **Database schema** — Comprehensive schema with proper FK constraints, cascading deletes where appropriate (`enrollments`, `assignment_problems`), `SET NULL` for soft disassociation (`submissions.assignmentId`), and defensive check constraints. The `users_lower_username_idx` for case-insensitive lookups is a good optimization. Index coverage is thorough.

3. **Security layering** — CSRF, rate limiting, and auth are properly layered. The `createApiHandler` factory ensures consistent application across routes. The separation of `validateCsrf()` (reusable) from the handler factory is clean.

4. **SSE coordination** — The `pg_advisory_xact_lock` pattern for distributed SSE slot acquisition is architecturally sound. It avoids the need for a separate coordination service while providing distributed consistency.

5. **Docker architecture** — The separation of concerns (Next.js app on algo.xylolabs.com, judge worker on worker-0) is correct. The `docker-proxy` sidecar pattern for Docker socket access is a good security practice.

## Deferred Item Status (Unchanged)

- **AGG-7 / ARCH-2:** Manual routes duplicate `createApiHandler` boilerplate — MEDIUM/MEDIUM, deferred
- **ARCH-3:** Stale-while-revalidate cache pattern duplication — LOW/LOW, deferred

## Confidence

HIGH — the architecture is well-structured with proper separation of concerns.
