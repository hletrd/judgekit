# Critic Review — RPF Cycle 40

**Date:** 2026-04-23
**Reviewer:** critic
**Base commit:** f030233a

## Multi-Perspective Critique

This review examines the change surface from multiple angles: correctness, security, maintainability, UX, and operational safety.

### CRI-1: Assignment PATCH uses `Date.now()` for active-contest check — clock-skew bypass [MEDIUM/MEDIUM]

**File:** `src/app/api/v1/groups/[id]/assignments/[assignmentId]/route.ts:99-101`

**Description:** The assignment PATCH route uses `Date.now()` to determine if an exam-mode contest has started, comparing against `assignment.startsAt` which comes from the database. This is the same class of clock-skew vulnerability that was systematically eliminated from the recruiting invitation routes and submission deadline enforcement. Using app server time to compare against DB timestamps introduces a TOCTOU-like race condition when the two clocks are not synchronized.

The codebase has a clear, documented convention: use `getDbNowUncached()` for schedule comparisons. The comment at line 96-98 even references "active exam-mode contests" but the check at line 99 violates the established pattern.

**Confidence:** High

---

### CRI-2: Anti-cheat heartbeat gap detection non-null assertions on nullable field [LOW/LOW]

**File:** `src/app/api/v1/contests/[assignmentId]/anti-cheat/route.ts:212-213`

**Description:** The code uses `heartbeats[i - 1].createdAt!` and `heartbeats[i].createdAt!` with non-null assertions. While the preceding `if` check at line 211 already guards against null values, the `!` assertions are misleading and would hide a future regression if the null check were removed. This is a minor code quality issue.

**Confidence:** High

---

### Positive Observations

- The cycle 39 fixes are well-implemented: the API key countdown feature provides clear user feedback, the un-revoke fix correctly removes the broken transition instead of silently accepting it, and the exam session short-circuit saves unnecessary DB queries.
- The `normalizeDateFilter` pattern in admin routes correctly validates dates before using them in SQL queries.
- The bulk enrollment route properly uses `onConflictDoNothing` to handle duplicate enrollments idempotently.
- The compiler execution module's sandbox configuration is thorough (network=none, cap-drop=ALL, read-only, seccomp, user 65534).
- The JSON-LD `safeJsonForScript` correctly handles both `</script` and `<!--` escape sequences.
