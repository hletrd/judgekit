# Access-code integrity and chat assignment-scope plan — 2026-04-13 (`e1051e9`)

## Source findings
- MEDIUM: contest access codes are not unique
- MEDIUM: rejoining via an existing contest access token does not repair a missing enrollment row
- MEDIUM: chat-widget submission history ignores assignment context and mixes reused-problem histories

## Goals
1. Make contest access codes unambiguous and collision-safe.
2. Make contest rejoin idempotent for both token and enrollment state.
3. Ensure chat assistance uses the active assignment context when a problem is reused.

## Implementation slices

### Slice A — enforce uniqueness for contest access codes
**Primary files**
- `src/lib/assignments/access-codes.ts`
- `src/lib/db/schema.pg.ts`
- matching migration files under `drizzle/` / runtime schema path
- `src/app/api/v1/contests/[assignmentId]/access-code/route.ts`

**Tasks**
- add a unique constraint/index for `assignments.access_code`
- update code generation to retry on unique-constraint collision
- decide how to handle any future manual/custom code path (reject duplicate code explicitly)
- add migration safety notes if existing duplicate rows are theoretically possible

**Verification target**
- DB-backed test for duplicate-code rejection / retry behavior
- route test for deterministic response on collision

### Slice B — repair enrollment drift on repeated contest join
**Primary files**
- `src/lib/assignments/access-codes.ts`
- `src/app/api/v1/contests/join/route.ts`
- any UI copy that currently treats “alreadyEnrolled” as authoritative enrollment truth

**Tasks**
- change the existing-token path so it verifies and recreates the enrollment row if missing
- clarify response semantics (`alreadyRedeemed` vs `alreadyEnrolled`) if necessary
- make the join path fully idempotent for both token and group enrollment state

**Verification target**
- integration test: token exists + enrollment missing → join repairs enrollment and returns success

### Slice C — scope chat submission history by assignment when available
**Primary files**
- `src/lib/plugins/chat-widget/chat-widget.tsx`
- `src/lib/plugins/chat-widget/tools.ts`
- possibly `src/app/api/v1/plugins/chat-widget/chat/route.ts`

**Tasks**
- update `get_submission_history` to filter by `assignmentId` when the client provides one
- keep fallback to problem-wide history only when there is truly no assignment context
- confirm tool output remains compact and model-friendly after adding the extra filter

**Verification target**
- unit test reusing the same problem in two assignments and proving only the active assignment’s submissions are returned
- optional E2E/route smoke test for chat context on a reused problem

## Risks
- migration churn around `assignments.access_code`
- subtle join semantics/UI copy drift if the response fields are renamed
- chat assistant behavior changes for users who previously relied on blended problem history

## Completion criteria
- access-code lookup is collision-safe and deterministic
- rejoining repairs missing enrollment rows
- chat submission history respects assignment context when it exists
