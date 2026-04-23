# Security Review — RPF Cycle 23

**Date:** 2026-04-22
**Reviewer:** security-reviewer
**Base commit:** 429d1b86

## SEC-1: Local `normalizePage` functions lack MAX_PAGE upper bound — pagination DoS [MEDIUM/HIGH]

**Files:**
- `src/app/(dashboard)/dashboard/problems/page.tsx:51`
- `src/app/(dashboard)/dashboard/admin/audit-logs/page.tsx:50`
- `src/app/(dashboard)/dashboard/admin/login-logs/page.tsx:47`
- `src/app/(dashboard)/dashboard/admin/users/page.tsx:41`
- `src/app/(dashboard)/dashboard/admin/files/page.tsx:26`

**Confidence:** HIGH

The shared `src/lib/pagination.ts:normalizePage` caps page numbers at 10000. These 5 server-component pages define their own local `normalizePage` without any upper bound. An attacker can send `?page=999999999` to cause expensive `OFFSET 999999999` database queries.

**Concrete failure scenario:** Attacker sends `GET /dashboard/admin/audit-logs?page=999999999`. The local `normalizePage` returns 999999999. The database query uses `OFFSET 999999999`, causing a full table scan that takes seconds to minutes. Repeated requests could exhaust database connections.

**Fix:** Import and use the shared `normalizePage` from `@/lib/pagination` which has the MAX_PAGE guard.

---

## SEC-2: `window.location.origin` for URL construction — carried from DEFER-24 [MEDIUM/MEDIUM]

**Files:**
- `src/components/contest/access-code-manager.tsx:137`
- `src/components/contest/recruiting-invitations-panel.tsx:99`
- `src/app/(dashboard)/dashboard/admin/files/file-management-client.tsx:96`
- `src/app/(dashboard)/dashboard/admin/workers/workers-client.tsx:148`

**Confidence:** HIGH

Four components construct invitation or app URLs using `window.location.origin`. If the app is accessed through a reverse proxy that rewrites the Host header, the origin may differ from the intended public URL. Carried from DEFER-24.

**Fix:** Use a server-provided public URL or a configurable base URL for all external-facing links.

---

## SEC-3: Gemini model name interpolation into URL path — defense-in-depth concern [LOW/MEDIUM]

**File:** `src/app/api/v1/plugins/chat-widget/test-connection/route.ts:127`

**Confidence:** MEDIUM

Carried from cycle 18. The model name is interpolated directly into the URL path. While `SAFE_GEMINI_MODEL_PATTERN` restricts to safe characters, this is a defense-in-depth concern.

**Fix:** Use `URL` constructor and `encodeURIComponent` for the model segment.

---

## SEC-4: `AUTH_CACHE_TTL_MS` has no upper bound — stale auth cache [LOW/MEDIUM]

**File:** `src/proxy.ts:24-27`

**Confidence:** MEDIUM

The `AUTH_CACHE_TTL_MS` env var is parsed and validated only as a positive finite number. There is no upper bound, so an operator could accidentally set it to `86400000` (24 hours), meaning revoked or deactivated users retain access for up to 24 hours.

**Concrete failure scenario:** An admin sets `AUTH_CACHE_TTL_MS=3600000` (1 hour) to reduce DB load. A user is deactivated but remains cached for up to an hour.

**Fix:** Add an upper bound (e.g., 10 seconds) to the AUTH_CACHE_TTL_MS parsing logic.

---

## SEC-5: Encryption plaintext fallback — carried from cycle 11 [MEDIUM/MEDIUM]

The encryption module falls back to plaintext when encryption keys are not configured. Known deferred item.

---

## Verified Safe

- CSRF protection is consistent across all mutation routes
- `apiFetch` adds `X-Requested-With` header on all requests
- `test-connection/route.ts` properly validates `req.json()` with try/catch
- API keys are retrieved from server-side storage, not accepted from request body
- Model name validation patterns prevent path traversal
- No secrets in client-side code
- HTML sanitization uses DOMPurify with strict allowlists
- `safeJsonForScript` escapes `<!--` and `</script` sequences
- All clipboard operations use the shared `copyToClipboard` utility
- `edit-group-dialog.tsx` error response properly catches `SyntaxError` (no raw API error leak)
- `contest-join-client.tsx` clears access code from URL to prevent Referer/header leakage
- `proxy.ts` CSP headers are properly configured
- `proxy.ts` HSTS headers properly set based on x-forwarded-proto
