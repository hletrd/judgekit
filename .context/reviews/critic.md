# Critic Review — RPF Cycle 37

**Date:** 2026-04-23
**Reviewer:** critic
**Base commit:** 3d729cee

## Multi-Perspective Critique

This review examines the change surface from multiple angles: correctness, security, maintainability, UX, and operational safety.

### CRI-1: quick-create route lacks NaN guard for Date construction — inconsistent defense-in-depth [MEDIUM/MEDIUM]

**File:** `src/app/api/v1/contests/quick-create/route.ts:31-34`

**Description:** All recruiting invitation routes now have `Number.isFinite()` defense-in-depth guards after Date construction, but the quick-create route does not. The Zod schema validates `.datetime()` format, but the defense-in-depth pattern is inconsistent. If Zod validation is ever loosened or the schema reused, the NaN comparison `NaN >= NaN` evaluates to false, bypassing the schedule validation. This is the same class of bug that was fixed in the invitation routes in cycles 35-36.

**Confidence:** High

---

### CRI-2: MAX_EXPIRY_MS constant duplicated across invitation routes — maintenance risk [LOW/MEDIUM]

**File:** `src/app/api/v1/contests/[assignmentId]/recruiting-invitations/route.ts:69`, `[invitationId]/route.ts:110`, `bulk/route.ts:30`

**Description:** The `MAX_EXPIRY_MS = 10 * 365.25 * 24 * 60 * 60 * 1000` constant is defined identically in 3 separate route files. This is a DRY violation that creates maintenance risk for expiry policy changes.

**Confidence:** High

---

### CRI-3: SSE realtime-coordination LIKE queries missing ESCAPE clause — convention inconsistency [LOW/LOW]

**File:** `src/lib/realtime/realtime-coordination.ts:94, 107`

**Description:** Two LIKE queries in the realtime coordination module omit the `ESCAPE '\\'` clause used consistently everywhere else. The data is server-controlled and safe, but the inconsistency undermines the codebase convention.

**Confidence:** High

---

### Positive Observations

- The TABLE_MAP derivation from TABLE_ORDER (import.ts lines 19-22) is a clean, correct fix that eliminates the drift risk permanently.
- The `verifyAndRehashPassword` consolidation is well-implemented with audit logging.
- The `isStreamingRef` pattern correctly eliminates the stale-closure race and stabilizes the callback chain.
- The SSE stale threshold TTL cache is a pragmatic solution that reduces DB load while maintaining timely config updates.
- The contest stats CTE optimization (reusing `user_best` in `solved_problems`) correctly avoids the double scan.
