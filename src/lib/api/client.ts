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
 * | Auth errors (401, 403)              | Redirect to login or show access-denied message             |
 * | Not found (404)                     | Call notFound() in server components; inline in client       |
 *
 * General rules:
 * - Never silently swallow errors — always surface them to the user
 * - Avoid duplicate feedback (e.g., both toast AND inline for the same error)
 * - Use i18n keys for all user-facing error messages
 * - Log errors in development only (process.env.NODE_ENV === "development")
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
