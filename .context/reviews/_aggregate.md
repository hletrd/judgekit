# RPF Cycle 16 — Aggregate Review

**Date:** 2026-04-22
**Base commit:** 9379c26b
**Review artifacts:** code-reviewer.md, perf-reviewer.md, security-reviewer.md, architect.md, critic.md, verifier.md, debugger.md, test-engineer.md, tracer.md, designer.md, document-specialist.md

## Previously Fixed Items (Verified in Current Code)

All cycle 15 aggregate findings have been addressed:
- AGG-1 (4 remaining unguarded `res.json()` calls): Fixed — migrated to `apiFetchJson`
- AGG-2 (metadata remove button `aria-label`): Fixed — added i18n keys
- AGG-3 (anti-cheat dashboard polling re-renders): Fixed — shallow comparison added

## Deduped Findings (sorted by severity then signal)

### AGG-1: `compiler-client.tsx` unguarded `res.json()` on error path — last remaining unguarded call [MEDIUM/HIGH]

**Flagged by:** code-reviewer (CR-1), critic (CRI-2), verifier (V-1), debugger (DBG-1), tracer (TR-1, revised)
**Signal strength:** 5 of 11 review perspectives

**File:** `src/components/code/compiler-client.tsx:270`

**Description:** The error path calls `await res.json()` without `.catch()`. The tracer analysis revealed that the inner `catch` block does handle the SyntaxError by falling back to `res.statusText`, so the actual runtime behavior is correct — the user will see "Bad Gateway" or similar. However, the pattern violates the `apiFetch` JSDoc convention and represents the last remaining unguarded `.json()` call in the entire codebase.

**Revised severity:** LOW/MEDIUM (behavior is correct due to inner catch, but pattern is inconsistent)

**Fix:** Add `.catch(() => ({}))` to the `res.json()` call at line 270 for pattern consistency.

---

### AGG-2: Incomplete `apiFetchJson` adoption — remaining components use raw pattern [MEDIUM/HIGH]

**Flagged by:** code-reviewer (CR-2, CR-3, CR-4), architect (ARCH-1), critic (CRI-1)
**Signal strength:** 5 of 11 review perspectives

**Files:**
- `src/components/contest/recruiter-candidates-panel.tsx:50-54`
- `src/components/contest/invite-participants.tsx:42-47, 68-78`
- `src/components/contest/access-code-manager.tsx:41-43, 82-88`
- `src/components/code/compiler-client.tsx:270,287`
- Plus 12+ additional components listed in ARCH-1

**Description:** After cycles 14-15 introduced and adopted `apiFetchJson` in 6 components, 17+ components still use the raw `apiFetch` + `res.json().catch()` pattern. While all have `.catch()` guards (safe), the inconsistency creates a two-pattern codebase. New developers may copy the old pattern from existing code.

**Fix:** Systematically migrate remaining GET-pattern fetches to `apiFetchJson`. Priority components: recruiter-candidates-panel, invite-participants, access-code-manager, compiler-client.

---

### AGG-3: `invite-participants.tsx` search has no AbortController — race condition [MEDIUM/MEDIUM]

**Flagged by:** perf-reviewer (PERF-1), critic (CRI-3), verifier (V-4), debugger (DBG-2), tracer (TR-2)
**Signal strength:** 5 of 11 review perspectives

**File:** `src/components/contest/invite-participants.tsx:34-64`

**Description:** The search function is debounced at 300ms but has no AbortController. Rapid typing causes multiple overlapping requests where the last one to resolve (not the last one sent) sets the results. This can produce stale results that don't match the current search query. Compare with `recruiting-invitations-panel.tsx` which properly uses AbortController.

**Fix:** Add AbortController to the search function, aborting the previous request before starting a new one.

---

### AGG-4: `test-connection/route.ts` manual `req.json()` bypasses `createApiHandler` safety — returns 500 for malformed JSON [MEDIUM/MEDIUM]

**Flagged by:** security-reviewer (SEC-1), architect (ARCH-2), critic (CRI-5), tracer (TR-3)
**Signal strength:** 4 of 11 review perspectives

**File:** `src/app/api/v1/plugins/chat-widget/test-connection/route.ts:37`

**Description:** The route uses `createApiHandler` with `auth: false` but manually calls `req.json()` inside the handler body instead of using the `schema` option. When the request body is malformed JSON, `req.json()` throws SyntaxError, and the outer `createApiHandler` catch returns a 500 error instead of the expected 400 "invalidJson" error. This is a concrete bug: the wrong HTTP status code is returned.

**Fix:** Use the `schema` option in `createApiHandler` to delegate body parsing, or wrap `req.json()` in a try/catch that returns 400 on parse failure.

---

### AGG-5: `file-management-client.tsx` icon-only buttons missing `aria-label` [LOW/MEDIUM]

**Flagged by:** code-reviewer (CR-5), critic (CRI-4), designer (DES-1)
**Signal strength:** 3 of 11 review perspectives

**File:** `src/app/(dashboard)/dashboard/admin/files/file-management-client.tsx:199-210`

**Description:** The "Copy URL" and "Delete" buttons use `variant="ghost" size="sm"` with only `title` attributes but no `aria-label`. The `title` attribute is not reliably announced by screen readers. Same class of accessibility issue that was fixed in cycles 11-13 for `size="icon"` buttons.

**Fix:** Add `aria-label` to both buttons.

---

### AGG-6: Anti-cheat monitor privacy notice dialog lacks focus trap [LOW/MEDIUM]

**Flagged by:** designer (DES-4)
**Signal strength:** 1 of 11 review perspectives

**File:** `src/components/exam/anti-cheat-monitor.tsx:252-278`

**Description:** The privacy notice uses raw `div` elements with `role="dialog"` and `aria-modal="true"` instead of the project's `Dialog` component which handles focus trapping. The user can tab out of the dialog to elements behind the overlay, violating WCAG 2.2 SC 2.4.3.

**Fix:** Use the `Dialog` component from the UI library, which handles focus trapping automatically.

---

### AGG-7: `countdown-timer.tsx` uses `aria-live="assertive"` for all threshold announcements [LOW/LOW]

**Flagged by:** designer (DES-5)
**Signal strength:** 1 of 11 review perspectives

**File:** `src/components/exam/countdown-timer.tsx:151-153`

**Description:** All threshold announcements use `aria-live="assertive"`, which interrupts screen readers. Only the 1-minute warning warrants assertive; 15-minute and 5-minute warnings should use `polite`.

**Fix:** Use `aria-live="polite"` for non-critical announcements, reserving `assertive` for the 1-minute warning.

---

### AGG-8: `recruiter-candidates-panel.tsx` CSV download uses `window.open` without `noopener` [LOW/LOW]

**Flagged by:** debugger (DBG-3), designer (DES-3)
**Signal strength:** 2 of 11 review perspectives

**File:** `src/components/contest/recruiter-candidates-panel.tsx:90-98`

**Description:** The CSV download uses `window.open(url, "_blank")` without `noopener,noreferrer`. Minor tab-napping risk. Also no loading/progress feedback for the download.

**Fix:** Add `noopener,noreferrer` or use `<a>` element with `download` attribute.

## Security Findings (from security-reviewer)

### SEC-1: `test-connection/route.ts` unguarded `req.json()` — covered by AGG-4 above

### SEC-2: Plaintext fallback in encryption module — carried from SEC-2 (cycle 11) [MEDIUM/MEDIUM]

### SEC-3: `window.location.origin` for URL construction — carried from DEFER-24 [MEDIUM/MEDIUM]

### SEC-4: Gemini model name interpolation into URL path — defense-in-depth concern [LOW/MEDIUM]

## Performance Findings (from perf-reviewer)

### PERF-1: `invite-participants.tsx` search no AbortController — covered by AGG-3 above

### PERF-2: `recruiter-candidates-panel.tsx` fetches full export — covered by DEFER-29

### PERF-3: Anti-cheat dashboard uniqueStudents computation — LOW/LOW, no action needed

### PERF-4: `countdown-timer.tsx` uses setInterval — LOW/LOW, no action needed

## Test Coverage Gaps (from test-engineer)

### TE-1: No unit tests for `compiler-client.tsx` — new [MEDIUM/MEDIUM]
### TE-2: No unit tests for `invite-participants.tsx` — new [MEDIUM/MEDIUM]
### TE-3: No unit tests for `recruiter-candidates-panel.tsx` — new [LOW/MEDIUM]
### TE-4: No unit tests for `access-code-manager.tsx` — new [LOW/MEDIUM]
### TE-5: `apiFetchJson` helper untested — carried from DEFER-56 [LOW/MEDIUM]
### TE-6: Encryption module untested — carried from DEFER-50 [MEDIUM/HIGH]

## Documentation Findings (from document-specialist)

### DOC-1: `apiFetchJson` signal option — RESOLVED in cycle 15
### DOC-2: Encryption plaintext fallback migration guidance — carried from cycle 14 [LOW/LOW]
### DOC-3: `compiler-client.tsx` error path comment could be improved [LOW/LOW]

## Previously Deferred Items (Carried Forward)

- DEFER-1: Migrate raw route handlers to `createApiHandler` (22 routes)
- DEFER-2: SSE connection tracking eviction optimization
- DEFER-3: SSE connection cleanup test coverage
- D1: JWT authenticatedAt clock skew with DB tokenInvalidatedAt (MEDIUM)
- D2: JWT callback DB query on every request — add TTL cache (MEDIUM)
- A19: `new Date()` clock skew risk in remaining routes (LOW)
- DEFER-20: Contest clarifications show raw userId instead of username
- DEFER-21: Duplicated visibility-aware polling pattern (partially addressed)
- DEFER-22: copyToClipboard dynamic import inconsistency
- DEFER-23: Practice page Path B progress filter
- DEFER-24: Invitation URL uses window.location.origin
- DEFER-25: Duplicate formatTimestamp utility
- DEFER-1 (cycle 1): Add unit tests for useVisibilityPolling, SubmissionListAutoRefresh, and stats endpoint
- DEFER-2 (cycle 1): Standardize error handling pattern in useVisibilityPolling
- DEFER-26: Unit tests for create-group-dialog.tsx and bulk-create-dialog.tsx
- DEFER-27: Unit tests for comment-section.tsx
- DEFER-28: Unit tests for participant-anti-cheat-timeline.tsx polling behavior
- DEFER-29: Add dedicated candidates summary endpoint for recruiter-candidates-panel
- DEFER-30: Remove unnecessary `router.refresh()` from discussion-vote-buttons
- ARCH-1: Centralized error-to-i18n mapping utility (refactor suggestion)
- DEFER-50: Encryption module unit tests (from TE-3)
- DEFER-51: Unit tests for create-problem-form.tsx (from TE-4)
- DEFER-52: Unit tests for problem-export-button.tsx (from TE-5)
- DEFER-53: `contest-join-client.tsx` 1-second setTimeout delay (from PERF-3)
- DEFER-54: Anti-cheat dashboard polling full shallow comparison for multi-page data
- DEFER-55: `recruiting-invitations-panel.tsx` Promise.all vs Promise.allSettled
- DEFER-56: Unit tests for apiFetchJson helper (from TE-4)
- DEFER-57: Unit tests for recruiting-invitations-panel.tsx (from TE-5)

## Agent Failures

None. All 11 review perspectives completed successfully.
