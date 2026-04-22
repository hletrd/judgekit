/**
 * Wrapper around fetch() that adds the required X-Requested-With header
 * for CSRF protection on all requests.
 */

/**
 * Error Handling Convention
 * ========================
 *
 * All client-side API consumers should follow these patterns:
 *
 * | Error type                          | Handling pattern                                          |
 * |-------------------------------------|-----------------------------------------------------------|
 * | Network / server errors (5xx)       | Toast notification — transient, non-blocking               |
 * | Validation errors (4xx with fields) | Inline form errors — persistent, adjacent to field          |
 * | Auth errors (401, 403)              | Typically surfaced via toast notifications; session middleware handles login redirects |
 * | Not found (404)                     | Call notFound() in server components; inline in client       |
 *
 * General rules:
 * - Never silently swallow errors — always surface them to the user
 * - Avoid duplicate feedback (e.g., both toast AND inline for the same error)
 * - Use i18n keys for all user-facing error messages
 * - Log errors in development only (process.env.NODE_ENV === "development")
 *
 * **CRITICAL: Always check `response.ok` before calling `response.json()`.**
 * Calling `.json()` on a non-JSON body (e.g., 502 HTML from a reverse proxy)
 * throws a SyntaxError that bypasses error-handling logic. Use the established
 * pattern: check `response.ok` first, then use `.json().catch(() => ({}))`
 * when parsing error responses, or `.json()` for success responses inside
 * an `if (response.ok)` block.
 *
 * Example (success-first — recommended):
 * ```ts
 * const response = await apiFetch("/api/v1/resource");
 * if (!response.ok) {
 *   const errorBody = await response.json().catch(() => ({}));
 *   toast.error((errorBody as { error?: string }).error ?? "Request failed");
 *   return;
 * }
 * const payload = await response.json();
 * ```
 *
 * **Anti-pattern (error-first) — DO NOT USE:**
 * ```ts
 * // BAD: .json() is called before response.ok is checked.
 * // If the server returns non-JSON (e.g., 502 HTML), .json() throws SyntaxError.
 * const body = await response.json();  // <-- throws on non-JSON error bodies
 * if (!response.ok) {
 *   throw new Error(body.error);  // <-- never reached
 * }
 * ```
 * Always check `response.ok` BEFORE calling `.json()`.
 */
export function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const headers = new Headers(init?.headers);

  if (!headers.has("X-Requested-With")) {
    headers.set("X-Requested-With", "XMLHttpRequest");
  }

  return fetch(input, { ...init, headers });
}
