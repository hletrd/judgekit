# RPF Cycle 41 — Aggregate Review

**Date:** 2026-04-23
**Base commit:** 24a04687
**Review artifacts:** code-reviewer.md, perf-reviewer.md, security-reviewer.md, architect.md, critic.md, verifier.md, debugger.md, test-engineer.md, tracer.md, designer.md, document-specialist.md

## Deduped Findings (sorted by severity then signal)

### AGG-1: PATCH route includes `"redeemed"` in allowed transitions — bypasses atomic redeem invariant [MEDIUM/MEDIUM]

**Flagged by:** code-reviewer (CR-1), security-reviewer (SEC-1), architect (ARCH-1), critic (CRI-1), verifier (V-1), debugger (DBG-1), tracer (TR-1), test-engineer (TE-1), document-specialist (DOC-1)
**Signal strength:** 9 of 11 review perspectives

**File:** `src/app/api/v1/contests/[assignmentId]/recruiting-invitations/[invitationId]/route.ts:97`

**Description:** The PATCH route's status transition map includes `"redeemed"` as a valid transition from `"pending"`. If a future change extends the Zod schema to allow `status: "redeemed"` in PATCH requests, the route would accept it and call `updateRecruitingInvitation`, which would set the invitation's status to `"redeemed"` without creating the associated user account, enrollment, or contest access token. The `redeemRecruitingToken` function is the only path that should transition an invitation to `"redeemed"`, as it atomically creates all required records.

The Zod schema (`updateRecruitingInvitationSchema`) currently limits `status` to `z.enum(["revoked"])`, making this unreachable via the API today. However, the state machine entry is architecturally wrong and misleading.

**Concrete failure scenario:** A developer extends `updateRecruitingInvitationSchema` to include `"redeemed"` (e.g., for an admin override). The PATCH route's state machine approves the transition. `updateRecruitingInvitation` executes `UPDATE SET status = 'redeemed' WHERE id = ? AND status = 'pending'`. The invitation is now "redeemed" with `userId = null`. The candidate has no user account, cannot log in, and the invitation cannot be re-redeemed.

**Fix:** Remove `"redeemed"` from the PATCH route's allowed transitions map:
```typescript
const allowed: Record<string, string[]> = {
  pending: ["revoked"],
  // Revoked invitations cannot be un-revoked; the user must create a new
  // invitation instead. The library function (updateRecruitingInvitation)
  // only supports revoking pending invitations (WHERE status = 'pending'),
  // so allowing un-revoke here would cause a silent failure + 500 error.
};
```

---

### AGG-2: Audit logs page uses fragile LIKE-based JSON key matching instead of JSONB operators [LOW/LOW]

**Flagged by:** code-reviewer (CR-2), critic (CRI-2), test-engineer (TE-2)
**Signal strength:** 3 of 11 review perspectives

**File:** `src/app/(dashboard)/dashboard/admin/audit-logs/page.tsx:150`

**Description:** The `buildGroupMemberScopeFilter` function builds a LIKE pattern `'"groupId":"VALUE"'` to search JSON in the `details` column. While `escapeLikePattern` correctly escapes SQL wildcards, the pattern is fragile against JSON serialization changes (whitespace, key ordering). PostgreSQL JSONB containment operators (`@>`) would be more robust and index-friendly.

**Concrete failure scenario:** A future change to the audit logger adds spaces in JSON serialization, producing `{"groupId": "abc"}` instead of `{"groupId":"abc"}`. The LIKE pattern stops matching, and audit logs for that group disappear from the admin view.

**Fix:** Replace LIKE with JSONB containment:
```typescript
sql`${auditEvents.details} @> ${JSON.stringify({ groupId })}::jsonb`
```

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
- **Prior DES-1:** Chat widget button badge lacks ARIA announcement (deferred)
- **Prior PERF-3:** Anti-cheat heartbeat gap query transfers up to 5000 rows (deferred)
- **Prior ARCH-2:** Stale-while-revalidate cache pattern duplication (deferred)
- **Cycle 39 CR-2:** `new Date()` for min date in recruiting invitations panel (deferred, LOW)
- **Cycle 39 ARCH-2:** `computeExpiryFromDays` naming in recruiting-constants.ts (deferred, LOW)

## Verified Fixes This Cycle

All fixes from cycles 37-40 remain intact and working:
1. `Date.now()` replaced with `getDbNowUncached()` in assignment PATCH active-contest check
2. Non-null assertions removed from anti-cheat heartbeat gap detection
3. NaN guard in quick-create route
4. MAX_EXPIRY_MS guard in bulk route expiryDays path
5. Un-revoke transition removed from PATCH route state machine
6. Exam session short-circuit for non-exam assignments
7. ESCAPE clause in SSE LIKE queries
8. Chat widget ARIA label with message count

## Deferred Items

| Finding | File+Line | Severity/Confidence | Reason for Deferral | Exit Criterion |
|---------|-----------|-------------------|--------------------|---------------|
| AGG-2: Audit logs LIKE-based JSON search | audit-logs/page.tsx:150 | LOW/LOW | Works today; robustness improvement | JSON serialization changes or PostgreSQL upgrade |
| PERF-1: Shared poll timer reads config on restart | events/route.ts:161 | LOW/LOW | Timer only restarts on first subscriber after quiet period; infrequent | Performance profiling shows bottleneck |
| PERF-2: SSE connection eviction linear search | events/route.ts:44-55 | LOW/LOW | Bounded by 1000-entry cap; O(n) is acceptable | Cap is raised significantly |
| PERF-3: Anti-cheat heartbeat gap query transfers up to 5000 rows | anti-cheat/route.ts:195-204 | MEDIUM/MEDIUM | Could use SQL window function; currently bounded by limit | Long contest with many heartbeats causes slow API response |
| DES-1: Chat widget button badge lacks ARIA announcement | chat-widget.tsx:284-288 | LOW/LOW | Screen reader edge case; badge is visual-only | Accessibility audit or user complaint |
| Prior AGG-5: Console.error in client components | discussions/*.tsx, groups/*.tsx | LOW/MEDIUM | Requires architectural decision; no data loss | Client error reporting feature request |
| Prior AGG-6: SSE O(n) eviction scan | events/route.ts:44-55 | LOW/LOW | Bounded by 1000-entry cap | Performance profiling shows bottleneck |
| Prior AGG-7: Manual routes duplicate createApiHandler | migrate/import, restore routes | MEDIUM/MEDIUM | Requires extending createApiHandler to support multipart | Next API framework iteration |
| Prior AGG-8: Global timer HPR pattern duplication | 4 modules | LOW/MEDIUM | DRY concern; each module works correctly | Module refactoring cycle |
| Prior SEC-3: Anti-cheat copies text content | anti-cheat-monitor.tsx:206 | LOW/LOW | 80-char limit; privacy notice accepted | Privacy audit or user complaint |
| Prior SEC-4: Docker build error leaks paths | docker/client.ts:169 | LOW/LOW | Admin-only; Docker output expected | Admin permission review |
| Prior DOC-1: SSE route ADR | events/route.ts | LOW/LOW | Documentation-only | Next documentation cycle |
| Prior DOC-2: Docker client dual-path docs | docker/client.ts | LOW/LOW | Documentation-only | Next documentation cycle |
| Prior ARCH-2: Stale-while-revalidate cache pattern duplication | contest-scoring.ts, analytics/route.ts | LOW/LOW | DRY concern; both modules work correctly | Module refactoring cycle |
