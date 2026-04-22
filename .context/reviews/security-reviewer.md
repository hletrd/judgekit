# Security Review — RPF Cycle 3

**Date:** 2026-04-22
**Reviewer:** security-reviewer
**Base commit:** 7b07995f

## Findings

### SEC-1: `discussion-vote-buttons.tsx` silently swallows vote failures — no error feedback to user [MEDIUM/MEDIUM]

**File:** `src/components/discussions/discussion-vote-buttons.tsx:41-55`

**Description:** When the vote API returns `!response.ok`, the function silently returns on line 48 with no user feedback. The user clicks a vote button, sees the button become enabled again, but has no idea why their vote was not registered. This is a user-facing correctness issue — the user's intent is silently discarded.

**Concrete failure scenario:** A user with a restricted role clicks upvote. The server returns 403. No toast, no error message. The user believes their vote was counted.

**Fix:** Add a `toast.error()` for the `!response.ok` case.

**Confidence:** HIGH

---

### SEC-2: `window.location.origin` used to construct URLs in `access-code-manager.tsx` and `workers-client.tsx` — same issue flagged as DEFER-24 in prior cycles [LOW/MEDIUM]

**Files:**
- `src/components/contest/access-code-manager.tsx:130`
- `src/app/(dashboard)/dashboard/admin/workers/workers-client.tsx:147`

**Description:** Both components use `window.location.origin` to build shareable URLs. In `access-code-manager.tsx`, the contest join URL is built client-side. In `workers-client.tsx`, the JUDGE_BASE_URL for the docker command uses `window.location.origin`. Behind a misconfigured proxy, these URLs could be incorrect. This was previously flagged as DEFER-24 for the invitations panel.

**Fix:** Use a server-provided `appUrl` config value, or at minimum validate that `window.location.origin` matches the expected host.

**Confidence:** MEDIUM

---

### SEC-3: `discussion-post-form.tsx` exposes raw server error messages to users via toast [LOW/LOW]

**File:** `src/components/discussions/discussion-post-form.tsx:51`

**Description:** Line 51: `const message = error instanceof Error ? error.message : "discussionReplyCreateFailed"`. If the server returns an unexpected error message (e.g., internal stack trace details in development mode), this is displayed verbatim in a toast. While production mode should not leak stack traces, this pattern does not sanitize the error message.

**Fix:** Map known error codes to i18n keys and fall back to a generic message for unknown errors.

**Confidence:** LOW

---

## Final Sweep

No new critical security findings. The CSRF protection (validateCsrf), auth config, and session security are well-implemented. The password hashing uses Argon2id with timing-safe dummy hash comparison. The response.json() before response.ok pattern is primarily a reliability issue rather than a direct security vulnerability, but it can cause unhandled exceptions that bypass error handling.
