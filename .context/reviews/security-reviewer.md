# Security Review — RPF Cycle 16

**Date:** 2026-04-22
**Reviewer:** security-reviewer
**Base commit:** 9379c26b

## Inventory of Review-Relevant Files

All API routes under `src/app/api/`, auth module, security module, CSRF, rate limiting, encryption, and client-side API consumption patterns.

## Findings

### SEC-1: `test-connection/route.ts` — unguarded `req.json()` before Zod validation [MEDIUM/HIGH]

**File:** `src/app/api/v1/plugins/chat-widget/test-connection/route.ts:37`
**Confidence:** HIGH

Line 37 calls `const body = await req.json();` without a `.catch()`. If a client sends a non-JSON body (e.g., binary data or malformed content), the `req.json()` call will throw, and the `createApiHandler` wrapper will catch it and return a 500 error. While this is not directly exploitable (the handler returns 500), it leaks an internal server error instead of the expected 400 "invalidJson" response that `createApiHandler` provides when it catches `req.json()` failures inside its own body-parsing block.

The issue is that this route uses `createApiHandler` with `auth: false` and then manually calls `req.json()` inside the handler, bypassing the handler's built-in body-parsing + Zod validation pipeline. The handler has a `schema` option that would handle this safely.

**Fix:** Either (a) use the `schema` option in `createApiHandler` to let it parse the body, or (b) wrap the `req.json()` call in a try/catch that returns a 400 error on parse failure.

---

### SEC-2: Encryption plaintext fallback — carried from SEC-2 (cycle 11) [MEDIUM/MEDIUM]

**File:** `src/lib/security/encryption.ts:78-81`

The `decrypt()` function returns the input as-is if it does not start with `enc:`. This plaintext fallback exists for backward compatibility with data stored before encryption was enabled. While the GCM auth tag provides integrity verification for encrypted data, the fallback provides no integrity guarantee for plaintext data. An attacker with write access to the database could replace an encrypted value with a plaintext value and the application would accept it.

**Fix:** Add an HMAC or integrity check. This is already tracked as DEFER-33 from cycle 11.

---

### SEC-3: `window.location.origin` for URL construction — carried from DEFER-24 [MEDIUM/MEDIUM]

**Files:**
- `src/components/contest/recruiting-invitations-panel.tsx:99`
- `src/components/contest/access-code-manager.tsx:134`
- `src/app/(dashboard)/dashboard/admin/files/file-management-client.tsx:96`
- `src/app/(dashboard)/dashboard/admin/workers/workers-client.tsx:148`

`window.location.origin` is client-determined and can differ from the server's authoritative origin (e.g., behind a reverse proxy with different host headers). Generated URLs (invitation links, access code links, worker commands) could point to the wrong origin. This is already tracked as DEFER-24.

**Fix:** Use `NEXT_PUBLIC_APP_URL` or a server-provided base URL instead.

---

### SEC-4: Gemini model name interpolation into URL path — defense-in-depth concern [LOW/MEDIUM]

**File:** `src/lib/plugins/chat-widget/providers.ts:323, 384`
**Confidence:** MEDIUM

The Gemini provider interpolates the `model` parameter directly into the API URL:
```ts
const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;
```

The `SAFE_GEMINI_MODEL_PATTERN` regex (`/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/`) prevents path traversal characters like `/`, `..`, and special characters. However, the regex allows dots (`.`) which means a model name like `v1beta.models` would pass validation but would create a subtly different URL structure. In practice, Google's Gemini model names follow patterns like `gemini-1.5-pro` or `gemini-pro`, so this is unlikely to be exploited. The regex is adequate for the current API contract.

**Fix:** No immediate action needed. Consider adding a maximum length constraint to the regex for defense-in-depth.

## Previously Deferred (Carried Forward)

- DEFER-1: Migrate raw route handlers to `createApiHandler` (22 routes)
- DEFER-24: Invitation URL uses window.location.origin (also SEC-3)
- DEFER-33: Encryption module integrity check / HMAC (also SEC-2)
