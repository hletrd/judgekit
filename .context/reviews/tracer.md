# Tracer Review — RPF Cycle 29

**Date:** 2026-04-23
**Reviewer:** tracer
**Base commit:** a51772ae

## Previously Fixed Items (Verified)

- Code editor i18n: Fixed (commit 5c387c7b)
- Contest replay setInterval: Fixed (commit 9cc30d51)

## TR-1: Clarification quick-answer text flows from UI to database without i18n [MEDIUM/HIGH]

**Causal trace of the data flow:**

1. User clicks quick-answer button in `contest-clarifications.tsx:290-296`
2. `handleAnswer(id, "yes", "Yes")` is called (line 290)
3. `answerText` parameter is "Yes" (line 134: `const answer = answerText ?? answerDrafts[id] ?? ""`)
4. `apiFetch(...)` sends `body: JSON.stringify({ answer, answerType, isPublic: true })` to API (lines 136-143)
5. API route stores `answer: "Yes"` in the database
6. On subsequent page loads, `loadClarifications` fetches clarifications from the API (line 81)
7. The answer "Yes" is rendered in the UI (line 269: `{clarification.answer}`)

**Competing hypotheses for the English text:**

H1 (confirmed): The hardcoded "Yes"/"No"/"No comment" strings are simply missing i18n keys. The button labels use i18n, but the answer content passed to the API does not.

H2 (rejected): The answer text is overwritten by the server. Tracing the API call shows the client-sent `answer` is stored directly.

**Fix:** Add i18n keys for answer content and use them at the call sites on lines 290, 293, 296.

---

## TR-2: Chat widget provider error response body propagates to client [MEDIUM/MEDIUM]

**Causal trace of the data flow:**

1. Provider `stream()` or `chatWithTools()` fails (e.g., OpenAI returns 403)
2. Provider throws: `new Error(`OpenAI API error ${response.status}: ${text}`)` (line 101)
3. The `${text}` variable contains the full API response body (line 100: `const text = await response.text()`)
4. This error propagates up through the chat route handler
5. If the route handler doesn't sanitize the error message, it reaches the client

**Competing hypotheses for error leaking:**

H1 (likely): The chat route handler catches the error and may include `error.message` in the response, which contains the full API response body.

H2 (less likely): The chat route handler wraps all provider errors in generic messages before sending to the client.

**Fix:** Verify the chat route handler sanitizes provider errors. In the provider methods, strip the response body from thrown errors and only include the status code.

---

## Tracer Findings (carried/deferred)

### TR-CARRIED-1: Contest layout forced navigation — carried from DEFER-18
