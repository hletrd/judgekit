# Security Review — RPF Cycle 13

**Date:** 2026-04-22
**Reviewer:** security-reviewer
**Base commit:** 38206415

## Previously Fixed Items (Verified)

- SEC-1 from cycle 12 (encryption plaintext fallback): Still carried — see SEC-1 below
- SEC-2 from cycle 12 (window.location.origin): Still carried — see DEFER-24
- AGG-2 from cycle 12 (unguarded res.json() error paths): Fixed in group-instructors-manager and problem-import-button

## Findings

### SEC-1: Plaintext fallback in encryption module — `decrypt()` silently returns unencrypted values without integrity check [MEDIUM/HIGH]

**File:** `src/lib/security/encryption.ts:78-81`

**Description:** Carried from SEC-2 (cycle 11) and SEC-1 (cycle 12). The `decrypt()` function returns the input as-is if it does not start with `enc:`. This plaintext fallback exists for backward compatibility. If an attacker can modify encrypted data in the database (replacing an `enc:` prefix with arbitrary text), the `decrypt()` function will silently return the attacker's input without any integrity check. The AES-256-GCM mode does provide an auth tag for encrypted values, but the fallback path bypasses it entirely.

**Fix:** Add an integrity check or HMAC to encrypted values. At minimum, log a warning when the plaintext fallback is hit in production. Consider adding a `enc:v1:iv:ciphertext:authTag` version prefix so future encryption can deprecate the fallback.

**Confidence:** HIGH

---

### SEC-2: `chat-logs-client.tsx` missing `res.ok` check — processes API response without validating status [LOW/MEDIUM]

**File:** `src/app/(dashboard)/dashboard/admin/plugins/chat-logs/chat-logs-client.tsx:58,73`

**Description:** Both `fetchSessions` and `fetchMessages` call `await res.json()` without first checking `res.ok`. While this is an admin-only page, processing the response body without validating the status code could lead to unexpected behavior if the server returns an error page. The catch block handles SyntaxError, but it would be better to check `res.ok` first to distinguish between valid and invalid responses.

**Fix:** Add `if (!res.ok) { toast.error(...); return; }` before calling `.json()`.

**Confidence:** MEDIUM

---

### SEC-3: `problem-import-button.tsx` parses uploaded JSON without size limit [LOW/MEDIUM]

**File:** `src/app/(dashboard)/dashboard/problems/problem-import-button.tsx:23`

**Description:** Carried from PERF-2 (cycle 12). Line 23 calls `JSON.parse(text)` on the uploaded file content without any size validation. A user could upload an extremely large JSON file that causes excessive memory consumption on the client side. The file input only restricts to `.json` extension but not file size.

**Fix:** Add a client-side file size check before parsing (e.g., reject files > 10MB). The server-side import endpoint likely has its own limits, but the client should fail fast.

**Confidence:** MEDIUM

---

### SEC-4: `window.location.origin` used for URL construction — carried from DEFER-24 [MEDIUM/MEDIUM]

**Files:**
- `src/components/contest/recruiting-invitations-panel.tsx:99`
- `src/components/contest/access-code-manager.tsx:134`
- `src/app/(dashboard)/dashboard/admin/files/file-management-client.tsx:96`
- `src/app/(dashboard)/dashboard/admin/workers/workers-client.tsx:147`

**Description:** Carried from DEFER-24 (SEC-2 in cycle 12). These components use `window.location.origin` to construct URLs that are shared externally (invitation URLs, file download URLs, worker setup commands). Behind a misconfigured reverse proxy that doesn't set `X-Forwarded-Host`, these URLs could point to the wrong host. Invitation URLs are particularly sensitive since they are sent to external users via email. The worker client also uses `window.location.origin` to construct `JUDGE_BASE_URL` which is used in docker/deploy commands — if the origin is wrong, the worker would fail to connect.

**Fix:** Use a server-provided `appUrl` config value from the system settings instead of `window.location.origin`.

**Confidence:** MEDIUM

---

## Final Sweep

The cycle 12 security fixes are properly implemented. The encryption plaintext fallback remains the highest-priority security concern. The `window.location.origin` issue is carried forward as a deferred item. The chat-logs client missing `res.ok` check is a new finding this cycle. The CSRF protection, admin capability checks, and DOMPurify sanitization remain robust.
