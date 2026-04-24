# RPF Cycle 1 (loop cycle 1/100) — Document Specialist

**Date:** 2026-04-24
**HEAD:** 8af86fab
**Reviewer:** document-specialist

## Scope

Reviewed documentation-code alignment across:
- `AGENTS.md` — authoritative project documentation
- `CLAUDE.md` — project rules and deployment constraints
- `src/lib/judge/languages.ts` — language definitions vs AGENTS.md table
- `src/lib/judge/sync-language-configs.ts` — SKIP_INSTRUMENTATION_SYNC vs docs
- `src/lib/db/schema.pg.ts` — schema vs documentation claims
- `docs/` — language docs, architecture docs

## New Findings

**No new findings this cycle.**

## Documentation-Code Alignment Check

1. **AGENTS.md language table** — The table lists 125 language variants (IDs 1-124 plus 6b, 8b, etc.). The authoritative source is `src/lib/judge/languages.ts` + `docs/languages.md`. AGENTS.md correctly notes this and instructs readers to treat the code as source of truth when the table drifts.

2. **SKIP_INSTRUMENTATION_SYNC** — Documented in `sync-language-configs.ts` comments (lines 69-81), the cycle-55 plan, and `designer-runtime-cycle-3.md`. The comment in the code explicitly warns "DO NOT use this in production" and references the plan document. Aligned.

3. **CSRF header name** — AGENTS.md explicitly states: "This is the correct header name — do not use `x-csrf-token`." The code in `src/lib/security/csrf.ts` correctly uses `X-Requested-With`. Aligned.

4. **Password validation** — AGENTS.md states "exactly 8 characters minimum, no other rules." The code in `src/lib/security/password.ts` uses `FIXED_MIN_PASSWORD_LENGTH = 8` and only checks `password.length < 8`. Aligned.

5. **Select component pattern** — AGENTS.md documents the SelectValue static-children pattern. The code follows this pattern. Aligned.

## Deferred Item Status (Unchanged)

- **DOC-1:** SSE route ADR — LOW/LOW, deferred
- **DOC-2:** Docker client dual-path docs — LOW/LOW, deferred

## Confidence

HIGH — documentation and code are well-aligned.
