# Cycle 8 Aggregate Review (review-plan-fix loop)

## Scope
- Aggregated from: `cycle-8-comprehensive-review.md` (multi-perspective: code quality, security, performance, architecture)
- Base commit: b91dac5b

## Deduped findings

### AGG-1 — [MEDIUM] `recordRateLimitFailure` inconsistent `consecutiveBlocks` exponent — NOT A BUG
- **Severity:** ~~MEDIUM~~ NOT A BUG
- **Confidence:** HIGH (verified by test)
- **File:** `src/lib/security/rate-limit.ts:206`
- **Resolution:** The code is consistent across all three call sites — they all effectively pass the original (pre-increment) `consecutiveBlocks` value to `calculateBlockDuration`. The increment ordering differs but the result is the same:
  - `consumeRateLimitAttemptMulti`/`recordRateLimitFailureMulti`: increment first, then pass `consecutiveBlocks - 1` (gets original value)
  - `recordRateLimitFailure`: pass `consecutiveBlocks` first (original value), then increment
  - Test at `rate-limit.test.ts:148` confirms correct behavior. Initial "fix" was reverted.

### AGG-2 — [MEDIUM] Backup route `body` variable shadows outer `body` in `includeFiles` branch
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **File:** `src/app/api/v1/admin/backup/route.ts:39,87`
- **Evidence:** Line 39 declares `let body` (parsed request). Line 87 re-declares `const body` (ReadableStream). The shadowing is a maintenance hazard.
- **Fix:** Rename line 87's variable to `backupStream`

### AGG-3 — [MEDIUM] `encryption.ts` `getKey()` parses env var on every call
- **Severity:** MEDIUM
- **Confidence:** MEDIUM
- **File:** `src/lib/security/encryption.ts:23-40`
- **Evidence:** `getKey()` does `process.env.NODE_ENCRYPTION_KEY?.trim()` + `Buffer.from(hex, "hex")` per invocation. Key is static at runtime.
- **Fix:** Lazy-cache the key at module scope

### AGG-4 — [MEDIUM] `waitForReadableStreamDemand` uses aggressive 10ms polling
- **Severity:** MEDIUM
- **Confidence:** MEDIUM
- **File:** `src/lib/db/export.ts:32-43`
- **Evidence:** Polls every 10ms during backpressure. Holds a REPEATABLE READ transaction open.
- **Fix:** Increase polling interval to 50ms

### AGG-5 — [LOW] `recordRateLimitFailure` explicit `nanoid()` inconsistent with `$defaultFn` pattern
- **Severity:** LOW
- **Confidence:** MEDIUM
- **File:** `src/lib/security/rate-limit.ts:223`
- **Fix:** Remove explicit `id: nanoid()`

### AGG-6 — [LOW] `processImage` errors produce generic 500
- **Severity:** LOW
- **Confidence:** MEDIUM
- **File:** `src/lib/files/image-processing.ts:25`, `src/app/api/v1/files/route.ts:74`
- **Fix:** Wrap `processImage` in try-catch, return 400 for invalid images

### AGG-7 — [LOW] Community `scopeType: "solution"` thread creation lacks solved-problem check
- **Severity:** LOW
- **Confidence:** MEDIUM
- **File:** `src/app/api/v1/community/threads/route.ts:17-30`
- **Fix:** Add accepted-submission check for solution threads

### AGG-8 — [LOW] Deprecated `recruitingInvitations.token` column still has unique index
- **Severity:** LOW
- **Confidence:** MEDIUM
- **File:** `src/lib/db/schema.pg.ts:937,961`
- **Fix:** Drop `ri_token_idx` index and `token` column in future migration

### AGG-9 — [LOW] `validateExport` missing duplicate table name check
- **Severity:** LOW
- **Confidence:** LOW
- **File:** `src/lib/db/export.ts:306-311`
- **Fix:** Add `Set` check for duplicate table names

### AGG-10 — [LOW] `bytesToBase64` in proxy.ts lacks Edge Runtime comment
- **Severity:** LOW
- **Confidence:** LOW
- **File:** `src/proxy.ts:30-36`
- **Fix:** Add comment explaining Edge Runtime compatibility

## Prior-cycle findings verified as fixed

All 9 findings from the prior cycle-8 review (F1-F9) have been verified as fixed in the current codebase.

## Deferred items carried forward from cycle 7b

- D1: SSE submission events route capability check incomplete (MEDIUM)
- D2: Compiler workspace directory mode 0o770 (MEDIUM)
- D3: JWT callback DB query on every request (MEDIUM)
- D4: Test coverage gaps for workspace-to-public migration Phase 2 (MEDIUM)
- D5: Backup/restore/migrate routes use manual auth pattern (LOW)
- D6: Files/[id] DELETE/PATCH manual auth (LOW)
- D7: SSE re-auth rate limiting (LOW)
- D8: PublicHeader click-outside-to-close (LOW)
- D9: `namedToPositional` regex alignment (LOW)

---

# Cycle 6b Aggregate Review (review-plan-fix loop) — ARCHIVED

## Scope
- Aggregated from: `cycle-6b-code-reviewer.md`, `cycle-6b-security-reviewer.md`, `cycle-6b-perf-reviewer.md`, `cycle-6b-architect.md`, `cycle-6b-test-engineer.md`, `cycle-6b-debugger.md`, `cycle-6b-verifier.md`
- Base commit: 64f02d4d

## Deduped findings

### AGG-1 — Files GET route `countResult.count` missing `Number()` wrapper
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Cross-agent agreement:** code-reviewer F5, debugger D1, verifier V1
- **Evidence:**
  - `src/app/api/v1/files/route.ts:188`: passes `countResult.count` raw to `apiPaginated`
  - `src/app/api/v1/users/route.ts:51`: correctly uses `Number(totalRow?.count ?? 0)`
  - `src/app/api/v1/groups/[id]/assignments/route.ts:49`: correctly uses `Number(totalRow?.count ?? 0)`
  - Drizzle/PG returns `count(*)` as string in some configurations
- **Why it matters:** API response `total` field would be `"42"` instead of `42`, breaking client-side pagination math
- **Suggested fix:** Change `countResult.count` to `Number(countResult.count)`

### AGG-2 — Proxy matcher missing `/users/:path*` and `/problem-sets/:path*`
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Cross-agent agreement:** security-reviewer S3, architect A3, verifier V2
- **Evidence:**
  - `src/proxy.ts:306-324`: matcher list does not include these patterns
  - `src/app/(public)/users/[id]/page.tsx`: page exists but gets no CSP/nonce/locale
  - `src/app/(public)/problem-sets/`: pages exist but get no CSP/nonce/locale
- **Why it matters:** Public pages skip all middleware processing — no CSP headers, no nonce injection, no locale resolution
- **Suggested fix:** Add `/users/:path*` and `/problem-sets/:path*` to `config.matcher`

### AGG-3 — Dual-query pagination in 4 routes (submissions, files, users, groups/assignments)
- **Severity:** LOW (MEDIUM for submissions due to traffic)
- **Confidence:** HIGH
- **Cross-agent agreement:** perf-reviewer P1-P4, code-reviewer F2-F4
- **Evidence:**
  - `src/app/api/v1/submissions/route.ts:111-159` — MEDIUM (high traffic)
  - `src/app/api/v1/files/route.ts:162-186` — LOW
  - `src/app/api/v1/users/route.ts:38-51` — LOW
  - `src/app/api/v1/groups/[id]/assignments/route.ts:45-67` — LOW
  - Same pattern fixed for rankings (RANK-01), chat-logs (CHAT-LOG-01) in prior cycles
- **Suggested fix:** Use `COUNT(*) OVER()` window function in data queries

### AGG-4 — 12 API routes bypass `createApiHandler` wrapper
- **Severity:** LOW
- **Confidence:** HIGH
- **Cross-agent agreement:** code-reviewer F1, security-reviewer S1, architect A1
- **Evidence:** 12 routes use manual `getApiUser` + `csrfForbidden` pattern. Some have legitimate reasons (SSE streaming, file upload). Admin backup/restore/migrate routes should be migrated for security consistency.
- **Suggested fix:** Migrate admin backup/restore/migrate and tags routes to `createApiHandler`. Keep SSE and file-upload routes as documented exceptions.

### AGG-5 — Missing route-level tests for multiple endpoints
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Cross-agent agreement:** test-engineer T1-T6
- **Evidence:**
  - Tags GET route: no tests (had LIKE bug with no coverage)
  - Files GET (list) route: no tests
  - Groups/[id]/assignments route: no tests
  - Admin backup/restore/migrate routes: no tests
  - PublicHeader dropdown: identified in rpf-cycle-5 M5, still TODO
- **Suggested fix:** Add route-level tests, prioritizing tags (had prior bug) and admin destructive routes

### AGG-6 — Tags route lacks rate limiting
- **Severity:** LOW
- **Confidence:** HIGH
- **Cross-agent agreement:** security-reviewer S2
- **Evidence:** `src/app/api/v1/tags/route.ts` — no `consumeApiRateLimit` call and not wrapped in `createApiHandler`
- **Suggested fix:** Wrap in `createApiHandler` or add rate limiting manually

## Verification results from prior-cycle fixes

| Fix | Status |
|---|---|
| Cycle 5 LIKE-01/02: Tags route LIKE escape order | CONFIRMED FIXED |
| Cycle 5 LIKE-02: Shared `escapeLikePattern` utility | CONFIRMED FIXED |
| Cycle 3 WS-PHASE1: Workspace route group elimination | CONFIRMED FIXED |
| Cycle 4 AGG-9: Dead `/workspace/:path*` proxy matcher entry | CONFIRMED FIXED |
| Cycle 5 H1: Dead `adminOnly`/`instructorOnly` flags removed | CONFIRMED FIXED |
| Cycle 6 SHUTDOWN-02: Duplicate SIGTERM handler removed | CONFIRMED FIXED |
| Cycle 6 SQL-01: Raw SQL column references fixed | CONFIRMED FIXED |
| Cycle 6 DATA-06/07/08: Column selections added | CONFIRMED FIXED |

## Lower-signal / validation-needed findings

- architect A2: PublicHeader `loggedInUser.role` typed as `string` instead of `UserRole` — valid type-safety improvement but low risk since the comparisons match existing role strings
- architect A4: Contest export uses raw SQL alongside Drizzle — style inconsistency, not a bug
- architect A5: CSV export pattern duplicated — DRY improvement, not a bug
- perf-reviewer P5: SSE cleanup timer runs with no connections — negligible cost
- perf-reviewer P6: Submissions summary third query — optimization opportunity
- debugger D2: Redundant `String()` in group export — cosmetic
- security-reviewer S5: `new Date()` clock skew — deferred in prior cycles, still valid

## Revalidated non-actions from prior cycles

### CLOSED-01: Password-complexity escalation requests are invalid under repo policy
- `AGENTS.md` explicitly forbids adding complexity requirements

### CLOSED-02: JSON-LD script-escaping is already fixed
- `src/components/seo/json-ld.tsx` uses `safeJsonForScript()`

### CLOSED-03: Shell-command prefix-bypass is already fixed
- `src/lib/compiler/execute.ts` uses `isValidCommandPrefix()`

### CLOSED-04: WorkspaceNav tracking on Korean text is safe
- `tracking-[0.18em]` applies only to English uppercase section label

## Agent failures
- No agent failures this cycle — all reviews completed successfully
