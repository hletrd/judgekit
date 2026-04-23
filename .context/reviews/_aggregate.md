# RPF Cycle 23 — Aggregate Review

**Date:** 2026-04-22
**Base commit:** 429d1b86
**Review artifacts:** code-reviewer.md, perf-reviewer.md, security-reviewer.md, architect.md, critic.md, verifier.md, debugger.md, test-engineer.md, tracer.md, designer.md, document-specialist.md

## Previously Fixed Items (Verified in Current Code)

All cycle-22 aggregate findings have been addressed:
- AGG-1 (create-problem-form numeric validation): Fixed — toast.warning added for invalid sequence number and difficulty inputs
- AGG-2 (window.location.origin): Carried as DEFER-24
- AGG-3 (recruiter-candidates-panel full export fetch): Carried as DEFER-29

RPF cycle 28 findings also verified as fixed where applicable:
- comment-section.tsx non-OK error feedback: Fixed (lines 49-51)
- discussion-thread-moderation-controls.tsx: Optimistic state and AlertDialog deletion confirmed

## Deduped Findings (sorted by severity then signal)

### AGG-1: 5 local `normalizePage` functions in server components use `Number()` and lack MAX_PAGE — divergence from shared version [HIGH/HIGH]

**Flagged by:** code-reviewer (CR-1), security-reviewer (SEC-1), perf-reviewer (PERF-1), architect (ARCH-1), critic (CRI-1), debugger (DBG-1), verifier (V-1), test-engineer (TE-1), tracer (TR-1), document-specialist (DOC-3)
**Signal strength:** 10 of 11 review perspectives

**Files:**
- `src/app/(dashboard)/dashboard/problems/page.tsx:51`
- `src/app/(dashboard)/dashboard/admin/audit-logs/page.tsx:50`
- `src/app/(dashboard)/dashboard/admin/login-logs/page.tsx:47`
- `src/app/(dashboard)/dashboard/admin/users/page.tsx:41`
- `src/app/(dashboard)/dashboard/admin/files/page.tsx:26`

**Description:** The shared `normalizePage` in `src/lib/pagination.ts` was fixed in cycle 28 to use `parseInt` and cap at `MAX_PAGE = 10000`. However, 5 server components define their own local `normalizePage` functions using `Number()` without the upper bound. This creates both a security/performance issue (unbounded OFFSET allows DB DoS) and a correctness issue (`Number()` accepts hex/scientific notation that `parseInt` rejects).

**Concrete failure scenario:** An attacker sends `?page=1e10` to `/dashboard/admin/audit-logs`. `Number("1e10")` is 10000000000, which passes `Number.isFinite` and `>= 1`, so `Math.floor()` returns 10000000000. The DB query uses `OFFSET 10000000000`, causing a denial-of-service query.

**Fix:** Delete all local `normalizePage` functions and import from `@/lib/pagination`.

---

### AGG-2: `contest-join-client.tsx` calls `.json()` twice on same Response — body double-consumption [HIGH/HIGH]

**Flagged by:** code-reviewer (CR-2), critic (CRI-2), debugger (DBG-2), verifier (V-2), tracer (TR-2), document-specialist (DOC-1)
**Signal strength:** 6 of 11 review perspectives

**File:** `src/app/(dashboard)/dashboard/contests/join/contest-join-client.tsx:44-49`

**Description:** After checking `!res.ok`, the code calls `res.json()` on line 45 for the error body, then on line 49 for the success body. The Response body can only be consumed once. While the if/else branching prevents the actual "body already consumed" error today, this is the documented anti-pattern in `src/lib/api/client.ts`. The `apiFetchJson` utility was created specifically to eliminate this pattern.

**Concrete failure scenario:** A developer refactors the error handling to not throw immediately (e.g., adding logging). Now both `.json()` calls execute on error paths, causing `TypeError: Body has already been consumed` which is caught by the generic catch block and shows an unhelpful error toast.

**Fix:** Use `apiFetchJson` or parse the body once before branching.

---

### AGG-3: `create-problem-form.tsx` and `group-members-manager.tsx` same double `.json()` pattern [MEDIUM/MEDIUM]

**Flagged by:** code-reviewer (CR-3, CR-4), debugger (DBG-3, DBG-4), tracer (TR-2), document-specialist (DOC-1)
**Signal strength:** 4 of 11 review perspectives

**Files:**
- `src/app/(dashboard)/dashboard/problems/create/create-problem-form.tsx:432-437`
- `src/app/(dashboard)/dashboard/groups/[id]/group-members-manager.tsx:124-128`

**Description:** Same double `.json()` anti-pattern as AGG-2. Error branch and success branch each call `.json()` on the same Response. Mutually exclusive branching prevents the actual error today.

**Fix:** Use `apiFetchJson` or parse the body once before branching.

---

### AGG-4: `submission-overview.tsx` custom dialog lacks focus trap and scroll lock [MEDIUM/MEDIUM]

**Flagged by:** architect (ARCH-2), critic (CRI-3), designer (DES-1), verifier (V-4)
**Signal strength:** 4 of 11 review perspectives

**File:** `src/components/lecture/submission-overview.tsx:152`

**Description:** The component renders a `div role="dialog" aria-modal="true"` manually instead of using the shared `Dialog` component. This lacks: (1) focus trap — keyboard users can Tab past the dialog; (2) scroll lock — page body scrolls behind the dialog; (3) overlay click-to-close. The shared `Dialog` component provides all these features.

**Fix:** Refactor to use the shared `Dialog` component from `@/components/ui/dialog`.

---

### AGG-5: `contest-quick-stats.tsx` displays misleading "0.0" avgScore when no data exists [MEDIUM/MEDIUM]

**Flagged by:** code-reviewer (CR-5), architect (ARCH-3), critic (CRI-4), debugger (DBG-5), designer (DES-2), verifier (V-5), tracer (TR-3)
**Signal strength:** 7 of 11 review perspectives

**File:** `src/components/contest/contest-quick-stats.tsx:42,67,110`

**Description:** When the API returns `avgScore: null` (no submissions), the initial state has `avgScore: 0`. The null check on line 67 preserves the previous value (0 from initial state), displaying "0.0" as the average score. This is semantically incorrect — 0.0 implies all submissions scored 0, while null means no submissions exist.

**Fix:** Change initial `avgScore` to `null`, update type to `number | null`, handle null in display (show "---" or similar).

---

### AGG-6: `submission-overview.tsx` polls when dialog is closed — wasted callbacks [LOW/MEDIUM]

**Flagged by:** perf-reviewer (PERF-2), verifier (V-4)
**Signal strength:** 2 of 11 review perspectives

**File:** `src/components/lecture/submission-overview.tsx:123`

**Description:** The component passes `!open` as the pause flag to `useVisibilityPolling`, but the callback still fires (returning immediately due to the `openRef` guard). Minor performance waste.

**Fix:** Conditionally mount the component only when `open` is true.

---

### AGG-7: `normalizePageSize` uses `Number()` instead of `parseInt` — inconsistency with `normalizePage` [LOW/LOW]

**Flagged by:** code-reviewer (CR-6)
**Signal strength:** 1 of 11 review perspectives

**File:** `src/lib/pagination.ts:18`

**Description:** While `normalizePage` was fixed to use `parseInt`, `normalizePageSize` still uses `Number()`. The risk is lower because `PAGE_SIZE_OPTIONS` is a strict allowlist, but for consistency this should match.

**Fix:** Change to `parseInt(value ?? String(DEFAULT_PAGE_SIZE), 10)`.

---

### AGG-8: `normalizePage` lacks JSDoc explaining MAX_PAGE [LOW/LOW]

**Flagged by:** document-specialist (DOC-2)
**Signal strength:** 1 of 11 review perspectives

**File:** `src/lib/pagination.ts:7`

**Description:** The function has no JSDoc explaining the `MAX_PAGE = 10000` upper bound.

**Fix:** Add a brief JSDoc comment.

---

## Security Findings (carried)

### SEC-2: `window.location.origin` for URL construction — covered by DEFER-24 (4 instances)
### SEC-3: Gemini model name URL interpolation — LOW/MEDIUM, carried from cycle 18
### SEC-4: `AUTH_CACHE_TTL_MS` has no upper bound — LOW/MEDIUM, new this cycle (src/proxy.ts:24-27)
### SEC-5: Encryption plaintext fallback — MEDIUM/MEDIUM, carried from cycle 11

## Performance Findings (carried)

### PERF-3: `recruiter-candidates-panel.tsx` full export fetch — carried as DEFER-29
### PERF-4: Practice page Path B progress filter — carried from cycles 18-22

## Test Coverage Gaps (from test-engineer)

### TE-1: No tests for local normalizePage divergence — resolved by replacing with shared import
### TE-2: No unit tests for contest-join-client.tsx double .json() pattern — new [LOW/MEDIUM]
### TE-3 through TE-7: Carried from previous cycles

## Previously Deferred Items (Carried Forward)

- DEFER-1: Migrate raw route handlers to `createApiHandler` (22 routes)
- DEFER-2: SSE connection tracking eviction optimization
- DEFER-3: SSE connection cleanup test coverage
- D1: JWT authenticatedAt clock skew with DB tokenInvalidatedAt (MEDIUM)
- D2: JWT callback DB query on every request — add TTL cache (MEDIUM)
- A19: `new Date()` clock skew risk in remaining routes (LOW)
- DEFER-24: Invitation URL uses window.location.origin (same as SEC-2)
- DEFER-29: Add dedicated candidates summary endpoint (same as PERF-3)
- DEFER-30 through DEFER-40: See RPF cycle 28 plan

## Agent Failures

None. All 11 review perspectives completed successfully.
