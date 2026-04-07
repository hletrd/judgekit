# Comprehensive Code Review -- JudgeKit

**Date:** 2026-04-07
**Scope:** Full repository review (300+ files across TypeScript/Next.js app, 3 Rust microservices, Docker infrastructure, CI/CD, tests, and documentation)
**Reviewers:** 4 parallel specialized review agents (security, core logic, API/frontend, infrastructure/tests)

---

## Executive Summary

JudgeKit is a well-architected online judge platform with strong security fundamentals (Argon2id password hashing, parameterized queries, Docker sandboxing, CSRF protection, audit logging). However, this review identified **47 unique findings** across the codebase, including race conditions in critical authentication flows, data corruption risks in the import/export pipeline, CSRF bypasses, and deployment security weaknesses.

| Severity | Count |
|----------|-------|
| Critical | 8 |
| High     | 14 |
| Medium   | 17 |
| Low      | 8 |

---

## CRITICAL Findings

---

### C-01: Race condition in recruiting token redemption creates duplicate users

**File:** `src/lib/assignments/recruiting-invitations.ts:178-275`
**Category:** Race Condition / Data Integrity
**Confidence:** High

The `redeemRecruitingToken` function reads the invitation outside the transaction (line 178), performs validation (lines 179-220), then enters a transaction to create the user and update the invitation status with `WHERE status = 'pending'` (line 272). The UPDATE result is never checked. If two concurrent requests arrive with the same token, both read `status = 'pending'`, both create separate user accounts, enrollments, and contest access tokens, and one UPDATE silently matches zero rows.

**Failure scenario:** Two HTTP requests with the same recruiting token arrive simultaneously. Both create separate user accounts for the same candidate. The candidate ends up with two accounts and two contest access tokens.

**Fix:** Move the invitation lookup inside the transaction with `SELECT ... FOR UPDATE`, or check the UPDATE result and roll back if zero rows affected:
```typescript
const [updated] = await tx
  .update(recruitingInvitations)
  .set({ status: "redeemed", userId: uid, ... })
  .where(and(
    eq(recruitingInvitations.id, invitation.id),
    eq(recruitingInvitations.status, "pending"),
    sql`(${recruitingInvitations.expiresAt} IS NULL OR ${recruitingInvitations.expiresAt} > NOW())`
  ))
  .returning({ id: recruitingInvitations.id });
if (!updated) throw new Error("alreadyRedeemed");
```

---

### C-02: Recruiting token validation endpoint has no authentication or rate limiting

**File:** `src/app/api/v1/recruiting/validate/route.ts:6-66`
**Category:** Broken Access Control / Authentication Bypass
**Confidence:** High

The `/api/v1/recruiting/validate` POST endpoint accepts any `token` string and returns rich metadata (candidate name, assignment title, exam duration, expiry date) with no authentication, no rate limiting, and no CSRF protection. Since tokens are the sole authentication factor for recruiting logins (`config.ts:138`), an attacker can brute-force tokens to discover valid ones and authenticate as any candidate.

**Failure scenario:** An attacker scripts unlimited POST requests to enumerate valid recruiting tokens, then uses discovered tokens to log in as candidates.

**Fix:** Add rate limiting (10 attempts/minute per IP) and minimize returned metadata for unauthenticated callers. Consider adding a CAPTCHA or proof-of-work challenge.

---

### C-03: Database import `SET CONSTRAINTS ALL DEFERRED` runs outside a transaction (no effect)

**File:** `src/lib/db/import.ts:143-215`
**Category:** Data Integrity / Logic Bug
**Confidence:** High

`importDatabase` calls `disableForeignKeys()` which executes `SET CONSTRAINTS ALL DEFERRED` via `pool.query()`. PostgreSQL's `SET CONSTRAINTS ... DEFERRED` only has effect within a transaction block. The import operations (truncate and insert) execute as separate auto-committed statements through Drizzle ORM, so the deferral has no effect and FK violations fail immediately.

**Failure scenario:** Importing a database backup where child rows reference parent rows that haven't been inserted yet fails with FK constraint violations.

**Fix:** Wrap the entire import in a single transaction:
```typescript
await db.transaction(async (tx) => {
  await tx.execute(sql`SET CONSTRAINTS ALL DEFERRED`);
  // truncate and insert using tx
});
```

---

### C-04: Database import iterates TABLE_MAP instead of FK-ordered TABLE_ORDER

**File:** `src/lib/db/import.ts:160`
**Category:** Data Integrity / Logic Bug
**Confidence:** High

Line 160 iterates table names from `TABLE_MAP` using `Object.entries()`. The import depends on FK-dependency order (parents before children), but the correct ordered source is `TABLE_ORDER` from `export.ts`. While V8 preserves insertion order for string keys, this is fragile -- any reordering of `TABLE_MAP` entries breaks the import.

**Failure scenario:** A developer or IDE auto-sorts `TABLE_MAP` entries. Children are inserted before parents, causing FK violations during import.

**Fix:** Use the ordered list: `for (const tableName of getTableOrder()) { ... }`

---

### C-05: Chat widget endpoint bypasses CSRF protection

**File:** `src/app/api/v1/plugins/chat-widget/chat/route.ts:101-103`
**Category:** CSRF / Broken Access Control
**Confidence:** High

The chat endpoint sets `auth: false` on `createApiHandler`, which disables the handler's built-in CSRF check. The handler manually calls `auth()` for session validation, but the `X-Requested-With` header is never verified. A malicious website can forge a POST using the victim's session cookie, causing the AI to execute tool calls (reading problem descriptions, submission source code, assignment data) on behalf of the victim.

**Failure scenario:** A student visits a malicious website during a contest. The site sends a forged POST to the chat endpoint, exfiltrating the student's submission history and problem content.

**Fix:** Add explicit CSRF check inside the handler, or use `auth: true` so CSRF is automatically enforced.

---

### C-06: Non-atomic score override upsert -- race condition corrupts scoring data

**File:** `src/app/api/v1/groups/[id]/assignments/[assignmentId]/overrides/route.ts:117-135`
**Category:** Race Condition / Data Consistency
**Confidence:** High

The POST handler performs a DELETE then INSERT to upsert a score override without a transaction. Concurrent requests for the same (assignment, problem, user) can interleave, creating duplicate override rows or losing one override in favor of another.

**Failure scenario:** Two instructors simultaneously set different score overrides for the same student/problem. The result is either duplicate rows or one instructor's override silently lost.

**Fix:** Wrap in `db.transaction()` or use `ON CONFLICT DO UPDATE` if the schema has a unique constraint.

---

### C-07: Deploy scripts expose SSH password in process table and disable host key verification

**Files:** `deploy-docker.sh` (SSH_OPTS, `echo | sudo -S`), `deploy.sh:25`
**Category:** Credential Exposure / MITM
**Confidence:** High

Two deployment security issues:
1. `echo '${SSH_PASSWORD}' | sudo -S` makes the password visible in `ps aux` to all users on both machines
2. `StrictHostKeyChecking=no` and `UserKnownHostsFile=/dev/null` disable SSH host key verification, enabling MITM attacks

**Failure scenario:** An attacker on the deployment network captures the SSH password from the process table, or performs ARP spoofing to intercept the deployment connection, capturing secrets from `.env.production`.

**Fix:**
- Use `sudo -S <<< "${SSH_PASSWORD}"` or passwordless sudo for deploy accounts
- Replace `StrictHostKeyChecking=no` with `StrictHostKeyChecking=accept-new` and pre-populate `known_hosts`

---

### C-08: TypeScript build errors silently suppressed in production

**File:** `next.config.ts:14`
**Category:** Build Safety
**Confidence:** High

`typescript: { ignoreBuildErrors: true }` allows the production build to succeed with type errors. The remediation roadmap (`docs/remediation-roadmap.md` issue #6) already identifies this as P0/Critical.

**Failure scenario:** A type error causing a runtime null dereference passes the build and crashes in production during an exam.

**Fix:** Fix all TypeScript errors and remove `ignoreBuildErrors: true`. Make `tsc --noEmit` a required CI gate.

---

## HIGH Findings

---

### H-01: Rate limiter client fails open -- all rate limits bypassed if service is down

**File:** `src/lib/security/rate-limiter-client.ts:24-27`
**Category:** Security Misconfiguration
**Confidence:** High

`callRateLimiter` catches all errors and returns `null`, which callers interpret as "allowed." If the rate limiter sidecar is unreachable, every request is allowed through -- login brute-force protection, API rate limiting, and submission throttling are all bypassed.

**Fix:** Implement a circuit-breaker pattern. After N consecutive failures, fall back to in-memory rate limiting rather than failing completely open.

---

### H-02: Chat widget test-connection endpoint is a partial SSRF proxy

**File:** `src/app/api/v1/plugins/chat-widget/test-connection/route.ts:65`
**Category:** SSRF
**Confidence:** High

The `model` parameter for Gemini is interpolated directly into a URL without validation: `` `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent` ``. A crafted `model` value with path traversal characters could redirect the request to unintended API endpoints, and the user-supplied API key is sent to the constructed URL.

**Fix:** Validate model against `^[a-zA-Z0-9._-]+$` before interpolation.

---

### H-03: `latestSubmittedAt` treated as unix-seconds but PostgreSQL returns Date/ISO string

**File:** `src/lib/assignments/submissions.ts:430,644-646,665-667`
**Category:** Logic Bug
**Confidence:** High

The `ProblemAggRow` type declares `latestSubmittedAt` as `number | null` with a stale comment about "SQLite integer." The code does `new Date(agg.latestSubmittedAt * 1000)`, but PostgreSQL returns Date objects or ISO strings from the `pg` driver. This produces `NaN` or wildly incorrect timestamps.

**Failure scenario:** "Latest submitted at" timestamps display as "Invalid Date" on the assignment status page.

**Fix:** Remove the `* 1000` multiplication; use `new Date(agg.latestSubmittedAt)` and update the type.

---

### H-04: `getDatabaseSummary` fetches ALL rows from every table to count them

**File:** `src/lib/db/import.ts:229-240`
**Category:** Performance / DoS
**Confidence:** High

```typescript
const rows = await db.select().from(table);
summary[name] = rows.length;
```

Loads entire table contents into memory just to count rows. A submissions table with millions of rows will exhaust memory.

**Fix:** Use `COUNT(*)`: `db.select({ count: sql<number>`count(*)` }).from(table)`

---

### H-05: Code similarity delete-then-insert is not atomic

**File:** `src/lib/assignments/code-similarity.ts:226-258`
**Category:** Race Condition / Data Loss
**Confidence:** Medium

`runAndStoreSimilarityCheck` deletes all existing similarity events, then inserts new ones, without a transaction. Concurrent invocations can interleave, causing duplicate entries or data loss.

**Fix:** Wrap delete + insert in `db.transaction()`.

---

### H-06: `canManageGroupResources` grants access to non-instructor roles

**File:** `src/lib/assignments/management.ts:25-34`
**Category:** Authorization Bypass
**Confidence:** Medium

Line 33 checks `groupInstructorId === userId` without any role restriction. If `groups.instructorId` is ever set to a student's userId (via data import, migration bug, or direct DB edit), that student gains full group management access.

**Fix:** Remove the redundant line 33 or restrict it to instructor-level roles.

---

### H-07: Analytics cache is not user-scoped -- potential cross-user information leak

**File:** `src/app/api/v1/contests/[assignmentId]/analytics/route.ts:9,40-41`
**Category:** Information Disclosure
**Confidence:** High

The LRU cache key is just `assignmentId` with no user/role context. If analytics data ever becomes role-dependent (e.g., anonymized vs. non-anonymized), different role users would see cached data from another role.

**Fix:** Include user role in the cache key or document the role-independence invariant.

---

### H-08: ILIKE search in recruiting invitations does not escape wildcards

**File:** `src/lib/assignments/recruiting-invitations.ts:78-80`
**Category:** Input Validation / SQL Correctness
**Confidence:** High

The search constructs `%${filters.search}%` without escaping `%` or `_` LIKE wildcards. Searching for `%` matches all records. Other endpoints (e.g., invite route) properly escape this.

**Fix:** Escape wildcards: `filters.search.replace(/[%_\\]/g, '\\$&')`

---

### H-09: Database import JSON body has no size limit

**File:** `src/app/api/v1/admin/migrate/import/route.ts:37-38`
**Category:** DoS
**Confidence:** High

The multipart path has a 500MB limit check, but the JSON path calls `request.json()` with no size limit. A compromised admin account could send an arbitrarily large JSON body, exhausting server memory.

**Fix:** Read as text first with a size limit before parsing.

---

### H-10: One-off migration endpoint still deployed in production

**File:** `src/app/api/v1/admin/migrate-difficulty/route.ts:10-14`
**Category:** Operational Risk
**Confidence:** High

The file contains the comment `DELETE this route after running it once.` It performs destructive operations (deleting problems, renaming tags) and any admin can re-trigger it.

**Fix:** Delete the entire file.

---

### H-11: PostgreSQL data volume mounted at wrong path

**File:** `docker-compose.production.yml:40`
**Category:** Data Integrity
**Confidence:** High

The volume is mounted at `/var/lib/postgresql` but PostgreSQL stores data at `/var/lib/postgresql/data`. The mount captures transient runtime files, which can cause issues during major version upgrades.

**Fix:** Mount at `/var/lib/postgresql/data`.

---

### H-12: Judge worker Dockerfile masks binary verification errors

**File:** `Dockerfile.judge-worker`
**Category:** Build Safety
**Confidence:** High

`./judge-worker --help 2>/dev/null || true` means the build succeeds even if the binary is broken.

**Fix:** Remove `|| true` and `2>/dev/null`.

---

### H-13: Worker heartbeat interval ignores server-provided value

**File:** `judge-worker-rs/src/main.rs:249`
**Category:** Configuration Bug
**Confidence:** Medium

The registration response includes `heartbeat_interval_ms`, but the heartbeat loop always sleeps for 30 seconds. If the server operator changes the interval, workers ignore it and may be incorrectly marked stale.

**Fix:** Use `Duration::from_millis(resp.data.heartbeat_interval_ms)`.

---

### H-14: Nginx heredoc in deploy.sh has shell variable expansion issues

**File:** `deploy.sh:149-168`
**Category:** Configuration Bug
**Confidence:** High

Unquoted heredoc delimiters cause `$host`, `$request_uri` and other nginx variables to be interpreted as (empty) shell variables, producing broken nginx configuration.

**Fix:** Quote the heredoc delimiter: `<< 'NGINX_EOF'`

---

## MEDIUM Findings

---

### M-01: In-memory rate limiter not shared across Node.js workers

**File:** `src/lib/security/in-memory-rate-limit.ts:15`
**Category:** Security Misconfiguration
**Confidence:** Medium

The `store` is a module-level `Map` (per-process). In multi-worker deployments, an attacker can rotate across workers, multiplying their effective rate limit.

**Fix:** Use the PostgreSQL-backed rate limiter for security-critical paths. Document the single-instance limitation.

---

### M-02: `X-Forwarded-For` IP spoofing risk with misconfigured TRUSTED_PROXY_HOPS

**File:** `src/lib/security/ip.ts:8-10`
**Category:** Security Misconfiguration
**Confidence:** Medium

Default `TRUSTED_PROXY_HOPS=1`. If no proxy exists or the value is wrong, an attacker can inject a fake IP to evade per-IP rate limits.

**Fix:** Add validation logging and document correct configuration.

---

### M-03: Recruiting token prefix logged in login events

**File:** `src/lib/auth/recruiting-token.ts:62`
**Category:** Information Disclosure
**Confidence:** Medium

The first 8 characters of recruiting tokens are logged in `attemptedIdentifier`. Since tokens are single-factor auth, partial exposure narrows brute-force space.

**Fix:** Log a hash prefix instead: `createHash("sha256").update(token).digest("hex").slice(0, 8)`

---

### M-04: `ensureBuiltinRoles` has TOCTOU race -- check-then-insert without transaction

**File:** `src/lib/capabilities/ensure-builtin-roles.ts:16-37`
**Category:** Race Condition
**Confidence:** Medium

Two server instances starting simultaneously could both try to insert the same role, causing a unique constraint violation.

**Fix:** Use `INSERT ... ON CONFLICT DO NOTHING`.

---

### M-05: `cleanupOldEvents` loads all deleted row IDs into memory via `.returning()`

**File:** `src/lib/db/cleanup.ts:13-21`
**Category:** Performance
**Confidence:** High

Only the count is used (`auditResult.length`), but `.returning()` loads all deleted row IDs into memory. For systems with months of audit events, this can OOM.

**Fix:** Use raw SQL `DELETE` and check the command tag for affected row count.

---

### M-06: Score override not validated against problem point limits

**File:** `src/lib/assignments/submissions.ts:627-631`
**Category:** Data Consistency
**Confidence:** Medium

An instructor can set `overrideScore = 500` on a 100-point problem, inflating total scores and corrupting the leaderboard.

**Fix:** Clamp to `[0, problem.points]` at insertion time.

---

### M-07: `attemptCount` from raw SQL is a string, not a number

**File:** `src/lib/assignments/contest-scoring.ts:157`
**Category:** Type Mismatch
**Confidence:** Medium

PostgreSQL `COUNT(*)` returns a `bigint` (string in the `pg` driver). The `RawLeaderboardRow` type declares `attemptCount` as `number`. Comparisons like `=== 5` would fail; `> 3` works via coercion but is fragile.

**Fix:** Cast in SQL: `COUNT(*)::int`, or use `Number()` when reading aggregate values.

---

### M-08: Export TABLE_ORDER missing `groupInstructors` and `recruitingInvitations`

**File:** `src/lib/db/export.ts:32-72`
**Category:** Data Loss
**Confidence:** High

A full database export/import silently loses all co-instructor assignments and recruiting invitation records because these tables are not in `TABLE_ORDER`.

**Fix:** Add both tables to `TABLE_ORDER` in the correct FK-dependency position.

---

### M-09: Quick-create contest does not validate `startsAt < deadline`

**File:** `src/app/api/v1/contests/quick-create/route.ts:29-32`
**Category:** Input Validation
**Confidence:** High

A caller can create a contest where the deadline is before the start time.

**Fix:** Add validation: `if (startsAt >= deadline) return apiError("deadlineMustBeAfterStart", 400);`

---

### M-10: Group members GET endpoint returns all members without pagination

**File:** `src/app/api/v1/groups/[id]/members/route.ts`
**Category:** Performance / DoS
**Confidence:** High

No pagination or limit on the group members list. Groups with thousands of members produce unbounded response sizes.

**Fix:** Add offset/limit pagination.

---

### M-11: `sanitizeMarkdown` only strips control characters -- defense-in-depth gap

**File:** `src/lib/security/sanitize-html.ts:77-81`
**Category:** XSS Risk
**Confidence:** Medium

`sanitizeMarkdown()` only strips control characters. Safety depends entirely on render-time sanitization (`sanitizeHtml()` at display time or `react-markdown` with `skipHtml`). A future rendering path (email, PDF, API response) that uses stored descriptions directly would be vulnerable.

**Fix:** Add a `@security` JSDoc tag documenting the invariant, or apply DOMPurify at storage time as defense-in-depth.

---

### M-12: Test database ports bound to 0.0.0.0

**File:** `docker-compose.test-backends.yml:90,120`
**Category:** Network Exposure
**Confidence:** High

PostgreSQL and MySQL test ports are exposed on all network interfaces with weak default credentials.

**Fix:** Bind to `127.0.0.1:5432:5432`.

---

### M-13: Docker socket proxy grants BUILD permission in production

**File:** `docker-compose.production.yml:63`
**Category:** Container Security
**Confidence:** Medium

`BUILD=1` allows the app container to issue `docker build` with arbitrary build contexts, potentially exfiltrating host files if compromised.

**Fix:** Evaluate whether build can be restricted to CI/CD only.

---

### M-14: Rate limiter DashMap has no upper bound on entries

**File:** `rate-limiter-rs/src/main.rs`
**Category:** Resource Exhaustion
**Confidence:** Medium

Between 60-second evictions, there is no cap on entries. A flood of unique keys can exhaust memory.

**Fix:** Add a maximum entry count or use an LRU cache.

---

### M-15: Worker cleanup only runs during idle -- never under sustained load

**File:** `judge-worker-rs/src/main.rs:397-401`
**Category:** Logic Bug
**Confidence:** Medium

The `cleanup_counter` increments only in the idle branch. Under heavy load, orphaned container cleanup never runs.

**Fix:** Use a time-based trigger instead of a counter.

---

### M-16: SSE connection tracking and anti-cheat heartbeat dedup are process-local

**Files:** `src/app/api/v1/submissions/[id]/events/route.ts`, `src/app/api/v1/contests/[assignmentId]/anti-cheat/route.ts`
**Category:** Scalability
**Confidence:** Medium

In-memory data structures for SSE and heartbeat dedup don't work across multiple instances.

**Fix:** Use Redis pub/sub or database-level dedup for multi-instance deployments.

---

### M-17: `group_instructors` migration does not backfill from `groups.instructor_id`

**File:** `drizzle/pg/0005_powerful_surge.sql`
**Category:** Data Integrity / Migration
**Confidence:** Medium

Migration 0005 creates the `group_instructors` table but does not copy existing `groups.instructor_id` values. Existing groups lose their instructor assignments in features that read from the new table.

**Fix:** Add a backfill step to the migration.

---

## LOW Findings

---

### L-01: Database URL partially exposed in admin settings page

**File:** `src/app/(dashboard)/dashboard/admin/settings/page.tsx:90-91`
**Confidence:** Medium

The regex masks only the password. Username, host, port, and database name are visible to admins.

---

### L-02: Stale SQLite comments in PostgreSQL-only codebase

**File:** `src/lib/assignments/submissions.ts:419-421`
**Confidence:** High

Comments reference "SQLite integer" in a codebase that has been fully migrated to PostgreSQL.

---

### L-03: `groupInstructors` table has no relation definition in Drizzle

**File:** `src/lib/db/relations.pg.ts`
**Confidence:** High

The table exists in the schema but cannot be traversed via Drizzle's relational query API.

---

### L-04: `recruiting_invitations.created_by` uses ON DELETE no action

**File:** `drizzle/pg/0006_secret_abomination.sql:21`
**Confidence:** Medium

Deleting a user who created invitations fails with a FK error, unlike other creator references which use `ON DELETE set null`.

---

### L-05: Console.log used instead of structured logger in production code

**Files:** `src/lib/judge/sync-language-configs.ts:63,66`, `src/lib/db/migrate.ts:4,6`
**Confidence:** High

---

### L-06: Worker profile in production compose requires undocumented `--profile worker` flag

**File:** `docker-compose.production.yml:103`, `docs/deployment.md:69-72`
**Confidence:** Medium

Deployment docs say the default compose includes both app and worker, but the worker requires `--profile worker`.

---

### L-07: Dead-letter queue stores submission source code unencrypted on disk

**File:** `judge-worker-rs/src/executor.rs`
**Confidence:** Medium

Failed result reports write full submission data including source code as plaintext JSON files.

---

### L-08: CI workflow runs unit tests twice (with and without coverage)

**File:** `.github/workflows/ci.yml:56,60`
**Confidence:** High

Doubles CI time for no additional value. Keep only the coverage run.

---

## Positive Observations

The codebase demonstrates strong engineering practices in several areas:

1. **Security fundamentals:** Argon2id password hashing with OWASP parameters, AES-256-GCM for plugin secrets, timing-safe token comparison, parameterized queries throughout, DOMPurify with strict allowlists.

2. **Docker sandboxing:** Multi-layered isolation (`--network none`, `--read-only`, `--cap-drop=ALL`, `--no-new-privileges`, seccomp profiles, tmpfs mounts, PID limits, memory limits). Docker socket proxy narrows container escape blast radius.

3. **Audit logging:** Nearly every mutation records an audit event with actor, action, and context. Deletion audits are recorded before the actual delete to avoid FK cascade issues.

4. **Comprehensive validation:** Zod validators on all POST/PATCH endpoints with cross-field validation, duplicate detection, and proper preprocessing.

5. **Contest scoring cache:** Stale-while-revalidate caching with single-flight refresh prevention is a well-designed performance optimization.

6. **Formula injection prevention:** CSV exports sanitize cell values against Excel formula injection -- a commonly missed vulnerability.

7. **Capability system:** Well-structured role-based capability system with built-in role defaults, cached resolution with TTL, and `super_admin` safety hardcoding.

8. **Transactional contest creation:** The quick-create route wraps group + assignment + problem insertion in a single transaction.

9. **SecretString type in Rust:** The `SecretString` wrapper with `[REDACTED]` Debug output prevents accidental secret leakage in logs.

10. **Comprehensive test coverage:** Unit tests cover OWASP XSS evasion vectors, CSRF validation scenarios, and schema parity. E2E tests cover full contest lifecycle in 36 steps.

---

## Test Gap Analysis

The following areas have insufficient or missing test coverage:

| Area | Gap |
|------|-----|
| Recruiting token redemption | No concurrency/race condition tests |
| Database import/export | No integration test for full round-trip import/export |
| Score override API | No concurrent upsert test |
| Contest scoring edge cases | No test for zero-solved-problems tiebreaker |
| `latestSubmittedAt` parsing | No test verifying Date handling from PostgreSQL |
| `sanitizeMarkdown` | No test verifying it is always paired with safe rendering |
| Multi-instance behavior | No test for in-memory rate limiter across workers |
| Code similarity normalization | No test for escaped quotes or `//` inside strings |

---

## Recommendations by Priority

### Immediate (before next deployment)
1. Fix recruiting token race condition (C-01)
2. Add rate limiting to recruiting validate endpoint (C-02)
3. Fix score override atomicity (C-06)
4. Add CSRF check to chat widget endpoint (C-05)
5. Delete the migrate-difficulty route (H-10)
6. Fix nginx heredoc shell expansion (H-14)

### Short-term (within 1-2 sprints)
7. Wrap database import in a transaction and fix table ordering (C-03, C-04)
8. Fix deployment credential exposure (C-07)
9. Remove `ignoreBuildErrors: true` (C-08)
10. Fix `latestSubmittedAt` timestamp handling (H-03)
11. Replace `getDatabaseSummary` full-table fetch with COUNT (H-04)
12. Implement rate limiter circuit-breaker (H-01)
13. Validate Gemini model parameter (H-02)
14. Fix PostgreSQL volume mount path (H-11)

### Medium-term (within 1-2 months)
15. Add missing tables to export TABLE_ORDER (M-08)
16. Add pagination to group members endpoint (M-10)
17. Validate score overrides against point limits (M-06)
18. Use server-provided heartbeat interval (H-13)
19. Backfill `group_instructors` from migration (M-17)
20. Add DashMap size cap to rate limiter (M-14)
21. Fix worker cleanup timing (M-15)

---

## Files Reviewed

This review covered 300+ files across the entire repository. Below is the list of primary categories examined:

- **Security core:** 13 files in `src/lib/security/`
- **Authentication:** 11 files in `src/lib/auth/`
- **API framework:** 5 files in `src/lib/api/`
- **API routes:** 60+ route handlers in `src/app/api/`
- **Database:** 12 files in `src/lib/db/`, 13 migration SQL files
- **Business logic:** 12 files in `src/lib/assignments/`, plus scoring, problem management, capabilities
- **Frontend:** 30+ page and component files
- **Rust services:** 12 files across `rate-limiter-rs/`, `judge-worker-rs/`, `code-similarity-rs/`
- **Infrastructure:** Dockerfiles, compose files, deploy scripts, CI/CD workflows, nginx configs, systemd services
- **Tests:** 50+ unit tests, 10+ component tests, 25+ E2E specs
- **Documentation:** 12 docs files

### Final Sweep Confirmation

A final sweep was performed to verify:
- [x] All API routes reviewed (60+ endpoints)
- [x] All security-critical files reviewed (auth, CSRF, rate limiting, sanitization)
- [x] All database operations checked for transaction safety
- [x] All Rust microservices reviewed
- [x] Deployment pipeline and infrastructure reviewed
- [x] Cross-file interactions analyzed (auth flow, scoring pipeline, import/export)
- [x] No relevant file categories were skipped
