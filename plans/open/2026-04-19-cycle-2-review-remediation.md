# Cycle 2 Review Remediation Plan (current loop pass)

**Date:** 2026-04-19  
**Source:** `.context/reviews/_aggregate.md`, per-agent reviews under `.context/reviews/`  
**Status:** PARTIALLY COMPLETE

## Planning notes
- This pass re-read repo rules first: `CLAUDE.md`, `AGENTS.md`, `.context/development/*.md`, and `docs/deployment.md`.
- The prior `plans/open/2026-04-19-cycle-2-review-remediation.md` was already complete and has been archived to `plans/archive/2026-04-19-cycle-2-review-remediation-initial.md`.
- Review findings are mapped below to either implementation stories or explicit deferred / invalidated items. No review finding is intentionally dropped.

---

## Implementation stories for this pass

### AUTH-01 — Honor reverse-proxy trusted-host mode for auth route validation
**Sources:** AGG-1  
**Severity:** HIGH | **Confidence:** HIGH | **Effort:** Quick win

**Files:**
- `src/lib/auth/trusted-host.ts`
- `tests/unit/auth/trusted-host.test.ts`

**Problem:** Live browser audit showed `/login` submits to `/api/auth/error` with `{"error":"UntrustedHost"}` on `algo.xylolabs.com`. The custom auth-route wrapper validates trusted hosts before delegating to Auth.js, but it does not honor `AUTH_TRUST_HOST=true`, even though the repo already uses that flag in `authConfig` and deployment docs.

**Fix:**
- Import and honor `shouldTrustAuthHost()` in `validateTrustedAuthHost()`.
- When trusted-proxy mode is enabled, skip the custom host rejection and let Auth.js trust the forwarded host.
- Add regression coverage for the trusted-proxy path without weakening the existing explicit-host checks.

**Verification:**
- `npx vitest run tests/unit/auth/trusted-host.test.ts`
- targeted browser reasoning against the captured live failure (`browser-audit-input-cycle-2.md`)

---

### UX-01 — Remove the raw `compiler.testCaseLabel` leak from the public playground
**Sources:** AGG-2  
**Severity:** MEDIUM | **Confidence:** HIGH | **Effort:** Quick win

**Files:**
- `src/app/(dashboard)/dashboard/compiler/compiler-client.tsx`
- `tests/component/compiler-client.test.tsx`

**Problem:** The public playground currently renders the untranslated key `compiler.testCaseLabel` for the active test-case label. The label uses the `compiler.testCaseLabel` message without providing the required `{number}` interpolation value.

**Fix:**
- Render the label with a concrete number (derived from the active tab index), or switch to a non-interpolated label string.
- Add a regression test asserting the rendered label is user-facing text, not the message key.

**Verification:**
- `npx vitest run tests/component/compiler-client.test.tsx`

---

## Deferred / invalidated review register

| Bucket | Source finding IDs | File + line citation | Original severity / confidence | Disposition | Reason | Exit criterion |
| --- | --- | --- | --- | --- | --- | --- |
| LIVE-01 | AGG-3 | `src/app/(public)/practice/page.tsx` | High / High (live), Medium (repo root cause) | Deferred | Confirmed live failure on `algo.xylolabs.com`, but root cause was not reproducible from current repo state within this pass; needs production-like data/log inspection before a safe code change. | Re-open when the failure is reproduced locally or a production stack trace identifies the failing query/render path. |
| LIVE-02 | AGG-4 | `src/app/(public)/rankings/page.tsx` | High / High (live), Medium (repo root cause) | Deferred | Same as above: confirmed live failure, but root cause needs reproducible evidence before changing the ranking query/render path. | Re-open when current HEAD reproduces the failure locally or live logs isolate the failing statement/component. |
| LIVE-03 | AGG-5 | `src/app/(public)/languages/page.tsx`, `src/lib/judge/dashboard-data.ts` | Medium / High (live), Medium (repo root cause) | Deferred | Confirmed live hanging state only. No safe code-level root cause isolated in this pass. | Re-open when the loading hang is reproduced against current HEAD or traced to a specific data fetch / hydration failure. |
| REVIEW-INVALID-01 | F1, S1, C1, T1 | `src/lib/security/password.ts:1-73` | High / High | Invalidated by repo policy | `AGENTS.md` explicitly requires password validation to check **only** minimum length (8 chars) and forbids complexity/similarity/dictionary rules. These review requests cannot be implemented as written. | Re-open only if the repository's password policy changes. |
| REVIEW-STALE-01 | V1 | `src/lib/security/password.ts:36-73` | High / Confirmed | Invalidated as stale | Current HEAD already uses `context?.username` and `context?.email`; the review claim that the parameter is dead code no longer matches the file. | Re-open if the context checks are removed/regressed in a future change. |
| ARCH-01 | F7, C3, V2, A2, D1, T4 | `src/lib/security/rate-limit.ts:35-43`, `src/lib/realtime/realtime-coordination.ts:92-128` | High / High | Deferred | Real architectural risk, but fixing it safely requires a schema / migration / coordination redesign beyond this pass. | Re-open when a dedicated persistence-lane plan exists for separating SSE coordination from generic rate-limit rows. |
| PERF-EXPORT-01 | P1, P3, P4, C4, D2 | `src/lib/db/export.ts:36-76,332-364` | High / High | Deferred | Deprecated export helpers are not on the critical user path; cleanup should happen in a focused export-subsystem pass with compatibility review. | Re-open when the export subsystem cleanup lane is scheduled. |
| DATA-ACCESS-01 | F3, S4 | `src/app/api/v1/languages/route.ts:12`, `src/app/api/v1/admin/roles/[id]/route.ts:20`, representative multi-file pattern | Medium / High | Deferred | Plausible repo-wide hardening opportunity, but the safe fix is a larger explicit-column audit that exceeds this pass. | Re-open when a repository-wide sensitive-column selection audit is scheduled. |
| PERF-RATE-01 | P2 | `src/lib/security/rate-limit.ts:130-178` | Medium / High | Deferred | Multi-key batching is worthwhile but needs benchmarking and careful SQL changes in the auth path. | Re-open when auth/rate-limit performance profiling shows this path is material. |
| SEC-CRYPTO-01 | S2, C2, A1 | `src/lib/security/password-hash.ts`, `src/lib/security/encryption.ts`, `src/lib/security/derive-key.ts` | Medium / High | Deferred | These are broader auth/crypto architecture concerns requiring coordinated migration planning. | Re-open when a dedicated auth/crypto migration plan is approved. |
| SEC-REVIEW-STALE-01 | S5, C6, V5 | `src/components/seo/json-ld.tsx:19` | Low / Medium | Invalidated as stale | Current HEAD already uses `safeJsonForScript(data)` rather than raw `JSON.stringify(...)` into `dangerouslySetInnerHTML`. | Re-open if `safeJsonForScript` is removed or bypassed. |
| SEC-REVIEW-STALE-02 | S6, V3 | `src/lib/compiler/execute.ts:188-221` | Medium / Confirmed | Invalidated as stale | Current HEAD already replaced raw `startsWith()` command validation with `isValidCommandPrefix()` and suffix validation. | Re-open if strict command-prefix validation regresses. |
| SEC-LOW-01 | S7, S9 | `src/lib/security/rate-limit.ts:27-32`, `src/lib/security/ip.ts:71` | Low / Low-High | Deferred | Low-severity defense-in-depth ideas; not cycle-critical next to live-user failures. | Re-open when rate-limit / IP extraction behavior is revisited. |
| AUTH-DATA-01 | S8, A5 | `src/lib/auth/config.ts:68-93,354-377` | Low / Medium | Deferred | JWT payload trimming is a broader auth/session optimization and not tied to the confirmed live failures in this pass. | Re-open when auth/session payload optimization is prioritized. |
| CODE-LOW-01 | F4, F5, F6, C5 | representative: `src/hooks/use-source-draft.ts`, `src/app/api/v1/users/route.ts:89-90`, `src/lib/audit/events.ts:89-121` | Low-Medium / Medium-High | Deferred | Valid maintainability concerns, but secondary to confirmed public regressions. | Re-open when a focused cleanup / observability pass is scheduled. |
| PERF-LOW-01 | P5, P6, P7 | representative: `src/lib/security/rate-limiter-client.ts`, `src/lib/docker/client.ts`, `src/lib/audit/events.ts:118-121` | Low-Medium / Medium | Deferred | Lower-risk performance hardening items; not critical this pass. | Re-open when performance profiling or incident evidence elevates them. |
| DEBUG-LOW-01 | D3, D4, D5 | representative: `src/lib/db/import-transfer.ts`, `src/lib/actions/*.ts`, `src/lib/docker/client.ts:28` | Low-Medium / Low-Medium | Deferred | Useful hardening items, but not the highest-signal cycle-2 fixes. | Re-open when import/runtime hardening is the active lane. |
| UX-LOW-01 | UX1, UX2, UX3, UX5, UX6 | representative: `src/app/(dashboard)/dashboard/*/error.tsx`, `src/components/layout/skip-to-content.tsx`, `src/components/exam/countdown-timer.tsx`, `src/components/code/code-editor-skeleton.tsx` | Low / Medium-High | Deferred | Worthwhile UX polish, but lower priority than confirmed live public breakages. | Re-open when the next dedicated UX/accessibility pass is scheduled. |
| UX-PASS-01 | UX4 | CLAUDE Korean letter-spacing rule | N/A / High | Closed / pass | Review explicitly confirmed compliance with current repo rule. | Re-open only if Korean typography changes. |

---

## Progress ledger

| Story | Status | Commit |
| --- | --- | --- |
| AUTH-01 | Done | `5353f41f` |
| UX-01 | Done | `c5363d87` |
