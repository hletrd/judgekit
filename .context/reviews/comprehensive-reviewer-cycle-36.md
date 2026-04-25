# Comprehensive Code Review — Cycle 36

**Date:** 2026-04-25
**Reviewer:** comprehensive-reviewer
**Scope:** Full repository — all src/ TypeScript files, with focus on uncommitted changes and newly introduced patterns

---

## Finding Inventory

### NEW-1: [MEDIUM] Analytics route `getDbNowMs()` in background `.then()`/`.catch()` can cause unhandled rejection chain

**File:** `src/app/api/v1/contests/[assignmentId]/analytics/route.ts:67-78`
**Confidence:** HIGH

The analytics route uses `getDbNowMs()` (an async DB query) inside `.then(async ...)` and `.catch(async ...)` callbacks for the background stale-while-revalidate refresh. The chain is:

```js
computeContestAnalytics(assignmentId, true)
  .then(async (fresh) => {
    analyticsCache.set(cacheKey, { data: fresh, createdAt: await getDbNowMs() });
    _lastRefreshFailureAt.delete(cacheKey);
  })
  .catch(async () => {
    _lastRefreshFailureAt.set(cacheKey, await getDbNowMs());
    logger.error({ assignmentId }, "[analytics] Failed to refresh analytics cache");
  })
  .finally(() => {
    _refreshingKeys.delete(cacheKey);
  });
```

While the `.then()`/`.catch()` pattern with async callbacks technically works — a rejection in `.then()` flows to `.catch()`, and `.catch()` catches both computation and timestamp failures — there is a residual risk: if `getDbNowMs()` throws inside `.catch()` (the error handler itself), the resulting rejection is unhandled because `.finally()` does not catch rejections. In a DB connectivity degradation scenario, this could produce unhandled promise rejections that crash the Node.js process (Node 16+ exits on unhandled rejections by default).

The same pattern exists in `src/lib/assignments/contest-scoring.ts:118-129` but that code uses `Date.now()` for staleness checks and only calls `getDbNowMs()` for cache writes, making it less likely to fail during DB connectivity issues.

**Fix:** Wrap the background refresh in a standalone async IIFE with its own try/catch/finally, rather than chaining `.then()`/`.catch()`/`.finally()` with async callbacks:

```ts
_refreshingKeys.add(cacheKey);
(async () => {
  try {
    const fresh = await computeContestAnalytics(assignmentId, true);
    analyticsCache.set(cacheKey, { data: fresh, createdAt: await getDbNowMs() });
    _lastRefreshFailureAt.delete(cacheKey);
  } catch {
    _lastRefreshFailureAt.set(cacheKey, await getDbNowMs());
    logger.error({ assignmentId }, "[analytics] Failed to refresh analytics cache");
  } finally {
    _refreshingKeys.delete(cacheKey);
  }
})().catch(() => {
  // Defensive: if getDbNowMs() itself fails in catch/finally, swallow to prevent unhandled rejection
});
```

---

### NEW-2: [LOW] `database-backup-restore.tsx` logs raw API response object in development

**File:** `src/app/(dashboard)/dashboard/admin/settings/database-backup-restore.tsx:153-154`
**Confidence:** HIGH

The restore error handler logs the full `data` object via `console.error(data)` in development mode. This is the same class of issue fixed in cycle 35 for `group-instructors-manager.tsx`. The raw API response could contain internal error details, stack traces, or database metadata that should not be exposed, even in development.

```ts
if (process.env.NODE_ENV === "development") {
  console.error(data);
}
```

**Fix:** Replace with a structured error message:

```ts
if (process.env.NODE_ENV === "development") {
  console.error("Restore failed:", (data as { error?: string }).error);
}
```

---

### NEW-3: [LOW] `parseInt(x, 10) || defaultValue` pattern treats `0` as falsy in chat widget admin config

**File:** `src/lib/plugins/chat-widget/admin-config.tsx:295,306`
**Confidence:** MEDIUM

The chat widget admin config uses `parseInt(e.target.value, 10) || 100` for maxTokens and `parseInt(e.target.value, 10) || 10` for rateLimitPerMinute. While the HTML `min` attributes prevent `0` from being a valid input, the `||` pattern is fragile and inconsistent with the `Number.isFinite` fix applied to similar fields in cycle 35. If the HTML validation is bypassed (e.g., programmatic input, browser bugs), `0` would silently become the default.

**Fix:** Replace with `Number.isFinite` pattern for consistency:

```ts
const parsed = parseInt(e.target.value, 10);
setMaxTokens(Number.isFinite(parsed) ? parsed : 100);
```

---

### NEW-4: [LOW] `parseInt(x, 10) || 0` in admin roles editor treats `0` as falsy

**File:** `src/app/(dashboard)/dashboard/admin/roles/role-editor-dialog.tsx:187`
**Confidence:** MEDIUM

The role level field uses `parseInt(e.target.value, 10) || 0`. While `0` maps to the same value (`0`), this is inconsistent with the codebase's move toward `Number.isFinite` patterns. More importantly, the `||` pattern masks `NaN` inputs as `0` rather than signaling an invalid input.

**Fix:** Use `Number.isFinite` pattern:

```ts
const parsed = parseInt(e.target.value, 10);
setLevel(Number.isFinite(parsed) ? parsed : 0);
```

---

### NEW-5: [LOW] `parseInt(diskUsage.usePercent) || 0` in language config table treats `0%` as `0`

**File:** `src/app/(dashboard)/dashboard/admin/languages/language-config-table.tsx:320`
**Confidence:** LOW

`parseInt(diskUsage.usePercent) || 0` — if `diskUsage.usePercent` is `"0%"` (0% disk usage), `parseInt("0%")` returns `0`, and `0 || 0` evaluates to `0`. So this specific case is not buggy (the fallback matches the parsed value). However, if the value were `NaN`, it would silently become `0` instead of showing an error or "unknown" state. Low severity since `df -h` reliably produces parseable output.

---

### NEW-6: [LOW] Exam-session GET route returns `examModeInvalid` (400) but the semantic error is "exam mode not applicable"

**File:** `src/app/api/v1/groups/[id]/assignments/[assignmentId]/exam-session/route.ts:106`
**Confidence:** LOW

The GET route returns `apiError("examModeInvalid", 400)` when `assignment.examMode === "none"`. However, requesting an exam session for a non-exam assignment is not a "bad request" (client error in input) — it's a semantic mismatch. A `404` (as the analytics route uses for the same check) or a more specific error code like `"examNotApplicable"` would be more semantically correct. The POST route at line 29 also returns 400 for the same case, but at least the POST is creating something that doesn't make sense. The GET route is querying for session data that simply doesn't exist for non-exam assignments, which is more appropriately a 404.

**Fix:** Consider returning `notFound("ExamSession")` instead of `apiError("examModeInvalid", 400)` for the GET route, to be consistent with the analytics route's handling of the same condition.

---

## Files Reviewed

- `src/app/api/v1/contests/[assignmentId]/analytics/route.ts` (uncommitted change)
- `src/app/api/v1/groups/[id]/assignments/[assignmentId]/exam-session/route.ts` (uncommitted change)
- `src/lib/docker/client.ts` (uncommitted change)
- `src/lib/db-time.ts`
- `src/lib/security/constants.ts`
- `src/lib/security/timing.ts`
- `src/lib/security/sanitize-html.ts`
- `src/lib/assignments/contest-scoring.ts`
- `src/app/api/v1/recruiting/validate/route.ts`
- `src/app/api/v1/submissions/[id]/events/route.ts`
- `src/components/seo/json-ld.tsx`
- `src/components/problem-description.tsx`
- `src/app/(dashboard)/dashboard/admin/settings/database-backup-restore.tsx`
- `src/app/(dashboard)/dashboard/groups/[id]/assignment-form-dialog.tsx`
- `src/lib/plugins/chat-widget/admin-config.tsx`
- `src/app/(dashboard)/dashboard/admin/roles/role-editor-dialog.tsx`
- `src/app/(dashboard)/dashboard/admin/languages/language-config-table.tsx`
