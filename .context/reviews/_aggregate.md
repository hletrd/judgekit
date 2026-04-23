# RPF Cycle 37 — Aggregate Review

**Date:** 2026-04-23
**Base commit:** 3d729cee
**Review artifacts:** code-reviewer.md, perf-reviewer.md, security-reviewer.md, architect.md, critic.md, verifier.md, debugger.md, test-engineer.md, tracer.md, designer.md, document-specialist.md

## Deduped Findings (sorted by severity then signal)

### AGG-1: quick-create route lacks NaN guard for Date construction — inconsistent defense-in-depth [MEDIUM/HIGH]

**Flagged by:** code-reviewer (CR-2), security-reviewer (SEC-1), critic (CRI-1), verifier (V-1), debugger (DBG-1), tracer (TR-1), test-engineer (TE-1), document-specialist (DOC-1)
**Signal strength:** 8 of 11 review perspectives

**File:** `src/app/api/v1/contests/quick-create/route.ts:31-34`

**Description:** The quick-create route constructs `new Date(body.startsAt)` and `new Date(body.deadline)` from client-provided strings without the `Number.isFinite()` defense-in-depth check. All recruiting invitation routes (single, bulk, PATCH) received this guard in cycles 35-36, but the quick-create route was missed. If `body.startsAt` or `body.deadline` produces `Invalid Date`, the comparison `startsAt.getTime() >= deadline.getTime()` evaluates to false (NaN comparisons), bypassing the schedule validation check.

**Concrete failure scenario:** If Zod validation is ever loosened or the schema reused without the `.datetime()` guard, an attacker sends `startsAt: "garbage"`. The comparison `NaN >= number` evaluates to false, so the "startsAt >= deadline" check passes (the check returns error only when true). The contest is created with corrupted timestamps, potentially allowing submissions outside the intended time window.

**Fix:** Add NaN guards after Date construction:
```typescript
const startsAt = body.startsAt ? new Date(body.startsAt) : now;
if (!Number.isFinite(startsAt.getTime())) return apiError("invalidStartsAt", 400);
const deadline = body.deadline ? new Date(body.deadline) : new Date(now.getTime() + 30 * 24 * 3600000);
if (!Number.isFinite(deadline.getTime())) return apiError("invalidDeadline", 400);
```

---

### AGG-2: MAX_EXPIRY_MS constant duplicated across 3 invitation route files — DRY violation [LOW/MEDIUM]

**Flagged by:** architect (ARCH-1), critic (CRI-2)
**Signal strength:** 2 of 11 review perspectives

**Files:** `src/app/api/v1/contests/[assignmentId]/recruiting-invitations/route.ts:69`, `[invitationId]/route.ts:110`, `bulk/route.ts:30`

**Description:** The `MAX_EXPIRY_MS = 10 * 365.25 * 24 * 60 * 60 * 1000` constant is defined identically in 3 separate invitation route files. If the maximum expiry policy changes, all 3 must be updated in lockstep. This is a minor DRY violation that could lead to inconsistent expiry limits.

**Concrete failure scenario:** A policy change increases the maximum expiry from 10 years to 15 years. The developer updates 2 of the 3 route files but misses the bulk route. Bulk-created invitations now have a different maximum than single-created ones.

**Fix:** Extract to a shared constant in `src/lib/assignments/recruiting-constants.ts`.

---

### AGG-3: SSE realtime-coordination LIKE queries missing ESCAPE clause — inconsistent defense-in-depth [LOW/LOW]

**Flagged by:** code-reviewer (CR-1), security-reviewer (SEC-2), critic (CRI-3)
**Signal strength:** 3 of 11 review perspectives

**File:** `src/lib/realtime/realtime-coordination.ts:94, 107`

**Description:** The `getSsePrefixPattern()` returns `realtime:sse:user:%` used in LIKE queries without `ESCAPE '\\'`. Every other LIKE query in the codebase uses the ESCAPE clause consistently. The prefix is server-controlled and contains no wildcards, so this is not a security vulnerability. However, the inconsistency could lead a developer to copy the pattern for user-input queries without the ESCAPE clause.

**Fix:** Add `ESCAPE '\\'` to both LIKE queries for consistency.

---

### AGG-4: Chat widget minimized button badge lacks ARIA announcement for message count [LOW/LOW]

**Flagged by:** designer (DES-1)
**Signal strength:** 1 of 11 review perspectives

**File:** `src/lib/plugins/chat-widget/chat-widget.tsx:284-288`

**Description:** The minimized chat button shows a visual badge with the count of assistant messages but has no ARIA indication of the count. Screen reader users hear only "Chat" when the widget is minimized, without knowing how many messages are waiting.

**Fix:** Add an `aria-label` to the button that includes the message count.

---

## Carry-Over Items (Still Unfixed from Prior Cycles)

- **Prior AGG-5:** Console.error in client components instead of structured logging (deferred)
- **Prior AGG-6:** SSE O(n) eviction scan (deferred — bounded by 1000 cap)
- **Prior AGG-7:** Manual routes duplicate createApiHandler boilerplate (deferred)
- **Prior AGG-8:** Global timer HMR pattern duplication (deferred)
- **Prior SEC-3:** Anti-cheat copies user text content (deferred)
- **Prior SEC-4:** Docker build error leaks paths (deferred)
- **Prior DOC-1:** SSE route ADR (deferred)
- **Prior DOC-2:** Docker client dual-path behavior documentation (deferred)

## Verified Fixes This Cycle

All major findings from cycles 35-36 have been verified as fixed:
1. PATCH invitation NaN guard (AGG-1 from cycle 36)
2. Password rehash consolidation (AGG-2 from cycle 36)
3. LIKE pattern escaping (AGG-3 from cycle 36)
4. Chat textarea aria-label (AGG-4 from cycle 36)
5. isStreaming ref in sendMessage (CR-1 from cycle 34)
6. TABLE_MAP derived from TABLE_ORDER (CR-2/ARCH-1 from cycle 34)
7. SSE stale threshold caching (PERF-1 from cycle 34)
8. Import JSON body deprecation with Sunset header
9. TABLE_MAP/TABLE_ORDER consistency test

## Deferred Items

| Finding | File+Line | Severity/Confidence | Reason for Deferral | Exit Criterion |
|---------|-----------|-------------------|--------------------|---------------|
| PERF-1: Shared poll timer reads config on restart | events/route.ts:161 | LOW/LOW | Timer only restarts on first subscriber after quiet period; infrequent | Performance profiling shows bottleneck |
| PERF-2: SSE connection eviction linear search | events/route.ts:44-55 | LOW/LOW | Bounded by 1000-entry cap; O(n) is acceptable | Cap is raised significantly |
| DOC-1: quick-create route JSDoc | quick-create/route.ts | LOW/LOW | Documentation-only | Next documentation cycle |
| DOC-2: SSE route ADR | events/route.ts | LOW/LOW | Documentation-only | Next documentation cycle |
| DOC-3: Docker client dual-path docs | docker/client.ts | LOW/LOW | Documentation-only | Next documentation cycle |
