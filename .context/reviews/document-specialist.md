# Document Specialist Review — RPF Cycle 40

**Date:** 2026-04-23
**Reviewer:** document-specialist
**Base commit:** f030233a

## Inventory of Documentation Reviewed

- `CLAUDE.md` — Project rules
- `AGENTS.md` — Agent guide
- `.context/` — Context directory
- `src/app/api/v1/groups/[id]/assignments/[assignmentId]/route.ts` — Missing JSDoc for active-contest check
- `src/lib/compiler/execute.ts` — Shell command validation comments (verified)
- `src/lib/assignments/recruiting-constants.ts` — Shared constants (verified JSDoc)

## Previously Fixed Items (Verified)

- Import TABLE_MAP drift warning comment: Fixed
- Recruiting-constants JSDoc: Present

## New Findings

### DOC-1: Assignment PATCH route lacks comment about `Date.now()` clock-skew risk [LOW/LOW]

**File:** `src/app/api/v1/groups/[id]/assignments/[assignmentId]/route.ts:99`

**Description:** The assignment PATCH route uses `Date.now()` for the active-contest check without a comment explaining why app server time is used instead of DB server time. Every other schedule comparison in the codebase uses `getDbNowUncached()` and has comments about clock skew. This missing documentation could mislead future developers into thinking `Date.now()` is acceptable for schedule checks.

If the fix is applied (replacing with `getDbNowUncached()`), a comment should be added explaining the choice, consistent with the comments in the recruiting invitation routes.

**Fix:** If fixing the clock-skew issue, add a comment:
```typescript
// Use DB server time to avoid clock skew between app and DB servers,
// consistent with the recruiting invitation routes.
const now = await getDbNowUncached();
```

**Confidence:** Low

---

### Carry-Over Items

- **DOC-1 (from prior cycles):** SSE route ADR (LOW/LOW, deferred)
- **DOC-2 (from prior cycles):** Docker client dual-path behavior documentation (LOW/LOW, deferred)
