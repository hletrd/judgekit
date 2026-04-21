# Cycle 27 Aggregate Review (Updated)

**Date:** 2026-04-20
**Base commit:** 941d34f4
**Review artifacts:** `cycle-27-code-reviewer.md` through `cycle-27-verifier.md` (prior pass), plus fresh deep review

## Status of Prior Cycle-27 Findings

- **AGG-1** (Recruit page clock-skew): FIXED — page now uses `getDbNow()` (line 37, 75)
- **AGG-2** (Recruit page `toLocaleString()`): FIXED — page now uses `formatDateTimeInTimeZone()`
- **AGG-3** (SSE `user!` non-null assertion): FIXED — no `user!` pattern found in events route
- **AGG-4** (Inconsistent `createApiHandler`): Still open, architectural concern
- **AGG-5** (SSE O(n) eviction): Acceptable, no action needed
- **AGG-6** (Recruit page 3 DB queries): Still open, low priority
- **AGG-7** (No test coverage for recruit/SSE): Still open

## New Findings (Fresh Deep Review)

### AGG-8: Error boundary components use `console.error` in production [MEDIUM/MEDIUM]

**Flagged by:** fresh code-quality review, security review
**Files:**
- `src/app/(dashboard)/dashboard/admin/error.tsx:17`
- `src/app/(dashboard)/dashboard/submissions/error.tsx:17`
- `src/app/(dashboard)/dashboard/problems/error.tsx:17`
- `src/app/(dashboard)/dashboard/groups/error.tsx:17`

**Description:** All four error boundary components use `console.error()` to log errors. In production, this writes unstructured error data to browser DevTools (and potentially to log aggregation services via client-side telemetry). The error object may contain sensitive stack traces or internal paths that should not be exposed in client-side logs.
**Concrete failure scenario:** A production error leaks an internal file path or DB query in the stack trace, visible in browser DevTools to any user who opens the console.
**Fix:** Use the structured logger (`@/lib/logger`) in development only, or gate the `console.error` behind `process.env.NODE_ENV === "development"`. Next.js error boundaries already receive a `digest` field for server-side error tracking.

### AGG-9: `console.warn("Tag suggestions fetch failed")` in production code [LOW/MEDIUM]

**Flagged by:** fresh code-quality review
**Files:** `src/app/(dashboard)/dashboard/problems/create/create-problem-form.tsx:225`

**Description:** A `console.warn()` call is used in a catch block for non-critical tag suggestions. While the comment correctly identifies the call as non-critical, it still writes to the console in production. The codebase's own convention (documented in `src/lib/api/client.ts:23`) says "Log errors in development only".
**Concrete failure scenario:** Minor — produces noise in production console logs.
**Fix:** Gate behind `process.env.NODE_ENV === "development"` or use the structured logger.

### AGG-10: `not-found.tsx` line 58 — `tracking-[0.2em]` on "404" text not locale-conditional [LOW/MEDIUM]

**Flagged by:** fresh designer/code-quality review
**Files:** `src/app/not-found.tsx:58`

**Description:** `<p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">404</p>` applies `tracking-[0.2em]` unconditionally. While "404" is a numeric code (not Korean text), the CLAUDE.md rule says Korean text must use default letter-spacing. The number itself is safe, but the pattern is inconsistent with the rest of the codebase where even numeric/alphanumeric tracking is either locale-conditional or explicitly documented.
**Concrete failure scenario:** No real user impact — "404" is always a numeric code. Pattern inconsistency only.
**Fix:** Add a comment `/* "404" is a numeric status code — tracking safe for Korean locale */` for consistency with the existing documentation convention used elsewhere.

### AGG-11: Contest layout forces full page navigation — may conflict with Next.js App Router [LOW/MEDIUM]

**Flagged by:** fresh architect/debugger review
**Files:** `src/app/(dashboard)/dashboard/contests/layout.tsx:16-45`

**Description:** The `ContestsLayout` component intercepts all `<a>` clicks within `#main-content` and `[data-slot='sidebar']` and forces `window.location.href = href` instead of allowing Next.js client-side navigation. This is documented as a workaround for a Next.js 16 RSC streaming bug with nginx proxy headers. However:
1. The event listener captures ALL clicks, including those on buttons styled as links or external links that should open in new tabs.
2. The `href.startsWith("http")` check prevents navigation for same-origin absolute URLs.
3. The `data:` and `javascript:` checks are defensive but unnecessary in practice.
**Concrete failure scenario:** A link to `https://same-domain.com/path` would bypass the handler due to the `http` prefix check, falling through to RSC navigation (potentially triggering the bug). Also, this workaround will become dead code when the Next.js bug is fixed, and the TODO comment is the only marker.
**Fix:** Low priority — the workaround is necessary. Consider adding a more targeted check (same-origin only) instead of the blanket `http` exclusion. Add a version check or GitHub issue link to track removal.

### AGG-12: `use-source-draft.ts` JSON.parse without try/catch in one location [LOW/LOW]

**Flagged by:** fresh code-quality review
**Files:** `src/hooks/use-source-draft.ts:185`

**Description:** `const parsedValue = JSON.parse(rawValue) as Partial<DraftPayload>;` is called inside a try/catch block (line 173-214), so it's safe. However, the `as Partial<DraftPayload>` cast bypasses runtime validation. If localStorage contains malformed or outdated data (e.g., from a previous version of the app), the parsed value could have unexpected properties that cause runtime errors downstream.
**Concrete failure scenario:** A user upgrades from an older version where the draft schema was different. The parsed value has the wrong shape but TypeScript trusts the `as` cast.
**Fix:** Low priority — add a runtime shape check after parsing, or use zod for validation.

## Verified Safe / No Regression Found

- Auth flow is robust with Argon2id, timing-safe dummy hash, rate limiting, and proper token invalidation.
- No `dangerouslySetInnerHTML` without sanitization (json-ld uses `safeJsonForScript`, problem-description uses `sanitizeHtml`).
- No `as any` type casts in production code.
- No `@ts-ignore` or `@ts-expect-error`.
- Only 2 eslint-disable directives in production code, both with justification comments.
- No silently swallowed catch blocks (all have comments explaining the intent or surface errors to users).
- Environment variables are properly validated in production.
- CSRF protection is in place for server actions (`apiFetch` adds `X-Requested-With`).
- Rate limiting has two-tier strategy (sidecar + PostgreSQL with SELECT FOR UPDATE) preventing TOCTOU races.
- Recruiting token flow uses atomic SQL transactions for claim validation.
- Korean letter-spacing remediation is comprehensive — all headings and labels are properly locale-conditional.
- Previous cycle-26 fixes are all confirmed working (recruit test, ESLint config, React.cache, tracking comments).
- Cycle-27 AGG-1 (clock-skew) confirmed fixed with `getDbNow()`.
- Cycle-27 AGG-2 (toLocaleString) confirmed fixed with `formatDateTimeInTimeZone()`.
- Cycle-27 AGG-3 (user! non-null) confirmed fixed.
- Recruit page `React.cache()` deduplication is in place and working.
- ESLint `destructuredArrayIgnorePattern: "^_"` is in place.
- All test files pass (294 test files, 2104 tests).

## Gate Baseline

- **ESLint**: 0 errors, 14 warnings (all in untracked scripts/tooling files, not in `src/`)
- **tsc --noEmit**: Clean (exit code 0)
- **vitest run**: 294/294 passed, 2104 tests (some tests exhibit flakiness under parallel load)
- **next build**: Not yet run this cycle

## Agent Failures

None. All review perspectives completed successfully.
