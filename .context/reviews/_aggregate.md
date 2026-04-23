# RPF Cycle 38 — Aggregate Review

**Date:** 2026-04-23
**Base commit:** 4dd3d951
**Review artifacts:** code-reviewer.md, perf-reviewer.md, security-reviewer.md, architect.md, critic.md, verifier.md, debugger.md, test-engineer.md, tracer.md, designer.md, document-specialist.md

## Deduped Findings (sorted by severity then signal)

### AGG-1: Bulk invitation email duplicate check is case-sensitive — inconsistent with single route [MEDIUM/HIGH]

**Flagged by:** code-reviewer (CR-1), security-reviewer (SEC-1), critic (CRI-1), verifier (V-1), debugger (DBG-1), tracer (TRACE-1), test-engineer (TE-1), architect (ARCH-1)
**Signal strength:** 8 of 11 review perspectives

**File:** `src/app/api/v1/contests/[assignmentId]/recruiting-invitations/bulk/route.ts:41-49`

**Description:** The bulk invitation route checks for duplicate emails using `inArray(recruitingInvitations.candidateEmail, orderedEmails)` which does a case-sensitive match in PostgreSQL. The single-create route correctly uses `sql\`lower(${recruitingInvitations.candidateEmail}) = ${normalizedEmail}\`` for case-insensitive matching. The `orderedEmails` array contains lowercased emails (from lines 20-22), but the DB column stores the original casing from prior single-create calls.

**Concrete failure scenario:** An instructor creates a single invitation with email "Alice@Example.COM", then bulk-creates invitations including "alice@example.com". The bulk route's case-sensitive `inArray` does not detect the existing record, creating a duplicate invitation. The candidate receives two separate invitation emails with different tokens.

**Fix:** Use case-insensitive comparison in the bulk route, consistent with the single-create route:
```typescript
if (orderedEmails.length > 0) {
  const existing = await tx
    .select({ email: sql<string>`lower(${recruitingInvitations.candidateEmail})` })
    .from(recruitingInvitations)
    .where(
      and(
        eq(recruitingInvitations.assignmentId, assignmentId),
        sql`lower(${recruitingInvitations.candidateEmail}) = ANY(${orderedEmails})`
      )
    );
  if (existing.length > 0) {
    throw new Error("emailAlreadyInvited");
  }
}
```

---

### AGG-2: Chat widget error message lacks `role="alert"` — screen readers don't announce errors [MEDIUM/MEDIUM]

**Flagged by:** code-reviewer (CR-3), designer (DES-1)
**Signal strength:** 2 of 11 review perspectives

**File:** `src/lib/plugins/chat-widget/chat-widget.tsx:353-356`

**Description:** The error message div in the chat widget has no ARIA role. Screen readers will not announce the error when it appears. The messages container has `role="log"` (line 320) which announces new messages, but the error div is separate from the message flow and not announced.

**Concrete failure scenario:** A screen reader user sends a chat message that fails (rate limit, network error). The error text appears visually but is not announced by the screen reader. The user thinks their message is still processing and waits indefinitely.

**Fix:** Add `role="alert"` to the error div:
```tsx
<div role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
  {error}
</div>
```

---

### AGG-3: `expiryDays * 86400000` arithmetic duplicated across 5 route files — DRY violation [LOW/MEDIUM]

**Flagged by:** code-reviewer (CR-2), architect (ARCH-2)
**Signal strength:** 2 of 11 review perspectives

**Files:** `recruiting-invitations/route.ts:72`, `[invitationId]/route.ts:112`, `bulk/route.ts:61`, `api-keys/route.ts:78`, `api-keys/[id]/route.ts:61`

**Description:** The `new Date(dbNow.getTime() + expiryDays * 86400000)` pattern appears identically in 5 route files. While `MAX_EXPIRY_MS` was extracted to `recruiting-constants.ts` in cycle 37, the day-to-millisecond conversion is still duplicated.

**Concrete failure scenario:** A developer adds a new route that computes expiresAt from expiryDays but makes a subtle error in the arithmetic. All 5 existing sites are correct, but the new one has a bug that goes unnoticed because there's no shared utility to test.

**Fix:** Extract a shared helper:
```typescript
export function computeExpiryFromDays(baseDate: Date, expiryDays: number): Date {
  return new Date(baseDate.getTime() + expiryDays * 86400000);
}
```

---

### AGG-4: API key created-key dialog has no auto-dismiss — raw key visible indefinitely [LOW/MEDIUM]

**Flagged by:** security-reviewer (SEC-3), designer (DES-2)
**Signal strength:** 2 of 11 review perspectives

**File:** `src/app/(dashboard)/dashboard/admin/api-keys/api-keys-client.tsx:288-329`

**Description:** The raw API key dialog stays open until the user clicks "Done". There is no automatic timeout or auto-dismissal. If the admin walks away from their desk, the raw API key remains visible indefinitely. The server-side GET route correctly rejects raw key views with a 410 Gone response, so the key cannot be retrieved after the dialog is closed.

**Concrete failure scenario:** An admin creates an API key and is called away from their desk. The raw key remains visible on screen. A passerby photographs the screen, gaining permanent API access.

**Fix:** Add a 5-minute auto-dismiss timer that clears `createdKey` from state, with a visible countdown indicator.

---

### AGG-5: No test coverage for bulk invitation case-insensitive email dedup [MEDIUM/HIGH]

**Flagged by:** test-engineer (TE-1)
**Signal strength:** 1 of 11 review perspectives

**File:** Tests for `src/app/api/v1/contests/[assignmentId]/recruiting-invitations/bulk/route.ts`

**Description:** The bulk invitation route's email deduplication logic has no test verifying case-insensitive behavior. The bug identified in AGG-1 would have been caught by a test that creates a single invitation with mixed-case email and then attempts a bulk create with lowercased email.

**Fix:** Add a test case verifying that the bulk route correctly rejects duplicate emails regardless of casing.

---

### AGG-6: Bulk invitation route duplicates invitation creation logic from single route — DRY violation at route level [LOW/MEDIUM]

**Flagged by:** architect (ARCH-1)
**Signal strength:** 1 of 11 review perspectives

**Files:** `recruiting-invitations/route.ts:44-102` vs `bulk/route.ts:28-87`

**Description:** The single-create and bulk-create routes duplicate significant logic: DB time fetching, expiresAt computation, NaN guard, validation checks, and audit event recording. This duplication led to the case-insensitive email check bug (AGG-1) — the single route uses `lower()` but the bulk route uses `inArray()`.

**Fix:** Extract common invitation preparation logic into `recruiting-invitations.ts`, with the bulk route calling the shared logic in a loop.

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

All major findings from cycle 37 have been verified as fixed:
1. Quick-create route NaN guards (AGG-1 from cycle 37)
2. MAX_EXPIRY_MS constant extraction (AGG-2 from cycle 37)
3. SSE LIKE ESCAPE clauses (AGG-3 from cycle 37)
4. Chat widget minimized button aria-label (AGG-4 from cycle 37)
5. Password rehash consolidation in backup/export routes

## Deferred Items

| Finding | File+Line | Severity/Confidence | Reason for Deferral | Exit Criterion |
|---------|-----------|-------------------|--------------------|---------------|
| PERF-1: Shared poll timer reads config on restart | events/route.ts:161 | LOW/LOW | Timer only restarts on first subscriber after quiet period; infrequent | Performance profiling shows bottleneck |
| PERF-2: SSE connection eviction linear search | events/route.ts:44-55 | LOW/LOW | Bounded by 1000-entry cap; O(n) is acceptable | Cap is raised significantly |
| CRI-2: Quick-create orphan groups | quick-create/route.ts:61-66 | LOW/LOW | Design concern, not a bug; groups serve as containers | Product decision on cascade deletion |
| CRI-3: Chat widget hides on contest list page | chat-widget.tsx:61-65 | LOW/LOW | UX preference; current behavior is conservative | Product decision on visibility rules |
| DOC-1: recruiting-constants JSDoc "~10 years" | recruiting-constants.ts:7 | LOW/LOW | Documentation-only | Next documentation cycle |
| DOC-2: Bulk route dedup strategy docs | bulk/route.ts | LOW/LOW | Documentation-only | Next documentation cycle |
| DBG-2: Anti-cheat retry timer overlap | anti-cheat-monitor.tsx:130-135 | LOW/LOW | Server-side idempotency mitigates; practical impact minimal | Race condition causes user-visible issues |
| PERF-1(analytics): entryProblemMaps per-entry | contest-analytics.ts:125-128 | LOW/LOW | Bounded by contest size; one-time calculation | Analytics query takes >1s |
