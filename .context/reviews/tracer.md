# Tracer Review — RPF Cycle 40

**Date:** 2026-04-23
**Reviewer:** tracer
**Base commit:** f030233a

## Causal Tracing of Suspicious Flows

### TR-1: Assignment PATCH `Date.now()` vs DB time — clock-skew vulnerability [MEDIUM/MEDIUM]

**File:** `src/app/api/v1/groups/[id]/assignments/[assignmentId]/route.ts:99-101`

**Description:** Tracing the failure flow:

1. Instructor sends PATCH to change problems on an exam-mode contest
2. Line 98: `if (body.problems !== undefined && assignment.examMode !== "none")` — enters the block
3. Line 99: `const now = Date.now();` — app server local time
4. Line 100: `const startsAt = assignment.startsAt ? new Date(assignment.startsAt).getTime() : null;` — DB time
5. Line 101: `if (startsAt && now >= startsAt)` — comparing apples to oranges

**Hypothesis 1 (confirmed):** Clock skew bypasses the active-contest protection. When the app server clock is behind the DB server clock, `Date.now()` < `startsAt`, so the check fails and problem changes are allowed during an active contest. This is a TOCTOU-like race condition between the two time sources.

**Hypothesis 2 (possible):** The `Date.now()` usage was intentional for performance (avoiding a DB round trip). However, `getDbNowUncached()` is already used in the same route's transaction (line 362 via `withUpdatedAt`), so the overhead of one additional call is minimal compared to the security benefit.

**Fix:** Replace `Date.now()` with `getDbNowUncached()`:
```typescript
const now = await getDbNowUncached();
const startsAt = assignment.startsAt ? new Date(assignment.startsAt).getTime() : null;
if (startsAt && now.getTime() >= startsAt) {
```

**Confidence:** Medium

---

### Previously Fixed Items (Verified)

- Un-revoke transition removed: Fixed
- Exam session short-circuit: Fixed
- Bulk invitation MAX_EXPIRY_MS guard: Fixed
