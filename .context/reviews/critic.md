# Critic Review — RPF Cycle 16

**Date:** 2026-04-22
**Reviewer:** critic
**Base commit:** 9379c26b

## Inventory of Review-Relevant Files

Full repo review from a multi-perspective critique angle, focusing on: consistency, pattern adherence, user-facing behavior, edge cases, and cross-cutting concerns.

## Findings

### CRI-1: Incomplete `apiFetchJson` adoption creates a two-pattern codebase [MEDIUM/HIGH]

**Signal strength:** Also flagged by code-reviewer (CR-2, CR-3, CR-4), architect (ARCH-1)

After cycles 14-15 introduced and adopted `apiFetchJson` in 6 components, the codebase now has two coexisting patterns for the same operation (fetch + parse JSON). This is worse than having a single consistent pattern, because:
1. Developers copying code from an existing component may copy the old pattern
2. The helper's bug-prevention value is only realized for the components that use it
3. Code reviewers must check both patterns for correctness

The migration was started but not completed, creating a "partial refactor" — widely considered one of the worst states for a codebase to be in.

**Fix:** Complete the migration systematically. Every component that does `apiFetch` + `res.json()` for GET requests should be migrated to `apiFetchJson`.

---

### CRI-2: `compiler-client.tsx` unguarded `res.json()` is the last remaining unguarded call [MEDIUM/HIGH]

**File:** `src/components/code/compiler-client.tsx:270`
**Confidence:** HIGH

Also flagged by code-reviewer (CR-1). This is the only remaining call in the entire codebase where `res.json()` is called without a `.catch()` guard. The cycle 14-15 effort to add `.catch()` guards missed this one. This is a real bug: if the server returns a non-JSON error body, the SyntaxError propagates and the user sees a generic "Network error" toast instead of the actual error message from the server.

**Fix:** Add `.catch(() => ({}))` to line 270.

---

### CRI-3: `invite-participants.tsx` has no AbortController for search [MEDIUM/MEDIUM]

**File:** `src/components/contest/invite-participants.tsx:34-56`
**Confidence:** HIGH

Also flagged by perf-reviewer (PERF-1). The search function is debounced at 300ms but does not cancel in-flight requests. This is a race condition where stale results can overwrite newer results. Compare with `recruiting-invitations-panel.tsx` which properly uses AbortController for its fetch.

**Fix:** Add AbortController to the search function, aborting the previous request before starting a new one.

---

### CRI-4: `file-management-client.tsx` icon-only buttons missing `aria-label` [LOW/MEDIUM]

**File:** `src/app/(dashboard)/dashboard/admin/files/file-management-client.tsx:199-210`
**Confidence:** HIGH

Also flagged by code-reviewer (CR-5). The copy URL and delete buttons use `variant="ghost" size="sm"` with only `title` attributes. The same class of issue that was fixed in cycles 11-13 for `size="icon"` buttons. The `size="sm"` variant with an icon and no visible text is functionally identical to an icon-only button.

**Fix:** Add `aria-label` attributes.

---

### CRI-5: `test-connection/route.ts` manual body parsing bypasses `createApiHandler` safety net [MEDIUM/MEDIUM]

Also flagged by architect (ARCH-2) and security-reviewer (SEC-1). The route manually calls `req.json()` inside the handler body instead of using the `schema` option. This means:
1. Malformed JSON produces a 500 instead of 400
2. The body is parsed before CSRF checks complete (actually CSRF is done first in this case, so this is fine)
3. The Zod validation is done manually after parsing, duplicating what `createApiHandler` does

**Fix:** Use the `schema` option in `createApiHandler`.

## Final Sweep

- Reviewed all recently changed files for regression
- Verified previously fixed items remain in place
- No new security vulnerabilities introduced since cycle 15
- The `apiFetchJson` migration is the dominant theme this cycle — completing it should be a priority
