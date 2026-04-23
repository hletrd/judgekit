# Document Specialist Review — RPF Cycle 29

**Date:** 2026-04-23
**Reviewer:** document-specialist
**Base commit:** a51772ae

## Previously Fixed Items (Verified)

- Code editor i18n: Fixed (commit 5c387c7b)
- Contest replay setInterval: Fixed (commit 9cc30d51)

## DOC-1: Quick-answer text in clarifications not documented as i18n-requiring [LOW/LOW]

**File:** `src/components/contest/contest-clarifications.tsx:290-296`

The `apiFetchJson` client documentation in `src/lib/api/client.ts` documents the pattern for error handling, but there is no documentation about the convention that *all* user-facing strings passed to API calls must be localized. The quick-answer text ("Yes", "No", "No comment") passed to the API is a data string, not a label, which makes it less obvious that it needs i18n treatment.

**Fix:** This is a code issue, not a documentation issue. The strings should be localized. No doc change needed.

---

## DOC-2: `useVisibilityPolling` doc comment doesn't mention `setInterval` vs `setTimeout` convention [LOW/LOW]

**File:** `src/hooks/use-visibility-polling.ts:1-16`

The hook's doc comment says "Starts polling immediately when the page is visible" and "Pauses polling when the page is hidden." It does not mention that the codebase convention is to use recursive `setTimeout` instead of `setInterval`, and that this hook is the exception.

**Fix:** Minor doc improvement — note the setInterval usage and the reason it has not yet been migrated.

---

## Document Specialist Findings (carried/deferred)

### DOC-CARRIED-1: SubmissionStatus type split — carried from DEFER-32
### DOC-CARRIED-2: CSRF documentation mismatch — carried from DEFER-35
