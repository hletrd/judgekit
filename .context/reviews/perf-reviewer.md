# Performance Review — RPF Cycle 13

**Date:** 2026-04-22
**Reviewer:** perf-reviewer
**Base commit:** 38206415

## Previously Fixed Items (Verified)

All cycle 12 performance findings are carried or addressed:
- PERF-1 (language-config-table unguarded res.json() on success path): Fixed

## Findings

### PERF-1: `anti-cheat-dashboard.tsx` and `participant-anti-cheat-timeline.tsx` polling fetches replace all data on every tick [MEDIUM/LOW]

**Files:**
- `src/components/contest/anti-cheat-dashboard.tsx:118-152`
- `src/components/contest/participant-anti-cheat-timeline.tsx:90-122`

**Description:** Both anti-cheat components use `useVisibilityPolling` with a 30-second interval. On every tick, `fetchEvents()` replaces the entire events array with the first page from the API. While the merge logic preserves pages loaded via loadMore, the polling request always fetches `offset=0` and replaces the first page. This means:
1. On every 30-second tick, the entire first page (100 events) is re-fetched and re-rendered.
2. If the user has loaded multiple pages, only the first page is refreshed — later pages become stale.
3. State updates trigger re-renders of the entire table even when data has not changed.

This is not a critical performance issue but could cause noticeable jank on large datasets with frequent re-renders.

**Fix:** Consider:
1. Using a conditional re-render (e.g., shallow-compare the events array before setting state).
2. Adding an `If-Modified-Since` or `ETag` header to avoid re-fetching unchanged data.
3. The polling interval of 30s is reasonable for anti-cheat monitoring.

**Confidence:** LOW

---

### PERF-2: `submission-overview.tsx:87` unguarded `res.json()` on success path — potential unnecessary exception [LOW/MEDIUM]

**File:** `src/components/lecture/submission-overview.tsx:87`

**Description:** After checking `res.ok` is true (line 86 returns early on `!res.ok`), line 87 calls `const json = await res.json()` without `.catch()`. On the success path, if the server returns a non-JSON body, this throws SyntaxError. The catch block handles it, but the exception is avoidable.

**Fix:** Add `.catch(() => ({ data: {} }))` or wrap in try-catch.

**Confidence:** MEDIUM

---

### PERF-3: `problem-import-button.tsx` parses uploaded JSON without size limit — client-side memory pressure [LOW/MEDIUM]

**File:** `src/app/(dashboard)/dashboard/problems/problem-import-button.tsx:22-23`

**Description:** Carried from PERF-2 (cycle 12). Line 22-23 reads the entire file content and parses it with `JSON.parse()` without any size validation. A very large JSON file could cause client-side memory pressure and potentially freeze the UI.

**Fix:** Add a client-side file size check (e.g., `if (file.size > 10 * 1024 * 1024) { toast.error(...); return; }`).

**Confidence:** MEDIUM

---

## Final Sweep

No critical performance findings this cycle. The main areas of concern are: (1) anti-cheat dashboard polling could be optimized to avoid full-data replacement on every tick, (2) several unguarded `res.json()` calls on success paths that could cause unnecessary exceptions, and (3) the problem import button still lacks a file size check.
