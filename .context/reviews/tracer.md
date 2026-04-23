# Tracer Review — RPF Cycle 16

**Date:** 2026-04-22
**Reviewer:** tracer
**Base commit:** 9379c26b

## Inventory of Review-Relevant Files

Focus: causal tracing of suspicious data flows, competing hypotheses for failure modes, and cross-component interaction analysis.

## Findings

### TR-1: `compiler-client.tsx` error path `.json()` — causal chain tracing [MEDIUM/HIGH]

**File:** `src/components/code/compiler-client.tsx:267-284`
**Confidence:** HIGH

**Causal chain:**
1. User clicks "Run" in compiler client
2. `apiFetch(runEndpoint, ...)` sends POST to compiler runner
3. Compiler runner is behind nginx reverse proxy
4. nginx returns 502 Bad Gateway with HTML body
5. `res.ok` is `false`, entering the `if (!res.ok)` branch
6. `await res.json()` is called on HTML body
7. `SyntaxError: Unexpected token <` is thrown
8. Inner `catch` block catches the SyntaxError
9. `errorMessage = res.statusText || errorMessage` — `res.statusText` is "Bad Gateway"
10. **Wait** — the inner `catch` actually sets `errorMessage = res.statusText || errorMessage`

Re-reading the code more carefully:

```ts
if (!res.ok) {
  let errorMessage = "Request failed";
  try {
    const errorData = await res.json();     // throws on non-JSON
    errorMessage = errorData.error || errorData.message || errorMessage;
  } catch {
    // Server returned non-JSON error
    errorMessage = res.statusText || errorMessage;
  }
```

The inner `catch` does use `res.statusText` as fallback. So the actual behavior is:
- If the error body IS JSON: uses `errorData.error || errorData.message || "Request failed"`
- If the error body is NOT JSON: uses `res.statusText || "Request failed"`

This means the bug is less severe than initially assessed — the fallback works correctly. However, the `res.json()` call without `.catch()` still represents a code pattern inconsistency that contradicts the `apiFetch` JSDoc guidelines. The concern is that the outer `catch` block would handle this differently (producing a "Network error" message) if the inner catch didn't exist.

**Revised assessment:** LOW/MEDIUM — The code works correctly in practice due to the inner catch, but the pattern violates the documented convention and creates a subtle code smell.

---

### TR-2: `invite-participants.tsx` search race condition — causal chain [MEDIUM/MEDIUM]

**File:** `src/components/contest/invite-participants.tsx:34-64`
**Confidence:** HIGH

**Causal chain:**
1. User types "j" — debounce timer starts (300ms)
2. After 300ms, `search("j")` fires: `apiFetch("/api/v1/contests/.../invite?q=j")`
3. User types "jo" — new debounce timer starts (previous timer cleared)
4. After 300ms, `search("jo")` fires: `apiFetch("/api/v1/contests/.../invite?q=jo")`
5. Both requests are now in-flight simultaneously
6. Request for "j" resolves: `setResults(data.data)` — shows results for "j"
7. Request for "jo" resolves: `setResults(data.data)` — shows results for "jo"
8. If step 6 happens AFTER step 7, the user briefly sees correct "jo" results, then sees stale "j" results

This is a confirmed race condition. The user sees results for the wrong search query.

**Fix:** Add AbortController to cancel previous in-flight search.

---

### TR-3: `test-connection/route.ts` — tracing the `req.json()` call without `.catch()` [MEDIUM/MEDIUM]

**File:** `src/app/api/v1/plugins/chat-widget/test-connection/route.ts:37`
**Confidence:** HIGH

**Causal chain:**
1. Client sends POST with malformed body (not valid JSON)
2. `createApiHandler` wrapper calls the inner handler
3. Handler calls `await req.json()` at line 37 — throws SyntaxError
4. The `createApiHandler` wrapper catches this in its outer `try/catch` (line 195-198 of handler.ts)
5. Returns `{ error: "internalServerError" }` with status 500

But if the `schema` option were used, `createApiHandler` would catch the parse error at lines 156-158 and return `{ error: "invalidJson" }` with status 400. The current code returns 500 for a 400-class error.

**Fix:** Use `schema` option in `createApiHandler` config, or add try/catch around `req.json()`.

## Final Sweep

- Traced all API call chains in recently changed components
- Verified that the compiler-client inner catch mitigates the unguarded `.json()` — severity revised downward
- The `test-connection/route.ts` returns wrong HTTP status code for malformed JSON — this is a concrete bug
