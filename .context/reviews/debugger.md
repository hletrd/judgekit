# Debugger Review — RPF Cycle 29

**Date:** 2026-04-23
**Reviewer:** debugger
**Base commit:** a51772ae

## Previously Fixed Items (Verified)

- Contest replay setInterval: Fixed (commit 9cc30d51)
- console.error gating: Verified
- All prior cycle findings verified as fixed

## DBG-1: Hardcoded English answer text in clarifications — persistent data corruption bug [MEDIUM/HIGH]

**File:** `src/components/contest/contest-clarifications.tsx:290-296`

**Failure mode:** When a Korean-speaking contest organizer clicks a quick-answer button, the hardcoded English text ("Yes", "No", "No comment") is stored in the database as the answer. This data is then shown to all participants. Unlike the previous code-editor i18n issue (which only affected runtime display), this bug **persists data in the wrong language** to the database. Even after fixing the code, previously submitted English answers will remain in the database.

**Concrete failure scenario:**
1. Contest organizer clicks "Yes" quick-answer button
2. API receives `answer: "Yes"`, `answerType: "yes"`, `isPublic: true`
3. Database stores `answer: "Yes"`
4. Korean participants see "Yes" instead of "네" as the answer
5. After fix, only new answers will be Korean; old answers remain English

**Fix:** Add i18n keys for answer content. Note: existing database records with English answers will need a migration or will remain in English. The `answerType` field could be used to display the localized string at render time instead of relying on the stored `answer` text.

---

## DBG-2: `useVisibilityPolling` setInterval catch-up behavior [LOW/LOW]

**File:** `src/hooks/use-visibility-polling.ts:55`

**Failure mode:** When a tab is backgrounded, browsers throttle `setInterval` to at most once per second (and often less). When the tab regains focus, all pending interval callbacks may fire in rapid succession. The hook's `syncVisibility` handler (line 45-58) mitigates this by clearing and recreating the interval on visibility change, but the interval callback itself may still accumulate drift during the brief period between the interval firing and the visibility change handler running.

**Concrete failure scenario:** A user leaves a polling tab in the background for 2 minutes. The `setInterval` is throttled by the browser. When the user returns, the visibility change handler fires and creates a new interval, but there's a small window where the old throttled interval may still fire before being cleared.

**Fix:** Migrate to recursive `setTimeout` which inherently avoids catch-up behavior.

---

## Debugger Findings (carried/deferred)

### DBG-CARRIED-1: Sidebar interval re-entry — LOW/LOW, deferred from cycle 26
