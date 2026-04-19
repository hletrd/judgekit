# Cycle 4 Aggregate Review (review-plan-fix loop)

## Scope
- Aggregated from: `cycle-4-code-reviewer.md`, `cycle-4-security-reviewer.md`, `cycle-4-perf-reviewer.md`, `cycle-4-architect.md`, `cycle-4-test-engineer.md`, `cycle-4-debugger.md`, `cycle-4-critic.md`, `cycle-4-verifier.md`, `cycle-4-designer.md`
- Base commit: 5086ec22

## Deduped findings

### AGG-1 — Contest export has no row limit (OOM risk)
- **Severity:** HIGH
- **Confidence:** HIGH
- **Cross-agent agreement:** code-reviewer F6, perf-reviewer F1, debugger F4, critic F1, verifier F1
- **Evidence:**
  - `src/app/api/v1/contests/[assignmentId]/export/route.ts:67`: `computeContestRanking(assignmentId)` returns all entries without limit
  - Same OOM class as admin submissions export (AGG-1, cycle 3) which was fixed with `.limit(10000)`
  - The cycle 3 fix only covered the direct Drizzle query path, missing the `computeContestRanking` path
- **Why it matters:** A contest with 10,000+ participants could OOM the server during export
- **Suggested fix:** Add a hard cap (e.g., 10,000 entries) to `computeContestRanking` or add post-query truncation in the export route

### AGG-2 — Contest export uses local `escapeCsvCell` with weaker formula-injection mitigation than shared utility
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Cross-agent agreement:** code-reviewer F2, security-reviewer F1, debugger F1, critic F2, verifier F2
- **Evidence:**
  - `src/app/api/v1/contests/[assignmentId]/export/route.ts:17`: uses `'${escaped}'` (single-quote prefix)
  - `src/lib/csv/escape-field.ts:13`: uses `"\t" + str` (tab prefix)
  - Tab prefix is more widely recognized by spreadsheet applications as a formula-injection escape
- **Why it matters:** CSV formula injection is an OWASP-recognized vulnerability. The single-quote prefix may not prevent formula execution in all spreadsheet applications
- **Suggested fix:** Import `escapeCsvField` from `@/lib/csv/escape-field` and delete the local `escapeCsvCell`

### AGG-3 — Group assignment export uses local `escapeCsvField` instead of shared utility
- **Severity:** LOW
- **Confidence:** HIGH
- **Cross-agent agreement:** code-reviewer F3, critic F2
- **Evidence:**
  - `src/app/api/v1/groups/[id]/assignments/[assignmentId]/export/route.ts:12-25`: local `escapeCsvField`
  - This implementation uses the same tab-prefix strategy as the shared utility, so there is no security divergence, but it could drift in the future
- **Suggested fix:** Import `escapeCsvField` from `@/lib/csv/escape-field` and delete the local copy

### AGG-4 — Deploy-worker.sh overwrites remote `.env` without preserving customizations
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Cross-agent agreement:** security-reviewer F2, debugger F2, critic F4
- **Evidence:**
  - `scripts/deploy-worker.sh:102-109`: creates new `.env` locally and uploads via `scp`, replacing any existing `.env`
  - Custom settings like `DOCKER_HOST`, custom `RUST_LOG`, or other worker-specific vars are silently lost
- **Why it matters:** After a worker deploy, the worker may fail to start because it lost a custom `DOCKER_HOST=tcp://docker-proxy:2375` setting
- **Suggested fix:** Preserve remote `.env` entries that are not in the generated file; use `ssh ... 'cat >> .env'` for new entries only, or add `--exclude='.env'` to the scp

### AGG-5 — Deploy-docker.sh should auto-inject COMPILER_RUNNER_URL when INCLUDE_WORKER=false
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Cross-agent agreement:** security-reviewer F3, critic F4
- **Evidence:**
  - `deploy-docker.sh:335-341`: when `INCLUDE_WORKER=false`, the script dies if `COMPILER_RUNNER_URL` is not set in the remote `.env.production`
  - The correct URL (`http://host.docker.internal:3001`) should be auto-injected, similar to how `AUTH_TRUST_HOST` is handled
- **Suggested fix:** Auto-inject `COMPILER_RUNNER_URL=http://host.docker.internal:3001` in the remote `.env.production` when `INCLUDE_WORKER=false`, using the same `ensure_env_secret` pattern

### AGG-6 — PublicHeader lacks authenticated dropdown menu (migration Phase 2)
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Cross-agent agreement:** architect F1, critic F3, designer F1, designer F2, user-injected TODO #1
- **Evidence:**
  - `src/components/layout/public-header.tsx:154-176`: shows only a single "Dashboard" link when logged in
  - The migration plan at `plans/open/2026-04-19-workspace-to-public-migration.md` calls for a "Dashboard" dropdown with role-appropriate links
  - Mobile menu also lacks authenticated navigation items
- **Suggested fix:** Implement Phase 2 of the workspace-to-public migration plan

### AGG-7 — `parsePagination` uses bare `parseInt` instead of `parsePositiveInt`
- **Severity:** LOW
- **Confidence:** HIGH
- **Cross-agent agreement:** code-reviewer F1, debugger F3, verifier F3
- **Evidence:**
  - `src/lib/api/pagination.ts:14-17`: uses `parseInt(...) || 1` and `parseInt(...) || defaultLimit`
  - The `||` fallback does handle NaN correctly today, but the pattern is inconsistent with the project-wide `parsePositiveInt` standard
  - Risk: future refactoring from `|| 1` to `Math.max(1, ...)` would introduce NaN bug
- **Suggested fix:** Refactor to use `parsePositiveInt`

### AGG-8 — Anti-cheat GET route uses bare `parseInt` for `rawOffset` parameter
- **Severity:** LOW
- **Confidence:** HIGH
- **Cross-agent agreement:** code-reviewer F4
- **Evidence:**
  - `src/app/api/v1/contests/[assignmentId]/anti-cheat/route.ts:150`: `parseInt(searchParams.get("offset") ?? "0", 10)`
  - The `Math.max(0, Number.isFinite(rawOffset) ? rawOffset : 0)` guard handles NaN, but inconsistent with project standard
- **Suggested fix:** Use `parsePositiveInt` or create a `parseNonNegativeInt` utility

### AGG-9 — Proxy matcher includes dead `/workspace/:path*` entry
- **Severity:** LOW
- **Confidence:** HIGH
- **Cross-agent agreement:** security-reviewer F5, architect F3, critic F5
- **Evidence:**
  - `src/proxy.ts:311`: matcher includes `/workspace/:path*` which is dead code after Phase 1 migration
- **Suggested fix:** Remove `/workspace/:path*` from the proxy matcher

### AGG-10 — No tests for contest export and group assignment export routes
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Cross-agent agreement:** test-engineer F1, test-engineer F2
- **Evidence:**
  - `src/app/api/v1/contests/[assignmentId]/export/route.ts`: no tests
  - `src/app/api/v1/groups/[id]/assignments/[assignmentId]/export/route.ts`: no tests
  - The unbounded data loading and CSV escape divergence would have been caught by basic tests
- **Suggested fix:** Add API mock tests for both routes

### AGG-11 — Submissions GET route uses dual queries instead of COUNT(*) OVER()
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Cross-agent agreement:** perf-reviewer F2
- **Evidence:**
  - `src/app/api/v1/submissions/route.ts:111-134`: separate `count(*)` query and data query
  - Same pattern that was fixed for rankings (RANK-01) and chat-logs (CHAT-LOG-01)
- **Suggested fix:** Use `COUNT(*) OVER()` window function in a single query

### AGG-12 — 11 API routes still use manual getApiUser pattern instead of createApiHandler
- **Severity:** LOW
- **Confidence:** HIGH
- **Cross-agent agreement:** code-reviewer F5, architect F2, security-reviewer F4
- **Evidence:** 11 routes use `getApiUser` + `csrfForbidden` manually instead of the `createApiHandler` wrapper
- **Suggested fix:** Migrate routes incrementally to `createApiHandler` where feasible

## Verification results from prior-cycle fixes

| Fix | Status |
|---|---|
| Cycle 3 CSV-02: Admin submissions export limit | CONFIRMED FIXED |
| Cycle 3 NAFIX-02: Chat-logs and anti-cheat parsePositiveInt | CONFIRMED FIXED |
| Cycle 3 CHAT-LOG-01: Chat-logs COUNT(*) OVER() | CONFIRMED FIXED |
| Cycle 3 WS-PHASE1: Workspace route group elimination | CONFIRMED FIXED |
| Cycle 3 TEST-01: Submissions export and anti-cheat tests | CONFIRMED FIXED |

## Lower-signal / validation-needed findings

- designer F3: skip-to-content link in PublicHeader — valid accessibility improvement but low priority
- designer F4: mobile menu outside-click dismiss — valid UX improvement but low priority
- perf-reviewer F4: SSE shared poll timer large `inArray` — only matters under extreme load (>500 concurrent SSE connections)
- perf-reviewer F5: Anti-cheat heartbeat gap detection SQL optimization — current approach is adequate for the 5000-row cap
- test-engineer F3: `parsePagination` utility tests — worthwhile but lower priority than export route tests
- test-engineer F4: Deploy-worker.sh tests — good idea but script testing is inherently difficult

## Revalidated non-actions from prior cycles

### CLOSED-01: Password-complexity escalation requests are invalid under repo policy
- `AGENTS.md` explicitly forbids adding complexity requirements

### CLOSED-02: JSON-LD script-escaping is already fixed on current HEAD
- `src/components/seo/json-ld.tsx` uses `safeJsonForScript()`

### CLOSED-03: Shell-command prefix-bypass is already fixed on current HEAD
- `src/lib/compiler/execute.ts` uses `isValidCommandPrefix()`

### CLOSED-04: WorkspaceNav tracking on Korean text is safe
- `tracking-[0.18em]` applies only to English uppercase section label

## Agent failures
- No agent failures this cycle — all 9 reviews completed successfully
