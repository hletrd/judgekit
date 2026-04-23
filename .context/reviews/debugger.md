# Debugger Review — RPF Cycle 40

**Date:** 2026-04-23
**Reviewer:** debugger
**Base commit:** f030233a

## Inventory of Files Reviewed

- `src/app/api/v1/groups/[id]/assignments/[assignmentId]/route.ts` — Assignment PATCH (clock-skew bug)
- `src/app/api/v1/contests/[assignmentId]/anti-cheat/route.ts` — Anti-cheat events (non-null assertions)
- `src/app/api/v1/submissions/route.ts` — Submissions (Date.now() usage in rate limit)
- `src/app/api/v1/contests/quick-create/route.ts` — Quick-create (verified NaN guard)
- `src/lib/compiler/execute.ts` — Compiler execution (container lifecycle)

## Previously Fixed Items (Verified)

- Exam session short-circuit for non-exam: Fixed
- Un-revoke transition removed: Fixed
- Bulk invitation MAX_EXPIRY_MS guard: Fixed
- Quick-create NaN guard: Fixed

## New Findings

### DBG-1: Assignment PATCH `Date.now()` vs DB time — latent clock-skew bug [MEDIUM/MEDIUM]

**File:** `src/app/api/v1/groups/[id]/assignments/[assignmentId]/route.ts:99-101`

**Description:** Tracing the failure mode for clock skew:

1. App server and DB server clocks differ by N seconds (common in Docker/VM setups)
2. Line 99: `const now = Date.now();` — app server time = T_app
3. Line 100: `startsAt` is read from DB, so it's in DB time = T_db
4. Line 101: `if (startsAt && now >= startsAt)` — compares T_app >= T_db

If T_app < T_db (app server behind), the check falsely allows problem changes during an active contest.

If T_app > T_db (app server ahead), the check falsely blocks pre-contest edits.

The failure is subtle — it only manifests when the clocks differ by enough to cross the `startsAt` boundary, and the instructor is trying to edit problems right around contest start time. This is exactly when edits are most likely and the protection is most important.

**Concrete failure scenario:** A Docker container's system clock drifts 30 seconds behind the PostgreSQL server. An exam-mode contest starts at 10:00:00 DB time. At 10:00:20 DB time (9:59:50 app time), an instructor sends a PATCH to change problem points. The `Date.now()` check returns 9:59:50, which is < 10:00:00, so the active-contest block is bypassed. Problems are modified during an active exam.

**Fix:** Use `getDbNowUncached()`:
```typescript
const now = await getDbNowUncached();
const startsAt = assignment.startsAt ? new Date(assignment.startsAt).getTime() : null;
if (startsAt && now.getTime() >= startsAt) {
```

**Confidence:** Medium

---

### DBG-2: Anti-cheat heartbeat gap detection — non-null assertion on nullable field [LOW/LOW]

**File:** `src/app/api/v1/contests/[assignmentId]/anti-cheat/route.ts:211-213`

**Description:** The code at line 211 checks `if (!heartbeats[i - 1].createdAt || !heartbeats[i].createdAt) continue;` but lines 212-213 use `heartbeats[i - 1].createdAt!` and `heartbeats[i].createdAt!` with non-null assertions. If the null guard at line 211 were removed in a future refactor, the `!` assertions would suppress the TypeScript error but produce `Invalid Date` at runtime.

The practical impact is minimal because the null guard is present, but the `!` assertions are redundant and misleading.

**Fix:** Remove the non-null assertions:
```typescript
if (!heartbeats[i - 1].createdAt || !heartbeats[i].createdAt) continue;
const prev = new Date(heartbeats[i - 1].createdAt).getTime();
const curr = new Date(heartbeats[i].createdAt).getTime();
```

**Confidence:** Low
