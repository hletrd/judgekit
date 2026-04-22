# Tracer Review — RPF Cycle 13

**Date:** 2026-04-22
**Reviewer:** tracer
**Base commit:** 38206415

## Previously Fixed Items (Verified)

All cycle 12 tracer findings are fixed.

## Findings

### TR-1: `chat-logs-client.tsx` — causal trace: missing `res.ok` check leads to silent data loss [MEDIUM/MEDIUM]

**File:** `src/app/(dashboard)/dashboard/admin/plugins/chat-logs/chat-logs-client.tsx:58,73`

**Description:** Causal trace of what happens when the admin chat-logs API returns an error:

1. Admin navigates to plugins/chat-logs page
2. `fetchSessions(1)` is called
3. API returns 403 (session expired) with body `{"error":"forbidden"}`
4. `const data = await res.json()` parses the body successfully
5. `setSessions(data.sessions ?? [])` — `data.sessions` is undefined, so `?? []` evaluates to `[]`
6. `setTotal(data.total ?? 0)` — `data.total` is undefined, so `?? 0` evaluates to `0`
7. `setPage(p)` — sets page to 1
8. User sees empty sessions list with "no sessions" message

**Hypothesis 1 (confirmed):** The missing `res.ok` check causes error responses to be silently treated as empty data. The user has no indication that their session expired or that an error occurred.

**Alternative hypothesis (rejected):** The catch block would handle the error. Rejected because `res.json()` successfully parses the error JSON body — no exception is thrown.

**Fix:** Add `if (!res.ok) { toast.error(...); return; }` before calling `.json()`.

**Confidence:** HIGH

---

### TR-2: `workers-client.tsx` — causal trace: icon-only buttons invisible to screen readers [MEDIUM/MEDIUM]

**File:** `src/app/(dashboard)/dashboard/admin/workers/workers-client.tsx:120,123,133-140,187-194,201-208,372`

**Description:** Causal trace of what happens when a screen reader user encounters the workers page:

1. Screen reader user navigates to admin/workers page
2. Screen reader encounters the alias edit field's save button (line 120)
3. Button has no text content and no `aria-label`
4. Screen reader announces: "button" — no description
5. User cannot determine what the button does
6. Same pattern repeats for 5 more buttons on the page

This is the same causal chain as the language-config-table issue (AGG-1 from cycle 12). The root cause is the same: icon-only buttons missing `aria-label`.

**Fix:** Add `aria-label` to all six buttons.

**Confidence:** HIGH

---

### TR-3: `recruiter-candidates-panel.tsx` — causal trace: unguarded `res.json()` on success path [LOW/MEDIUM]

**File:** `src/components/contest/recruiter-candidates-panel.tsx:54`

**Description:** Causal trace when the export API returns a non-JSON 200 response:

1. User navigates to recruiter candidates panel
2. `fetchCandidates()` is called
3. API returns 200 with empty body (edge case)
4. `const data = await res.json()` throws SyntaxError (unexpected end of JSON input)
5. Catch block executes: `toast.error(t("fetchError"))`
6. `finally` block sets `setLoading(false)`

The user sees an error toast, which is acceptable UX. However, the SyntaxError exception is avoidable with a `.catch()` guard.

**Fix:** Add `.catch(() => [])`.

**Confidence:** MEDIUM

---

## Final Sweep

The cycle 12 fixes are properly implemented. The most notable finding this cycle is the chat-logs client's missing `res.ok` check — a causal trace shows that error responses are silently treated as empty data, which could mask authentication failures. The workers page continues the pattern of icon-only buttons missing `aria-label`.
