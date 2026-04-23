# Debugger Review — RPF Cycle 16

**Date:** 2026-04-22
**Reviewer:** debugger
**Base commit:** 9379c26b

## Inventory of Review-Relevant Files

Focus: latent bug surface, failure modes, unhandled exceptions, edge cases that could cause runtime errors.

## Findings

### DBG-1: `compiler-client.tsx:270` unguarded `res.json()` can throw SyntaxError in error handler [MEDIUM/HIGH]

**File:** `src/components/code/compiler-client.tsx:267-275`
**Confidence:** HIGH

Also flagged by code-reviewer (CR-1), critic (CRI-2), verifier (V-1).

When the server returns a non-JSON error body, the inner `try` block throws SyntaxError. The outer `catch` block then produces a generic error message:

```
Error path: res.ok = false -> try { res.json() } -> SyntaxError -> outer catch -> "Network error"
```

The failure mode is: user submits code, compiler runner is down (502), user sees "Network error" toast instead of something useful. The `res.statusText` is available but never used when the inner `.json()` throws.

**Fix:** Add `.catch(() => ({}))` to the `res.json()` call at line 270.

---

### DBG-2: `invite-participants.tsx` race condition on rapid search input [MEDIUM/MEDIUM]

**File:** `src/components/contest/invite-participants.tsx:34-64`
**Confidence:** HIGH

Also flagged by perf-reviewer (PERF-1), critic (CRI-3), verifier (V-4).

The search function has no request cancellation. Rapid typing causes multiple overlapping requests. The last one to resolve wins, which may not correspond to the current search query. This can produce confusing UX where the displayed results don't match what the user typed.

**Fix:** Add AbortController to cancel previous in-flight search requests.

---

### DBG-3: `recruiter-candidates-panel.tsx` exports open `window.open` to `_blank` [LOW/LOW]

**File:** `src/components/contest/recruiter-candidates-panel.tsx:90-98`
**Confidence:** LOW

The CSV download uses `window.open(url, "_blank")` without `noopener,noreferrer`. This is a minor tab-napping risk where the opened page could access `window.opener`. Since these are same-origin API URLs, the risk is negligible.

**Fix:** Add `noopener,noreferrer` as a security best practice, or use `<a>` element with `download` attribute instead.

---

### DBG-4: `anti-cheat-monitor.tsx` retry logic may accumulate timers if multiple events fail simultaneously [LOW/LOW]

**File:** `src/components/exam/anti-cheat-monitor.tsx:122-129`
**Confidence:** LOW

When `sendEvent` fails, a retry timer is set. If multiple events fail in quick succession, only one timer is created (due to `if (!retryTimerRef.current)`), and `flushPendingEvents` is called once. This is actually correct behavior — it batches retries. However, if `flushPendingEvents` itself fails for all events, the timer is cleared but no new timer is set for the remaining events. The events stay in localStorage and will be retried on next mount (via `flushPendingEventsRef.current()` in the `useEffect`), so no data is lost. This is acceptable behavior.

**Fix:** No fix needed. Current behavior is correct for the use case.

## Final Sweep

- No new crash-inducing bugs found
- The `compiler-client.tsx` unguarded `.json()` is the highest-severity latent bug
- Previously fixed items from cycles 11-15 remain intact
