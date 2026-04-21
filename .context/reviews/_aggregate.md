# RPF Cycle 3 — Aggregate Review

**Date:** 2026-04-22
**Base commit:** 678f7d7d
**Review artifacts:** rpf-cycle-3-code-reviewer.md, rpf-cycle-3-security-reviewer.md, rpf-cycle-3-perf-reviewer.md, rpf-cycle-3-architect.md, rpf-cycle-3-debugger.md, rpf-cycle-3-verifier.md, rpf-cycle-3-test-engineer.md, rpf-cycle-3-tracer.md, rpf-cycle-3-critic.md, rpf-cycle-3-designer.md, rpf-cycle-3-document-specialist.md

## Deduped Findings (sorted by severity then signal)

### AGG-1: `SubmissionListAutoRefresh` uses `router.refresh()` which never throws — backoff logic is entirely dead code [MEDIUM/HIGH]

**Flagged by:** code-reviewer (CR-1), security-reviewer (SEC-1), perf-reviewer (PERF-1), architect (ARCH-1), debugger (DBG-1), verifier (V-1), critic (CRI-1), test-engineer (TE-1), document-specialist (DOC-1)
**Signal strength:** 9 of 11 review perspectives

**Files:** `src/components/submission-list-auto-refresh.tsx:27-44`

**Description:** The component implements exponential backoff with `errorCountRef` and `getBackoffInterval()`, but `router.refresh()` from `next/navigation` never throws on network errors. The try/catch on lines 38-44 is unreachable for network failures. The `errorCountRef` will always be 0, making `getBackoffInterval()` always return `baseInterval`. The JSDoc comment on lines 32-34 describes behavior that cannot occur.

**Concrete failure scenario:** Server is overloaded. Three pages using this component (`submissions/page.tsx`, `admin/submissions/page.tsx`, `public/submissions/page.tsx`) keep polling at full rate (5s/10s) with no backoff, contributing to server load and wasting client battery.

**Fix:** Replace `router.refresh()` with `fetch('/api/v1/time')` (or a similar lightweight endpoint) to detect errors, then call `router.refresh()` only on success. Update comments to match.

---

### AGG-2: `recruiting-invitations-panel.tsx` `fetchData` has `stats` in dependency array — potential unnecessary re-fetches [MEDIUM/MEDIUM]

**Flagged by:** code-reviewer (CR-4), debugger (DBG-3), verifier (V-3)
**Signal strength:** 3 of 11 review perspectives

**Files:** `src/components/contest/recruiting-invitations-panel.tsx:110-134`

**Description:** The `fetchData` useCallback has `stats` in its dependency array because it's used as a fallback on line 128 (`json.data ?? stats`). When `fetchData` updates `stats`, the callback reference changes, which triggers the `useEffect` on line 136 to call `fetchData` again. React's bailout prevents infinite loops when data is identical, but the dependency is semantically incorrect.

**Concrete failure scenario:** If the API returns data with different reference identity on each call (e.g., different timestamp), the component could enter a fetch loop.

**Fix:** Use functional state update: `setStats(prev => json.data ?? prev)` and remove `stats` from the dependency array.

---

### AGG-3: `contest-clarifications.tsx` polling can create duplicate intervals on rapid visibility toggles [MEDIUM/MEDIUM]

**Flagged by:** code-reviewer (CR-2), debugger (DBG-2), tracer (TR-3)
**Signal strength:** 3 of 11 review perspectives

**Files:** `src/components/contest/contest-clarifications.tsx:94-118`

**Description:** The `syncVisibility` function uses a local `interval` variable. While the single-threaded JS event loop prevents true race conditions, the code is fragile. The pattern of checking `if (!interval)` before creating a new interval could miss edge cases if `syncVisibility` is called from multiple sources. Using a `useRef` would be more robust.

**Concrete failure scenario:** Rapid tab switching causes `syncVisibility` to be called while the previous interval assignment is still in the microtask queue, potentially creating duplicate intervals.

**Fix:** Use a `useRef` for the interval ID instead of a local variable. Always clear the existing interval before creating a new one.

---

### AGG-4: `recruiting-invitations-panel.tsx` uses dynamic `import()` for clipboard utility — unnecessary async overhead [LOW/MEDIUM]

**Flagged by:** security-reviewer (SEC-2), perf-reviewer (PERF-3), architect (ARCH-4), critic (CRI-2)
**Signal strength:** 4 of 11 review perspectives

**Files:** `src/components/contest/recruiting-invitations-panel.tsx:183,208,310`

**Description:** Three locations use `const { copyToClipboard } = await import("@/lib/clipboard")` instead of a static import. The clipboard utility is a 37-line module that will be bundled with the page anyway. Dynamic imports add unnecessary async overhead and reduce readability.

**Fix:** Replace with static import at the top of the file: `import { copyToClipboard } from "@/lib/clipboard"`.

---

### AGG-5: SSE `queryFullSubmission` includes `sourceCode` in response — unnecessary data transfer [LOW/MEDIUM]

**Flagged by:** perf-reviewer (PERF-5), verifier (V-4), critic (CRI-4)
**Signal strength:** 3 of 11 review perspectives

**Files:** `src/app/api/v1/submissions/[id]/events/route.ts:463-488`

**Description:** The `queryFullSubmission` function does not exclude `sourceCode` from its columns. The client (`use-submission-polling.ts`) always uses `normalized.sourceCode || prev.sourceCode`, discarding the SSE-provided source code in favor of the already-loaded version. For large submissions (100KB+), this adds unnecessary latency to every SSE completion event.

**Fix:** Add `sourceCode: false` to the columns selection in `queryFullSubmission`, or add a minimal columns projection.

---

### AGG-6: `compiler-client.tsx` stdin `<textarea>` uses raw HTML element instead of `<Textarea>` component [LOW/MEDIUM]

**Flagged by:** code-reviewer (CR-3), designer (DES-1)
**Signal strength:** 2 of 11 review perspectives

**Files:** `src/components/code/compiler-client.tsx:466-483`

**Description:** The stdin input uses a raw `<textarea>` with inline Tailwind styles instead of the shared `<Textarea>` component. This is inconsistent with the test case name input (`<Input>`) and other textarea fields in the app. It misses consistent focus ring, dark mode theme, and disabled state styling.

**Fix:** Import and use `<Textarea>` from `@/components/ui/textarea`.

---

### AGG-7: `compiler-client.tsx` `TruncatedOutput` expand button uses raw `<button>` instead of `<Button>` [LOW/LOW]

**Flagged by:** designer (DES-2)
**Signal strength:** 1 of 11 review perspectives

**Files:** `src/components/code/compiler-client.tsx:106-115`

**Description:** The "Show full output" button uses a raw `<button>` instead of the shared `<Button>` component. This is the same pattern that was fixed for the anti-cheat privacy notice in cycle 2.

**Fix:** Replace with `<Button variant="link" size="sm">`.

---

### AGG-8: `contest-clarifications.tsx` shows raw `userId` UUID for other users' clarifications [LOW/MEDIUM]

**Flagged by:** designer (DES-3)
**Signal strength:** 1 of 11 review perspectives

**Files:** `src/components/contest/contest-clarifications.tsx:263`

**Description:** When the current user is not the author of a clarification, the component displays the raw `userId` UUID. This is not meaningful to users. Should show a name or generic label.

**Fix:** Either include the user's name in the API response and display it, or use a generic label like `t("askedByOther")`.

---

### AGG-9: `anti-cheat-monitor.tsx` `loadPendingEvents` does not validate stored JSON structure [LOW/MEDIUM]

**Flagged by:** code-reviewer (CR-7)
**Signal strength:** 1 of 11 review perspectives

**Files:** `src/components/exam/anti-cheat-monitor.tsx:28-35`

**Description:** `JSON.parse(raw)` on line 31 can return any JSON value. The function returns the parsed result without validating that it's an array. If localStorage is corrupted, subsequent code that iterates over the array could fail.

**Fix:** Add `const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : [];`.

---

### AGG-10: `SubmissionListAutoRefresh` uses `setInterval`/`clearInterval` where `setTimeout` would be simpler [LOW/LOW]

**Flagged by:** perf-reviewer (PERF-1)
**Signal strength:** 1 of 11 review perspectives

**Files:** `src/components/submission-list-auto-refresh.tsx:51-59`

**Description:** The `scheduleNext` function creates a `setInterval`, which fires once and is immediately cleared, then a new one is created. This is equivalent to `setTimeout` but with unnecessary `setInterval` overhead.

**Fix:** Replace `setInterval`/`clearInterval` with `setTimeout`/`clearTimeout`.

---

### AGG-11: No tests for `SubmissionListAutoRefresh` — would have caught dead backoff code [MEDIUM/MEDIUM]

**Flagged by:** test-engineer (TE-1)
**Signal strength:** 1 of 11 review perspectives

**Files:** `src/components/submission-list-auto-refresh.tsx`

**Description:** No unit tests exist for this component. Tests would have revealed that the backoff logic is dead code. Other untested components include `contest-clarifications.tsx` and the compiler keyboard shortcut exclusion.

**Fix:** Add unit tests for `SubmissionListAutoRefresh` backoff behavior.

---

## Previously Deferred Items (Carried Forward)

From cycle-27 aggregate and prior cycles:
- DEFER-1: Migrate raw route handlers to `createApiHandler` (22 routes)
- DEFER-2: SSE connection tracking eviction optimization
- DEFER-3: SSE connection cleanup test coverage

From earlier cycles (still active):
- D1: JWT authenticatedAt clock skew with DB tokenInvalidatedAt (MEDIUM)
- D2: JWT callback DB query on every request — add TTL cache (MEDIUM)
- A19: `new Date()` clock skew risk in remaining routes (LOW)

From cycle 1 (still active):
- DEFER-AGG8: Practice page Path B progress filter SQL optimization
- DEFER-AGG9: SubmissionListAutoRefresh error-state backoff (NOW ADDRESSED by AGG-1 — the backoff code exists but is non-functional)

## Resolved Issues (From Prior Cycles)

- AGG-1 (cycle 1): Clipboard copy logic duplication — RESOLVED by shared `clipboard.ts` utility
- AGG-2 (cycle 1): Contest layout blanket hard-navigation — RESOLVED by `data-full-navigate` opt-in
- AGG-3 (cycle 1): `use-source-draft.ts` localStorage try/catch — RESOLVED
- AGG-4 (cycle 1): Unhandled promise rejections in clipboard — RESOLVED by shared utility
- AGG-5 (cycle 1): `defaultValue` inline fallbacks in compiler-client — RESOLVED
- AGG-6 (cycle 1): Inline Math.round instead of formatScore — RESOLVED
- AGG-7 (cycle 1): Keyboard shortcut fires in textarea/input — RESOLVED
- AGG-10 (cycle 1): Raw `<button>` in anti-cheat privacy notice — RESOLVED
- AGG-11 (cycle 1): Misleading test name — RESOLVED
- DEFER-AGG9 (cycle 1): SubmissionListAutoRefresh error-state backoff — PARTIALLY ADDRESSED (code exists but is dead)

## Agent Failures

None. All 11 review perspectives completed successfully.
