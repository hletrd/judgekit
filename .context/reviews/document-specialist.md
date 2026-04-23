# Document Specialist Review — RPF Cycle 43

**Date:** 2026-04-23
**Reviewer:** document-specialist
**Base commit:** b0d843e7

## Inventory of Documentation Reviewed

- `CLAUDE.md` — Project rules
- `AGENTS.md` — Agent guide
- `.context/` — Context directory
- `src/app/api/v1/submissions/route.ts` — Submission route (missing comment about Date.now)
- `src/lib/compiler/execute.ts` — Shell command validation comments (verified)
- `src/lib/assignments/recruiting-constants.ts` — Shared constants (verified JSDoc)

## Previously Fixed Items (Verified)

- Import TABLE_MAP drift warning comment: Fixed
- Recruiting-constants JSDoc: Present

## New Findings

### DOC-1: Submission route rate-limit `Date.now()` lacks comment about clock-skew risk [LOW/LOW]

**File:** `src/app/api/v1/submissions/route.ts:249`

**Description:** The submission route uses `Date.now()` for the rate-limit window without a comment explaining the inconsistency with the codebase convention of using `getDbNowUncached()`. Every other schedule comparison in the codebase that was using `Date.now()` has been migrated to `getDbNowUncached()` with comments about clock skew. This missing documentation could mislead future developers.

**Fix:** If the clock-skew issue is fixed, add a comment:
```typescript
// Use DB server time for the rate-limit window to avoid clock skew
// between app and DB servers, consistent with other schedule checks.
const dbNow = await getDbNowUncached();
const oneMinuteAgo = new Date(dbNow.getTime() - 60_000);
```

**Confidence:** Low

---

### Carry-Over Items

- **DOC-1 (from prior cycles):** SSE route ADR (LOW/LOW, deferred)
- **DOC-2 (from prior cycles):** Docker client dual-path behavior documentation (LOW/LOW, deferred)
