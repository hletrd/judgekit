# Debugger Review — RPF Cycle 13

**Date:** 2026-04-22
**Reviewer:** debugger
**Base commit:** 38206415

## Previously Fixed Items (Verified)

All cycle 12 debugger findings are fixed.

## Findings

### DBG-1: `chat-logs-client.tsx` processes API responses without validating status — latent bug [MEDIUM/MEDIUM]

**File:** `src/app/(dashboard)/dashboard/admin/plugins/chat-logs/chat-logs-client.tsx:58,73`

**Description:** Both `fetchSessions` and `fetchMessages` call `await res.json()` without first checking `res.ok`. This is a latent bug: if the server returns an error status (e.g., 500), the response body is parsed as if it were successful data. The code then accesses `data.sessions` and `data.messages` which would be `undefined` on error responses. The `?? []` and `?? 0` fallbacks prevent a crash, but the user sees an empty list instead of an error message.

**Concrete failure scenario:** The admin chat-logs API returns 403 Forbidden because the admin session expired. `res.json()` returns `{"error":"forbidden"}`. `setSessions(data.sessions ?? [])` sets sessions to `[]`. The user sees "no sessions" instead of being prompted to re-authenticate.

**Fix:** Add `if (!res.ok) { toast.error(...); return; }` before calling `.json()`.

**Confidence:** HIGH

---

### DBG-2: `recruiter-candidates-panel.tsx:54` unguarded `res.json()` on success path — SyntaxError on malformed response [MEDIUM/MEDIUM]

**File:** `src/components/contest/recruiter-candidates-panel.tsx:54`

**Description:** After checking `res.ok`, line 54 calls `const data = await res.json()` without `.catch()`. If the server returns a non-JSON 200 body, `res.json()` throws SyntaxError. The outer catch displays `t("fetchError")`. The exception is avoidable.

**Fix:** Use `await res.json().catch(() => [])`.

**Confidence:** HIGH

---

### DBG-3: `quick-create-contest-form.tsx:80` unguarded `res.json()` on success path — SyntaxError risk [LOW/MEDIUM]

**File:** `src/components/contest/quick-create-contest-form.tsx:80`

**Description:** After checking `res.ok`, line 80 calls `const json = await res.json()` without `.catch()`. If the server returns a non-JSON 200 body, `res.json()` throws SyntaxError. The `finally` block sets `setCreating(false)`, so the UI recovers, but the error path shows a generic error.

**Fix:** Add `.catch(() => ({}))`.

**Confidence:** MEDIUM

---

### DBG-4: `workers-client.tsx` icon-only buttons missing `aria-label` [MEDIUM/MEDIUM]

**File:** `src/app/(dashboard)/dashboard/admin/workers/workers-client.tsx:120,123,133-140,187-194,201-208,372`

**Description:** Same finding as code-reviewer CR-1. Six icon-only buttons lack `aria-label`. This is a latent accessibility bug — the buttons are invisible to screen readers.

**Fix:** Add `aria-label` to all six buttons.

**Confidence:** HIGH

---

## Final Sweep

The cycle 12 fixes are properly implemented and verified. The most concerning new finding is the chat-logs client that processes API responses without validating the HTTP status code — this can mask authentication errors and show the user an empty state instead of a proper error. The workers admin page continues the pattern of icon-only buttons missing `aria-label`.
