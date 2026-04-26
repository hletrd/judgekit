# Debugger — RPF Cycle 6/100

**Date:** 2026-04-26
**Cycle:** 6/100
**Lens:** latent bug surface, failure modes, regressions, defensive code review

---

**Cycle-5 carry-over verification:**
- DBG5-1 (`_refreshingKeys` cleanup): VERIFIED resolved at `route.ts:79-99`.
- DBG5-2 (`formatEventTime` ms-vs-seconds): UNCHANGED — carried deferred.
- DBG5-3 (Distinct-event-type burst): UNCHANGED — carried deferred.

---

## DBG6-1: [LOW, NEW] `0020_drop_judge_workers_secret_token.sql` backfill DO-block uses `encode(sha256(secret_token::bytea), 'hex')` — assumes column type is text

**Severity:** LOW (latent — only surfaces if column type ever changed)
**Confidence:** HIGH

**Evidence:**
- `drizzle/pg/0020_drop_judge_workers_secret_token.sql`:
  ```sql
  UPDATE judge_workers
  SET secret_token_hash = encode(sha256(secret_token::bytea), 'hex')
  WHERE secret_token_hash IS NULL AND secret_token IS NOT NULL
  ```
- The `::bytea` cast assumes `secret_token` is text. Pre-cycle-5 schema (per the cycle-5 architect review) had `secret_token` as `text`. Cycle 5's `0020_snapshot.json` removed it entirely.

**Why it's a problem:** The cast `secret_token::bytea` interprets the text as the BYTES of its UTF-8 encoding. This is correct ONLY IF the original token was ASCII. If any token contained non-ASCII bytes, the hash will not match what `hashToken()` in `src/lib/judge/auth.ts:21-23` produces:
```ts
return createHash("sha256").update(token).digest("hex");
```
Node's `createHash().update(token)` treats `token` as a string and encodes it to UTF-8 bytes by default. PostgreSQL's `text::bytea` cast also produces UTF-8 bytes. So they MATCH for any text — the cast is correct.

**Why it's STILL worth recording:** The SQL works correctly today, but the dependency is implicit. A future contributor who changes either side (e.g., swapping `createHash().update(token, 'binary')` in Node, or swapping the SQL to `decode(secret_token, 'base64')`) without updating the other side will silently break worker auth. Add a brief comment in BOTH places cross-referencing the byte-encoding assumption.

**Fix:** Add an inline comment in `src/lib/judge/auth.ts` near `hashToken()` and another in the SQL DO-block: "// SHA-256 of the UTF-8 byte sequence of the raw token. Both Node (createHash().update(string)) and Postgres (text::bytea) produce identical UTF-8 bytes; do not change one without changing the other."

**Exit criteria:** Cross-references exist in both places. Gates green.

---

## DBG6-2: [LOW, NEW] `deploy-docker.sh:596` data-loss detection runs ONCE on a single capture; partial output (e.g., interrupted command) won't trigger the warn

**Severity:** LOW (edge-case; likely rare)
**Confidence:** MEDIUM

**Evidence:**
- `deploy-docker.sh:581-591`:
  ```sh
  PUSH_OUT=$(remote "PG_PASS=... && export ... && \
      docker run --rm \
        --network ${NETWORK_NAME} \
        ...
        sh -c '... npx drizzle-kit push${PUSH_FORCE_FLAG}'" 2>&1) || \
    { printf '%s\n' "$PUSH_OUT"; die "drizzle-kit push failed — aborting deploy"; }
  ```
- If the remote SSH connection drops mid-command, `PUSH_OUT` may contain a partial output that doesn't include the data-loss prompt markers, even though the underlying drizzle-kit run was about to print them.
- The `|| { die ... }` branch fires when SSH exits non-zero. But drizzle-kit can exit 0 with a truncated transcript if the remote shell wraps it differently.

**Why it's a problem:** A partial transcript that does NOT contain "data loss"/"are you sure"/"warning:.*destructive" but ALSO does not contain a confirmation message will fall through to `success "Database migrated"` even though the migration may not have completed.

**Fix:** Add a positive confirmation check: scan PUSH_OUT for `"changes applied"` or `"no changes detected"` (drizzle-kit's typical success markers). If neither is present, downgrade success to a different warn ("drizzle-kit output was inconclusive — verify manually").

**Exit criteria:** A truncated PUSH_OUT does not produce a misleading green "[OK] Database migrated". Gates green.

---

## DBG6-3: [LOW, NEW] `analyticsCache.dispose` callback assumes synchronous `_lastRefreshFailureAt.delete` is safe under concurrent access

**Severity:** LOW (Node single-threaded execution mitigates)
**Confidence:** HIGH

**Evidence:**
- `route.ts:34-47` registers `dispose: (_value, key) => { _lastRefreshFailureAt.delete(key); }`.
- Node's event loop is single-threaded for JS code, so this is safe today.
- BUT: if any future code adds an async operation inside the dispose callback, OR if the `dispose` is called inside a microtask that races with `_lastRefreshFailureAt.set` in the catch block, ordering becomes non-obvious.

**Why it's a problem (latent only):** The current code is correct. A future refactor that makes dispose async, or that uses `WeakMap` instead of `Map`, will need to revisit this assumption.

**Fix:** Add a one-line comment near the dispose callback noting "synchronous-only — do not await inside dispose; _lastRefreshFailureAt is also a synchronous Map. If this changes, audit the catch path at route.ts:95."

**Exit criteria:** Comment exists. Gates green.

---

## Final Sweep — Latent Bugs

- `route.ts` cooldown / dispose / refresh interactions are correct after cycle 5; the remaining concerns are documentation / future-proofing.
- `anti-cheat-monitor.tsx` retry timer cleanup is sound (verified via cycle-5 cleanup function at line 265-268).
- `anti-cheat-storage.ts` slice-cap (`MAX_PENDING_EVENTS = 200`) keeps incoming arrays bounded.
- `proxy.ts` cookie-clearing is now under test (see security-reviewer.md).

**No agent failures.**
