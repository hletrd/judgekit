# Tracer Review — RPF Cycle 43

**Date:** 2026-04-23
**Reviewer:** tracer
**Base commit:** b0d843e7

## Causal Tracing of Suspicious Flows

### TR-1: Submission rate-limit `Date.now()` vs DB-stored `submittedAt` — two different time sources in one comparison [MEDIUM/MEDIUM]

**File:** `src/app/api/v1/submissions/route.ts:249,257,318`

**Causal trace:**
1. User sends POST /api/v1/submissions at app-server wall-clock time T_app
2. Line 249: `oneMinuteAgo = new Date(Date.now() - 60_000)` — threshold computed from T_app
3. Line 257: SQL `CASE WHEN submittedAt > ${oneMinuteAgo}` — DB timestamps compared against T_app threshold
4. Line 318: `submittedAt: await getDbNowUncached()` — new submission stored with T_db time

The comparison at step 3 crosses a trust boundary: T_app (untrusted relative to DB) is compared against T_db (authoritative). Under clock skew where T_app < T_db, the effective rate-limit window widens, allowing more submissions than intended.

**Competing hypotheses:**
- H1: Clock skew is negligible in production (container orchestration syncs NTP). **Rejected:** The codebase has previously fixed clock-skew bugs in assignment PATCH, recruiting invitations, and exam session routes, indicating skew is a real production concern.
- H2: The advisory lock prevents true concurrent bypass. **Partially accepted:** The advisory lock serializes concurrent submissions from the same user, but it doesn't prevent a user from making rapid sequential submissions that each pass the rate check.

**Fix:** Use `getDbNowUncached()` for the `oneMinuteAgo` computation.

**Confidence:** Medium
