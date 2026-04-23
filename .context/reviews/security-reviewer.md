# Security Review — RPF Cycle 31

**Date:** 2026-04-23
**Reviewer:** security-reviewer
**Base commit:** 198e6a63

## Previously Fixed Items (Verified)

Rate-limiter-client .catch() guard added (7ae57906). Provider error sanitization (93beb49d). All prior security findings addressed.

## Findings

### SEC-1: Chat widget route leaks raw `err.message` from tool execution to LLM context [MEDIUM/HIGH]

**File:** `src/app/api/v1/plugins/chat-widget/chat/route.ts:431`

**Description:** When a tool execution fails, the catch block constructs a result string: `Error executing tool "${call.name}": ${err instanceof Error ? err.message : "unknown error"}`. This raw `err.message` is sent to the LLM as a tool result. The LLM may then relay this information to the user in its response. Internal error messages can contain:
- Database connection strings
- File system paths
- Stack traces
- Internal service names

The tool execution can fail for many reasons — database query errors, permission errors, file I/O errors. All of these would have their raw messages exposed.

**Concrete failure scenario:** The `get_submission_detail` tool fails because of a database connection error: `connect ECONNREFUSED 127.0.0.1:5432`. The error message contains the database host and port. The LLM receives this as a tool result and may mention it to the user: "I couldn't fetch your submission because the database at 127.0.0.1:5432 is not responding."

**Fix:** Sanitize the error message before passing it to the LLM. Use a generic error message like `Tool "${call.name}" failed — please try again` for the LLM, and log the real error server-side only.

---

### SEC-2: Docker client leaks `err.message` in build error responses [LOW/MEDIUM]

**File:** `src/lib/docker/client.ts:174`

**Description:** `resolve({ success: false, error: err.message })` on line 174 passes raw Node.js error messages back in the response. Docker build errors may contain host file paths, container IDs, or other infrastructure details. This endpoint is admin-only, reducing risk, but the pattern is still undesirable.

**Fix:** Log the full error and return a sanitized message to the client.

---

### SEC-3: Unguarded `.json()` on hcaptcha success path could cause unhandled rejection [LOW/MEDIUM]

**File:** `src/lib/security/hcaptcha.ts:76`

**Description:** If the hcaptcha API returns a 200 with a non-JSON body, the `SyntaxError` from `response.json()` is unhandled and will cause an unhandled promise rejection in the calling context. While this is unlikely given hcaptcha's stable API, it follows the same pattern as the rate-limiter-client.ts fix from cycle 30.

**Fix:** Add `.catch()` guard returning a safe default.
