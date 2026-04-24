# Performance Review - Cycle 15

## Summary
Performance review of the judgekit platform. The codebase shows good performance awareness with connection pooling, concurrency limits, and batched audit writes. Found several areas for improvement.

---

## Finding P1: In-Memory Rate Limiter FIFO Eviction is O(n log n)
**File:** `src/lib/security/in-memory-rate-limit.ts:41-47`
**Severity:** Medium | **Confidence:** Medium

When `store.size > MAX_ENTRIES`, the eviction code creates a sorted copy of all entries:
```ts
const sorted = [...store.entries()].sort((a, b) => a[1].lastAttempt - b[1].lastAttempt);
```
This is O(n log n) and allocates a new array. Under load with 10,000 entries, this runs on every `recordFailureInMemory` call that exceeds capacity.

**Fix:** Use an LRU map or a doubly-linked list for O(1) eviction. Alternatively, since `Map` preserves insertion order and entries are naturally ordered by creation time, simply evicting the first N entries (FIFO) would be O(1) and sufficient for rate limiting.

---

## Finding P2: Auth User Cache Lacks TTL-Based Eviction
**File:** `src/proxy.ts:23-71`
**Severity:** Low | **Confidence:** Medium

The `authUserCache` uses FIFO eviction based on max size (500 entries) but does not proactively evict expired entries. Expired entries are only removed on read (`getCachedAuthUser`). Under low traffic with many unique users, the cache could fill with expired entries that are never cleaned up until new entries push them out.

**Fix:** Add a periodic sweep (similar to the rate limiter's `maybeEvict`) that removes expired entries, or use a dedicated cache library with TTL support.

---

## Finding P3: Rate Limit Eviction Timer Uses setInterval Without Drift Protection
**File:** `src/lib/security/rate-limit.ts:64-78`
**Severity:** Low | **Confidence:** Low

`startRateLimitEviction` uses `setInterval` for periodic stale entry cleanup. Under heavy event loop load, `setInterval` can drift significantly, causing eviction to run less frequently than intended. This is a minor concern since stale entries are also cleaned up on access.

**Fix:** Consider using a timestamp check within the eviction function (similar to `maybeEvict` in the in-memory rate limiter) as a defense against timer drift.
