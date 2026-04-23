# Verifier Review — RPF Cycle 29

**Date:** 2026-04-23
**Reviewer:** verifier
**Base commit:** a51772ae

## Previously Fixed Items (Verified)

- Code editor i18n (AGG-1 from cycle 28): Verified fixed in commit 5c387c7b. The `CodeEditor` now accepts `fullscreenLabel`, `exitFullscreenLabel`, `exitButtonLabel`, and `languageFallbackLabel` props from the parent `CompilerClient`, which provides `t(...)` calls. English and Korean message files updated.
- Contest replay setInterval (PERF-CARRIED-1): Verified fixed in commit 9cc30d51. The auto-play effect now uses recursive `setTimeout` with a `cancelled` flag.

## V-1: Hardcoded English answer text in clarifications — evidence-based verification [MEDIUM/HIGH]

**File:** `src/components/contest/contest-clarifications.tsx:290-296`

**Evidence:** The `handleAnswer` function (line 133) accepts an `answerText` parameter. On line 134: `const answer = answerText ?? answerDrafts[id] ?? ""`. The quick-answer buttons invoke:

```
handleAnswer(clarification.id, "yes", "Yes")       // line 290
handleAnswer(clarification.id, "no", "No")           // line 293
handleAnswer(clarification.id, "no_comment", "No comment")  // line 296
```

The `answer` variable is sent to the API as `body: JSON.stringify({ answer, answerType, isPublic: true })` (line 141-143). This means "Yes", "No", and "No comment" are stored as the answer text in the database.

**Verification of stated behavior:** The i18n keys for button labels exist (`quickYes`, `quickNo`, `quickNoComment`) but there are no i18n keys for the answer *content*. The button labels are displayed in Korean when locale is "ko", but clicking them produces English answer text.

**Fix:** Add i18n keys for answer content and use them in the `handleAnswer` calls.

---

## V-2: Chat widget provider error messages may leak API details [MEDIUM/MEDIUM]

**File:** `src/lib/plugins/chat-widget/providers.ts:101,134-135,202`

**Evidence:** The provider `stream()` and `chatWithTools()` methods include the full API response body in thrown errors:

- OpenAI stream (line 101): `throw new Error(`OpenAI API error ${response.status}: ${text}`)`
- OpenAI chatWithTools (line 134-135): same pattern
- Claude stream (line 202): `throw new Error(`Claude API error ${response.status}: ${text}`)`

The `${text}` variable contains the full response body from the API provider. These errors propagate through the chat route handler to the client.

**Verification needed:** The chat route handler (`src/app/api/v1/plugins/chat-widget/chat/route.ts`) catches these errors. Need to verify whether the raw error message is sanitized before being sent to the client.

**Fix:** Strip the response body from thrown errors and only include the HTTP status code. Log the full response server-side.

---

## Verifier Findings (carried/deferred)

### V-CARRIED-1: Encryption plaintext fallback — MEDIUM/MEDIUM, carried from DEFER-39
