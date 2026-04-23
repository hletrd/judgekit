# Security Review — RPF Cycle 29

**Date:** 2026-04-23
**Reviewer:** security-reviewer
**Base commit:** a51772ae

## Previously Fixed Items (Verified)

- console.error gating (14 components): Verified
- bulk-create raw err.message truncation: Verified
- SSRF via test-connection endpoint: Mitigated (uses stored keys, model validation)
- `sanitizeHtml` root-relative img src: Deferred (LOW/LOW)

## SEC-1: Chat widget provider `stream()` functions leak API error details to client [MEDIUM/MEDIUM]

**Files:**
- `src/lib/plugins/chat-widget/providers.ts:101` — OpenAI: `throw new Error(`OpenAI API error ${response.status}: ${text}`)`
- `src/lib/plugins/chat-widget/providers.ts:134-135` — OpenAI chatWithTools: same pattern
- `src/lib/plugins/chat-widget/providers.ts:202` — Claude: `throw new Error(`Claude API error ${response.status}: ${text}`)`

The `stream()` and `chatWithTools()` methods throw errors containing the full API response body. When the chat widget's route handler catches these errors, the raw error text could be forwarded to the client. The OpenAI/Claude error response bodies can contain sensitive information such as:
- Account/organization IDs
- Rate limit details
- Internal error messages

**Concrete failure scenario:** An OpenAI API call fails with a 403. The error response includes the organization ID and billing details. This information propagates up through the chat widget route handler and is sent to the client browser.

**Fix:** Sanitize error messages before throwing. Replace the full response body with a generic message:
```typescript
throw new Error(`OpenAI API error ${response.status}`);
// Instead of:
throw new Error(`OpenAI API error ${response.status}: ${text}`);
```

Log the full error server-side for debugging, but only expose the status code to the client.

---

## SEC-2: Chat widget error propagation chain may expose provider error details [LOW/MEDIUM]

**File:** `src/app/api/v1/plugins/chat-widget/chat/route.ts`

Following from SEC-1, the chat route handler catches errors from provider methods and may include the raw error message in the client-facing error response. Need to verify that the error handling chain properly sanitizes provider error messages before sending them to the client.

**Fix:** Ensure the chat route handler wraps provider errors in generic user-facing messages and only logs the detailed error server-side.

---

## Security Findings (carried/deferred)

### SEC-CARRIED-1: `window.location.origin` for URL construction — covered by DEFER-24
### SEC-CARRIED-2: Encryption plaintext fallback — MEDIUM/MEDIUM, carried from DEFER-39
### SEC-CARRIED-3: `AUTH_CACHE_TTL_MS` has no upper bound — LOW/MEDIUM, carried from DEFER-40
### SEC-CARRIED-4: Anti-cheat localStorage persistence — LOW/LOW, carried from DEFER-48
### SEC-CARRIED-5: `sanitizeHtml` root-relative img src — LOW/LOW, carried from DEFER-49
