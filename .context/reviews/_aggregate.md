# RPF Cycle 13 — Aggregate Review

**Date:** 2026-04-22
**Base commit:** 38206415
**Review artifacts:** code-reviewer.md, perf-reviewer.md, security-reviewer.md, architect.md, critic.md, verifier.md, debugger.md, test-engineer.md, tracer.md, designer.md, document-specialist.md

## Previously Fixed Items (Verified in Current Code)

All cycle 12 aggregate findings have been addressed:
- AGG-1 from cycle 12 (language-config-table icon-only buttons missing aria-label): Fixed — all three buttons now have `aria-label`
- AGG-2 from cycle 12 (unguarded res.json() on error paths in group-instructors-manager and problem-import-button): Fixed — both use `.catch(() => ({}))` now
- AGG-3 from cycle 12 (shortcuts-help icon-only button missing aria-label): Fixed — now has `aria-label={t("shortcutsTitle")}`
- AGG-4 from cycle 12 (language-config-table unguarded res.json() on success path): Fixed — now uses `.catch(() => ({ data: {} }))`

## Deduped Findings (sorted by severity then signal)

### AGG-1: `workers-client.tsx` icon-only buttons missing `aria-label` — WCAG 4.1.2 violation (6 instances) [MEDIUM/HIGH]

**Flagged by:** code-reviewer (CR-1), critic (CRI-1), verifier (V-1), debugger (DBG-4), tracer (TR-2), designer (DES-1), architect (ARCH-2)
**Signal strength:** 7 of 11 review perspectives

**File:** `src/app/(dashboard)/dashboard/admin/workers/workers-client.tsx:120,123,133-140,187-194,201-208,372`

**Description:** Six icon-only buttons in the workers admin page lack `aria-label` attributes:
1. Line 120: Save (Check icon) button — no `aria-label`
2. Line 123: Cancel (X icon) button — no `aria-label`
3. Lines 133-140: Edit (Pencil icon) button — no `aria-label`
4. Lines 187-194: Copy docker command button — no `aria-label`
5. Lines 201-208: Copy deploy script button — no `aria-label`
6. Line 372: Delete worker (Trash2 icon) button — no `aria-label`

This is the same class of WCAG 4.1.2 issue fixed in cycle 12 for the language-config-table (AGG-1). The pattern is inconsistent with other icon-only buttons in the codebase (e.g., lecture toolbar, api-keys copy button, language config table).

**Fix:** Add `aria-label` to all six icon-only buttons.

---

### AGG-2: `chat-logs-client.tsx` — API calls without `res.ok` check, processes error responses as data [MEDIUM/MEDIUM]

**Flagged by:** code-reviewer (CR-2), security-reviewer (SEC-2), critic (CRI-2), verifier (V-2), debugger (DBG-1), tracer (TR-1)
**Signal strength:** 6 of 11 review perspectives

**File:** `src/app/(dashboard)/dashboard/admin/plugins/chat-logs/chat-logs-client.tsx:58,73`

**Description:** Both `fetchSessions` and `fetchMessages` call `await res.json()` without first checking `res.ok`. If the server returns an error status (e.g., 403 session expired), the error response body is parsed and the code tries to access `data.sessions` or `data.messages` which would be undefined. The `?? []` and `?? 0` fallbacks prevent a crash, but the user sees an empty state instead of an error message. This masks authentication failures.

**Concrete failure scenario:** Admin's session expires. Chat-logs API returns 403 with `{"error":"forbidden"}`. `res.json()` parses it. `setSessions(data.sessions ?? [])` sets sessions to `[]`. User sees empty list with no error indication.

**Fix:** Add `if (!res.ok) { toast.error(...); return; }` before calling `.json()`.

---

### AGG-3: `group-instructors-manager.tsx` remove instructor button missing `aria-label` [LOW/MEDIUM]

**Flagged by:** code-reviewer (CR-5), critic (CRI-3), verifier (V-4), designer (DES-2)
**Signal strength:** 4 of 11 review perspectives

**File:** `src/app/(dashboard)/dashboard/groups/[id]/group-instructors-manager.tsx:191-196`

**Description:** The remove instructor button contains only a Trash2 icon with no text content. It uses `size="sm"` but is effectively icon-only. No `aria-label` is present.

**Fix:** Add `aria-label={t("removeInstructor")}` to the Button.

---

### AGG-4: Multiple components have unguarded `res.json()` on success paths [LOW/MEDIUM]

**Flagged by:** code-reviewer (CR-3, CR-4, CR-6, CR-7), critic (CRI-2), debugger (DBG-2, DBG-3), tracer (TR-3), perf-reviewer (PERF-2)
**Signal strength:** 5 of 11 review perspectives

**Files:**
- `src/components/contest/recruiter-candidates-panel.tsx:54` — success path, no `.catch()`
- `src/components/contest/quick-create-contest-form.tsx:80` — success path, no `.catch()`
- `src/components/contest/invite-participants.tsx:46` — success path, no `.catch()`
- `src/components/contest/code-timeline-panel.tsx:57` — success path, no `.catch()`
- `src/components/contest/analytics-charts.tsx:542` — success path, no `.catch()`
- `src/components/contest/leaderboard-table.tsx:231` — success path, no `.catch()`
- `src/components/contest/anti-cheat-dashboard.tsx:124,161` — success path, no `.catch()`
- `src/components/contest/contest-quick-stats.tsx:52` — success path, no `.catch()`
- `src/components/lecture/submission-overview.tsx:87` — success path, no `.catch()`
- `src/app/(dashboard)/dashboard/submissions/[id]/submission-detail-client.tsx:105` — success path, no `.catch()`

**Description:** These components call `await res.json()` on the success path (`res.ok`) without a `.catch()` guard. If the server returns a non-JSON 200 body, `res.json()` throws SyntaxError. The outer catch blocks handle it, but the SyntaxError is an unnecessary exception path. This is a continuation of the same pattern identified in cycle 11 (AGG-5) and cycle 12 (AGG-4).

**Fix:** Add `.catch()` guards on success-path `.json()` calls. Consider a centralized `apiFetchJson` helper.

---

## Security Findings (from security-reviewer)

### SEC-1: Plaintext fallback in encryption module — carried from SEC-2 (cycle 11) [MEDIUM/HIGH]

**File:** `src/lib/security/encryption.ts:78-81`

**Fix:** Add integrity check or HMAC. Monitor plaintext fallback hits in production.

### SEC-2: `chat-logs-client.tsx` missing `res.ok` check — covered by AGG-2 above

### SEC-3: `problem-import-button.tsx` parses uploaded JSON without size limit — carried from PERF-2 (cycle 12) [LOW/MEDIUM]

### SEC-4: `window.location.origin` for URL construction — carried from DEFER-24 [MEDIUM/MEDIUM]

---

## Performance Findings (from perf-reviewer)

No critical performance findings this cycle.

### PERF-1: Anti-cheat dashboard polling replaces all data on every tick [MEDIUM/LOW]

### PERF-2: `submission-overview.tsx:87` unguarded `res.json()` — covered by AGG-4 above

### PERF-3: `problem-import-button.tsx` parses uploaded JSON without size limit — carried [LOW/MEDIUM]

---

## Architectural Findings (from architect)

### ARCH-1: No centralized `res.json()` safety pattern — inconsistent error handling [MEDIUM/MEDIUM]

### ARCH-2: Icon-only buttons missing `aria-label` — systemic pattern — covered by AGG-1 above

### ARCH-3: `language-config-table.tsx` is 688 lines — should be decomposed [LOW/LOW]

---

## Test Coverage Gaps (from test-engineer)

### TE-1: No unit tests for `workers-client.tsx` [LOW/MEDIUM]

### TE-2: No unit tests for `chat-logs-client.tsx` [LOW/MEDIUM]

### TE-3: Encryption module still untested — carried from TE-3 (cycle 11) [MEDIUM/HIGH]

### TE-4: No unit tests for `recruiter-candidates-panel.tsx` [LOW/LOW]

---

## Documentation Findings (from document-specialist)

### DOC-1: `apiFetch` JSDoc does not document success-path `.json()` safety pattern [LOW/MEDIUM]

### DOC-2: `encryption.ts` plaintext fallback lacks migration guidance [LOW/LOW]

---

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

## Agent Failures

None. All 11 review perspectives completed successfully.
