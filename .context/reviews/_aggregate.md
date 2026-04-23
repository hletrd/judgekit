# RPF Cycle 31 — Aggregate Review

**Date:** 2026-04-23
**Base commit:** 198e6a63
**Review artifacts:** code-reviewer.md, perf-reviewer.md, security-reviewer.md, architect.md, critic.md, verifier.md, debugger.md, test-engineer.md, tracer.md, designer.md, document-specialist.md

## Previously Fixed Items (Verified in Current Code)

All prior cycle aggregate findings have been addressed:
- AGG-1 (countdown timer setInterval): Fixed in commit 19de5cf6
- AGG-2 (rate-limiter .catch() guard): Fixed in commit 7ae57906
- AGG-3 (chat widget sendMessage stabilization): Fixed in commit ce9aa4fa
- All other prior findings verified as fixed

## Deduped Findings (sorted by severity then signal)

### AGG-1: ActiveTimedAssignmentSidebarPanel uses `setInterval` — last remaining client-side timer with old pattern [MEDIUM/MEDIUM]

**Flagged by:** code-reviewer (CR-1), perf-reviewer (PERF-1), architect (ARCH-1), critic (CRI-1), verifier (V-1), debugger (DBG-1), tracer (TR-1), designer (DES-1), test-engineer (TE-1), document-specialist (DOC-1)
**Signal strength:** 10 of 11 review perspectives

**File:** `src/components/layout/active-timed-assignment-sidebar-panel.tsx:63`

**Description:** The sidebar panel uses `window.setInterval(() => {...}, 1000)` on line 63. The codebase has established recursive `setTimeout` as the standard pattern for all timer-based effects. The countdown timer was migrated in cycle 30, the visibility polling hook in cycle 29, and the contest replay in cycle 28. This component is the last remaining client-side timer using `setInterval`.

The comment on line 78-79 says "This matches the pattern in countdown-timer.tsx" but it doesn't — countdown-timer now uses recursive `setTimeout`. This is clearly an oversight.

**Concrete failure scenario:** A student switches tabs during an active assignment. Throttled `setInterval` callbacks fire in rapid succession when the tab becomes visible, causing a burst of `setNowMs()` calls and re-renders. The progress bar (which has a CSS transition) stutters. The `visibilitychange` handler already provides the correct immediate update, making the catch-up interval callbacks redundant.

**Fix:** Migrate to recursive `setTimeout` with `cancelled` flag, matching the pattern in countdown-timer.tsx:
```typescript
let timerId: ReturnType<typeof setTimeout> | null = null;
let cancelled = false;

function scheduleNext() {
  timerId = setTimeout(() => {
    if (cancelled) return;
    const now = Date.now();
    setNowMs(now);
    const allExpired = assignments.every(
      (assignment) => new Date(assignment.deadline).getTime() <= now
    );
    if (!allExpired) scheduleNext();
  }, 1000);
}

function handleVisibilityChange() {
  if (document.visibilityState === "visible") {
    setNowMs(Date.now());
  }
}

scheduleNext();
document.addEventListener("visibilitychange", handleVisibilityChange);

return () => {
  cancelled = true;
  if (timerId !== null) clearTimeout(timerId);
  document.removeEventListener("visibilitychange", handleVisibilityChange);
};
```

---

### AGG-2: Chat widget route leaks raw `err.message` from tool execution to LLM context [MEDIUM/HIGH]

**Flagged by:** security-reviewer (SEC-1), critic (CRI-2), verifier (V-2), debugger (DBG-2), tracer (TR-2), test-engineer (TE-2)
**Signal strength:** 6 of 11 review perspectives

**File:** `src/app/api/v1/plugins/chat-widget/chat/route.ts:431`

**Description:** When a tool execution fails, the catch block constructs: `Error executing tool "${call.name}": ${err instanceof Error ? err.message : "unknown error"}`. This raw `err.message` is sent to the LLM as a tool result. The LLM may relay internal error details to the user in its response.

Internal error messages can contain database connection strings, file system paths, stack traces, and internal service names. The tool execution can fail for many reasons (database query errors, permission errors, file I/O errors), and all would have their raw messages exposed through the LLM.

**Concrete failure scenario:** The `get_submission_detail` tool fails with a database connection error: `connect ECONNREFUSED 127.0.0.1:5432`. The error message contains the database host and port. The LLM receives this as a tool result and may mention it to the user.

**Fix:** Sanitize the error message before passing it to the LLM:
```typescript
toolResult = `Error executing tool "${call.name}" — please try again`;
logger.warn({ err, toolName: call.name }, "[chat] Tool execution failed");
```

---

### AGG-3: Inconsistent `.json()` error handling on three server-side sidecar success paths [LOW/MEDIUM]

**Flagged by:** code-reviewer (CR-3, CR-4, CR-5), verifier (V-3), architect (ARCH-2), security-reviewer (SEC-3)
**Signal strength:** 6 of 11 review perspectives

**Files:**
- `src/lib/assignments/code-similarity-client.ts:49`
- `src/lib/compiler/execute.ts:533`
- `src/lib/security/hcaptcha.ts:76`

**Description:** Three server-side sidecar/external API clients call `response.json()` without `.catch()` on success paths. The rate-limiter-client.ts was fixed in cycle 30 with a `.catch(() => null)` pattern, establishing it as the canonical approach. These three clients don't follow the pattern.

1. **code-similarity-client.ts:49** — `response.json()` without `.catch()`. If the sidecar returns 200 with a non-JSON body, the `SyntaxError` propagates to the outer catch, returning `null` (fail-open). The error is logged as "unreachable" which is misleading.

2. **compiler/execute.ts:533** — `response.json()` without `.catch()`. Same class of issue. The error is logged as "Rust runner unavailable" when the runner was actually reachable but returned invalid data.

3. **hcaptcha.ts:76** — `response.json()` without `.catch()`. If hcaptcha returns 200 with a non-JSON body, the `SyntaxError` is unhandled and propagates as an unhandled promise rejection.

**Fix:** Apply `.catch()` guards consistently:
1. code-similarity-client: `const data = (await response.json().catch(() => null)) as RustComputeResponse | null; if (!data) return null;`
2. compiler/execute.ts: `const data = (await response.json().catch(() => null)) as CompilerRunResult | null; if (!data) { logger.warn(..., "[compiler] Rust runner returned invalid JSON"); return null; }`
3. hcaptcha.ts: `const payload = await response.json().catch(() => ({ success: false, "error-codes": ["parse-error"] })) as {...};`

---

### AGG-4: Edit-group-dialog triple `Array.find()` in SelectValue render [LOW/LOW]

**Flagged by:** code-reviewer (CR-2), perf-reviewer (PERF-2), designer (DES-2)
**Signal strength:** 3 of 11 review perspectives

**File:** `src/app/(dashboard)/dashboard/groups/edit-group-dialog.tsx:141-143`

**Description:** The `SelectValue` render calls `group.availableInstructors.find((instructor) => instructor.id === instructorId)` three times in the same expression. Each lookup iterates the array. While the array is typically small (a few instructors), this is unnecessary work on every render.

**Fix:** Extract the found instructor into a variable before the JSX expression.

---

### AGG-5: Docker client leaks `err.message` in build error responses [LOW/MEDIUM]

**Flagged by:** security-reviewer (SEC-2)
**Signal strength:** 1 of 11 review perspectives

**File:** `src/lib/docker/client.ts:174`

**Description:** `resolve({ success: false, error: err.message })` on line 174 passes raw Node.js error messages in the response. Docker build errors may contain host file paths, container IDs, or other infrastructure details. This endpoint is admin-only, reducing risk.

**Fix:** Log the full error and return a sanitized message.
