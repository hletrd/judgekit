# Performance Review — RPF Cycle 16

**Date:** 2026-04-22
**Reviewer:** perf-reviewer
**Base commit:** 9379c26b

## Inventory of Review-Relevant Files

Focus: components with polling/fetching patterns, large list rendering, useMemo/useCallback usage, and bundle-size concerns.

## Findings

### PERF-1: `invite-participants.tsx` search effect does not cancel in-flight requests [MEDIUM/MEDIUM]

**File:** `src/components/contest/invite-participants.tsx:58-64`
**Confidence:** HIGH

The `useEffect` for debounced search fires `search(query)` on every 300ms debounce tick, but there is no AbortController. If the user types rapidly, multiple search requests can be in-flight simultaneously. The last one to resolve wins, which may not be the latest query. This is a race condition that can produce stale results.

```ts
useEffect(() => {
  if (debounceRef.current) clearTimeout(debounceRef.current);
  debounceRef.current = setTimeout(() => search(query), 300);
  return () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  };
}, [query, search]);
```

**Fix:** Add AbortController support to the search function, aborting the previous request before starting a new one.

---

### PERF-2: `recruiter-candidates-panel.tsx` fetches full export endpoint just to display a summary table [MEDIUM/LOW]

**File:** `src/components/contest/recruiter-candidates-panel.tsx:50-52`
**Confidence:** MEDIUM

The component fetches `/api/v1/contests/${assignmentId}/export?format=json` which returns the full contest export data. This endpoint likely returns all candidate data including problem-level breakdowns. For a summary table showing only rank, name, score, solved, and flags, this is more data than needed. This is partially covered by the existing DEFER-29 (dedicated candidates summary endpoint).

**Fix:** This is already tracked as DEFER-29. No new action needed.

---

### PERF-3: `anti-cheat-dashboard.tsx` `uniqueStudents` computation is O(n) on every render with full events array [LOW/LOW]

**File:** `src/components/contest/anti-cheat-dashboard.tsx:205-213`
**Confidence:** LOW

The `useMemo` for `uniqueStudents` iterates the full events array and builds a Map. While this is cached via `useMemo([events])`, when events is large (potentially thousands for a long contest), this creates a new Map every time events changes. The first-page-only optimization from cycle 15 mitigates this for polling (events reference only changes when data actually changes), so this is low priority.

**Fix:** No action needed currently. If performance profiling reveals this as a bottleneck, consider computing from filteredEvents or using a Web Worker.

---

### PERF-4: `countdown-timer.tsx` uses `setInterval` instead of recursive `setTimeout` [LOW/LOW]

**File:** `src/components/exam/countdown-timer.tsx:123`
**Confidence:** LOW

The timer uses `setInterval(recalculate, 1000)`. If `recalculate` takes longer than 1 second (unlikely but possible under extreme load), intervals can stack up. Recursive `setTimeout` is generally preferred for timers that need consistent spacing. This is very low priority since the recalculate function is trivial.

**Fix:** Consider switching to recursive `setTimeout` if timer accuracy becomes a concern.

## Previously Deferred (Carried Forward)

- DEFER-53: `contest-join-client.tsx` 1-second setTimeout delay (from PERF-3 cycle 14)
- DEFER-54: Anti-cheat dashboard polling full shallow comparison for multi-page data
- DEFER-55: `recruiting-invitations-panel.tsx` Promise.all vs Promise.allSettled
