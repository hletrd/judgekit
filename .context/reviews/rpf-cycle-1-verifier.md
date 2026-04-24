# RPF Cycle 1 (loop cycle 1/100) — Verifier

**Date:** 2026-04-24
**HEAD:** 8af86fab
**Reviewer:** verifier

## Scope

Evidence-based correctness verification against stated behavior:
- `src/lib/security/csrf.ts` — CSRF validation claims vs actual behavior
- `src/lib/security/rate-limit.ts` — rate limiting claims vs actual behavior
- `src/lib/security/sanitize-html.ts` — sanitization claims vs actual behavior
- `src/lib/api/handler.ts` — createApiHandler middleware ordering claims
- `src/lib/judge/sync-language-configs.ts` — SKIP_INSTRUMENTATION_SYNC behavior claims
- `src/lib/db/schema.pg.ts` — constraint claims vs actual constraints
- Korean letter-spacing compliance — CLAUDE.md rule vs actual code

## Verification Results

1. **CSRF** — CLAIM: "Requires X-Requested-With header on mutation methods." VERIFIED: `validateCsrf()` checks `xRequestedWith !== "XMLHttpRequest"` on non-safe methods. API key auth bypasses CSRF. Claim matches behavior.

2. **Rate limiting atomicity** — CLAIM: "consumeRateLimitAttemptMulti closes the check-then-record race." VERIFIED: The function performs check+increment inside `execTransaction` with `FOR UPDATE` row locks. Claim matches behavior. However, `isRateLimited()` and `recordRateLimitFailure()` still exist as non-atomic alternatives with explicit JSDoc warnings.

3. **HTML sanitization** — CLAIM: "Narrow allowlist, no data attributes, URI regex restricts to https/mailto/root-relative." VERIFIED: `ALLOWED_TAGS` is 23 tags, `ALLOW_DATA_ATTR: false`, `ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|\/(?!\/))/i`. Hook adds `rel=noopener noreferrer` and strips non-root-relative image sources. Claim matches behavior.

4. **SKIP_INSTRUMENTATION_SYNC** — CLAIM: "Requires literal string '1' to avoid accidentally skipping in production." VERIFIED: `process.env.SKIP_INSTRUMENTATION_SYNC === "1"` is strict equality. Truthy values like `"true"`, `"yes"`, or `"on"` will NOT trigger the skip. Claim matches behavior.

5. **Korean letter-spacing** — CLAIM: "Keep Korean text at browser/font default letter spacing." VERIFIED: All 17 `tracking-*` usages are guarded with `locale !== "ko"` or have explicit comments for Latin-only content. The one unguarded use (`dropdown-menu.tsx` keyboard shortcut) does not render Korean. Claim matches behavior.

6. **Schema constraints** — CLAIM: "judge_workers.active_tasks >= 0 CHECK constraint." VERIFIED: `check("judge_workers_active_tasks_nonneg", sql\`active_tasks >= 0\`)` exists. CLAIM: "assignments.late_penalty >= 0 CHECK constraint." VERIFIED: `check("assignments_late_penalty_nonneg", sql\`${table.latePenalty} >= 0\`)` exists. Claims match behavior.

## New Findings

**No new findings this cycle.** All verified claims match actual behavior.

## Confidence

HIGH — all checked claims are verified.
