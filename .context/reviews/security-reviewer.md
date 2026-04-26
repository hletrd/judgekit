# Security Reviewer — RPF Cycle 5/100

**Date:** 2026-04-26
**Lens:** OWASP top 10, secrets, unsafe patterns, auth/authz, schema-level data exposure
**Files inventoried:** Same as architect.md, plus `src/app/api/v1/contests/[assignmentId]/anti-cheat/route.ts`, `src/lib/judge/auth.ts`, `src/app/api/v1/judge/{claim,heartbeat}/route.ts`.

---

## SEC5-1: [HIGH, actionable, NEW] Dropping `secret_token` column without confirming all rows migrated to `secret_token_hash` risks judge-worker auth lockout

**Severity:** HIGH (security operations / availability)
**Confidence:** MEDIUM-HIGH

**Evidence:**
- `src/lib/db/schema.pg.ts:418-420` no longer has plaintext `secretToken`; only `secretTokenHash`.
- `src/lib/judge/auth.ts:75-79` already documents the migration concern:
  ```
  // Worker found but has no secretTokenHash — reject and log migration warning
  ...
  "[judge] Worker %s has no secretTokenHash — rejecting auth. Migrate plaintext secretToken to hash."
  ```
- `drizzle/pg/0020_drop_judge_workers_secret_token.sql` drops the plaintext column unconditionally.
- There is no migration script that backfills `secret_token_hash` from `secret_token` BEFORE the drop.

**Why it's a problem:** When the destructive migration finally executes (post-fix to ARCH5-1), every judge worker whose plaintext token was never migrated to a hash will be permanently locked out. The auth code (line 75-79) gracefully rejects them, but their secrets are gone, requiring manual re-registration of every affected worker.

**Failure scenario:** Operator runs deploy with `--force` (after fixing ARCH5-1's snapshot drift) → migration applies → DB drops `secret_token` → workers that hadn't been touched since the schema-0014 era can't authenticate → judge fleet partially offline → exam in progress fails to grade submissions.

**Fix:** BEFORE the destructive drop, run a one-shot backfill:
```sql
-- Verify the hashing scheme matches src/lib/security/tokens.ts hashToken()
UPDATE judge_workers
SET secret_token_hash = encode(sha256(secret_token::bytea), 'hex')
WHERE secret_token_hash IS NULL AND secret_token IS NOT NULL;
```
Then verify zero rows have `secret_token IS NOT NULL AND secret_token_hash IS NULL`. Then run the drop.

**Exit criteria:**
- A pre-drop migration backfills hashes from plaintext.
- A verification query asserts zero rows would be orphaned.
- The drop migration runs only after the verification passes.

---

## SEC5-2: [LOW, actionable, NEW] `clearAuthSessionCookies` lacks dedicated test coverage asserting BOTH cookie names are cleared in one response

**Severity:** LOW
**Confidence:** HIGH

**Evidence:** `src/proxy.ts:87-97`. Cycles 1-2 added the dual-clear. Tests in `tests/unit/proxy*` exist; `grep -rn "clearAuthSessionCookies" tests/` returns hits, but none specifically assert that BOTH cookie names are cleared in a single response.

**Fix:** Add a unit test that calls `clearAuthSessionCookies(NextResponse.next())` and asserts both `authjs.session-token` and `__Secure-authjs.session-token` are present in the response with `maxAge: 0`.

**Exit criteria:** New unit test asserts both cookie names are cleared.

---

## SEC5-3: [LOW, deferred-carry] AGENTS.md vs `password.ts` mismatch (carried from cycles 3-4)

**Severity:** MEDIUM
**Confidence:** HIGH
**Reason for deferral:** Per cycle 3-4 plan, requires user/PM decision (which behavior is canonical). Repo rules don't forbid deferring docs/code mismatches. Exit criterion: User/PM declares which is canonical.

---

## SEC5-4: [LOW, deferred] `__Secure-` cookie clear over HTTP no-op (carried from cycle 3 SEC3-1)

Production is HTTPS-only; this is a dev-only nuisance.

---

## SEC5-5: [LOW, NEW] `__test_internals` runtime gate is defense-in-depth but cycle-4 type-cast undermines fail-fast clarity

**Severity:** LOW
**Confidence:** MEDIUM

**Evidence:** `src/app/api/v1/contests/[assignmentId]/analytics/route.ts:101-118`. The double-cast `undefined as unknown as <type>` (see ARCH5-2) means a SSRF/RCE chain that lets an attacker `import("@/.../route")` and call `__test_internals.cacheClear()` would crash the route module instead of clearing the cache. Net-positive for security, but the type system silently agrees with the call site, so a future maintainer who deletes the runtime gate without realizing the fail-fast contract loses the protection silently.

**Fix:** ARCH5-2's recommendation (mark the type as `... | undefined`) makes the runtime gate the type-level contract too.

---

## Final Sweep

- No new HIGH-severity security regression in the recently-touched code itself.
- The HIGH-severity finding (SEC5-1) is a deploy-time concern triggered by ARCH5-1's drift, but the data-loss risk to judge worker auth credentials is independently severe and per the deferred-fix rules ("Security, correctness, and data-loss findings are NOT deferrable") MUST be planned-and-fixed alongside ARCH5-1 in this cycle.
- All gates green: lint 0 errors, test:unit 2232 pass, build EXIT=0.
