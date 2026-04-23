"use client";

/**
 * Force a full-page navigation via `window.location.assign()`.
 *
 * Prefer `router.push()` from `next/navigation` for in-app client-side
 * navigation. Use this only when a full page reload is required — e.g., when
 * changing the locale, which needs the server to re-render with new messages.
 */
export function forceNavigate(url: string) {
  window.location.assign(url);
}
