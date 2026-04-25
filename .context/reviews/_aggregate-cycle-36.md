# Aggregate Review — Cycle 36

**Date:** 2026-04-25
**Reviewers:** comprehensive-reviewer
**Total findings:** 6 new (1 MEDIUM, 5 LOW) + 0 false positives + 14 carried deferred re-validated + 0 newly fixed

---

## Deduplicated Findings (sorted by severity)

### AGG-1: [MEDIUM] Analytics route `getDbNowMs()` in background `.then()`/`.catch()` can cause unhandled rejection chain

**Sources:** NEW-1 | **Confidence:** HIGH

In `src/app/api/v1/contests/[assignmentId]/analytics/route.ts:67-78`, the stale-while-revalidate background refresh uses async callbacks in `.then()`/`.catch()` chains with `getDbNowMs()` (an async DB query). If `getDbNowMs()` throws inside the `.catch()` handler (e.g., during DB connectivity degradation), the resulting rejection is unhandled because `.finally()` does not catch rejections. This could crash the Node.js process on unhandled promise rejection.

The same pattern exists in `src/lib/assignments/contest-scoring.ts:118-129`, but that code's staleness check uses `Date.now()`, and the DB query is only used for cache writes — making it less likely to fail during DB issues. However, the same structural risk applies.

**Fix:** Replace the `.then()`/`.catch()`/`.finally()` chain with a standalone async IIFE wrapped in its own try/catch/finally. Add a defensive outer `.catch()` to swallow any failures from `getDbNowMs()` itself:

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

Apply the same pattern to `contest-scoring.ts`.

---

### AGG-2: [LOW] `database-backup-restore.tsx` logs raw API response object in development

**Sources:** NEW-2 | **Confidence:** HIGH

`src/app/(dashboard)/dashboard/admin/settings/database-backup-restore.tsx:153-154` logs the full `data` object via `console.error(data)` in development mode. This is the same class of issue fixed in cycle 35 for `group-instructors-manager.tsx`. The raw API response could contain internal error details.

**Fix:** Replace `console.error(data)` with `console.error("Restore failed:", (data as { error?: string }).error)`.

---

### AGG-3: [LOW] `parseInt(x, 10) || defaultValue` in chat widget admin config treats `0` as falsy

**Sources:** NEW-3 | **Confidence:** MEDIUM

`src/lib/plugins/chat-widget/admin-config.tsx:295,306` uses `parseInt(e.target.value, 10) || 100` and `|| 10`. While HTML `min` constraints prevent `0`, the `||` pattern is fragile and inconsistent with the `Number.isFinite` fix applied to similar fields in cycle 35.

**Fix:** Use `Number.isFinite` pattern for consistency:
```ts
const parsed = parseInt(e.target.value, 10);
setMaxTokens(Number.isFinite(parsed) ? parsed : 100);
```

---

### AGG-4: [LOW] `parseInt(x, 10) || 0` in admin roles editor treats `0` as falsy

**Sources:** NEW-4 | **Confidence:** MEDIUM

`src/app/(dashboard)/dashboard/admin/roles/role-editor-dialog.tsx:187` uses `parseInt(e.target.value, 10) || 0`. While `0` maps to the same fallback value, `NaN` inputs are silently masked as `0` instead of signaling invalid input. Inconsistent with `Number.isFinite` pattern.

**Fix:** Use `Number.isFinite` pattern for consistency.

---

### AGG-5: [LOW] `parseInt(diskUsage.usePercent) || 0` — low risk but inconsistent pattern

**Sources:** NEW-5 | **Confidence:** LOW

`src/app/(dashboard)/dashboard/admin/languages/language-config-table.tsx:320` — not buggy for `0%` case since `0 || 0 === 0`, but the `||` pattern is inconsistent.

---

### AGG-6: [LOW] Exam-session GET returns `examModeInvalid` (400) for non-exam assignments — semantically questionable

**Sources:** NEW-6 | **Confidence:** LOW

`src/app/api/v1/groups/[id]/assignments/[assignmentId]/exam-session/route.ts:106` returns `apiError("examModeInvalid", 400)` when `examMode === "none"`. A GET for a resource that doesn't exist (no exam session possible for non-exam assignments) is more appropriately a 404, consistent with the analytics route's handling of the same condition.

---

## Carried Deferred Items (unchanged from cycle 35)

- DEFER-22: `.json()` before `response.ok` — 60+ instances
- DEFER-23: Raw API error strings without translation — partially fixed
- DEFER-24: `migrate/import` unsafe casts — Zod validation not yet built
- DEFER-27: Missing AbortController on polling fetches
- DEFER-28: `as { error?: string }` pattern — 22+ instances
- DEFER-29: Admin routes bypass `createApiHandler` — assignments POST now fixed
- DEFER-30: Recruiting validate token brute-force
- DEFER-32: Admin settings exposes DB host/port
- DEFER-33: Missing error boundaries — contests segment now fixed
- DEFER-34: Hardcoded English fallback strings
- DEFER-35: Hardcoded English strings in editor title attributes
- DEFER-36: `formData.get()` cast assertions
- DEFER-43: Docker client leaks `err.message` in build responses
- DEFER-44: No documentation for timer pattern convention
- DEFER-45: Anti-cheat monitor captures user text snippets (design decision)

## Previously Deferred Items Now Fixed

- (No new fixes this cycle beyond those tracked in previous cycles)

## No Agent Failures

The comprehensive review completed successfully.
