# Current-head master backlog — reopened 2026-04-13

## Why this exists
The 2026-04-12 current-head follow-up plans were previously archived as **accepted current posture**. A newer user directive on 2026-04-13 explicitly overrides that acceptance and requires implementation work to resume.

## Source artifacts now driving execution
- `.context/reviews/comprehensive-code-review-2026-04-13-current-head.md`
- `.context/reviews/multi-perspective-review-2026-04-12-current-head.md`
- `.context/reviews/adversarial-security-review-2026-04-12-current-head.md`
- `.omx/plans/prd-2026-04-12-current-head-followup.md`
- `.omx/plans/test-spec-2026-04-12-current-head-followup.md`

## Reopened backlog

### 1. Custom-role and role-model correctness
- user CRUD still rejects custom roles in multiple API/server-action flows
- page-level contest/group entrypoints still cast sessions to built-in-only roles
- contest/group access helpers still branch on built-in roles in places
- **Status:** completed 2026-04-13
- **Progress note:** user CRUD now accepts validated custom-role names in the API/server-action flows, built-in-only page assertions were removed from the affected contest/group pages, and contest discovery now uses capability-aware branching for custom roles.

### 2. Chat transcript integrity and admin review correctness
- client can suppress or forge logged chat history
- admin chat-log session query is invalid on PostgreSQL and uses wrong preview semantics
- chat tool assignment metadata still needs an access-control audit/fix
- **Status:** open

### 3. Realtime / deployment / worker runtime correctness
- shared SSE coordination leaks slots on one-shot terminal responses
- production upload blobs are not persisted across container replacement
- shipped docker-proxy permissions do not match documented admin image-management behavior
- current-head high-stakes/runtime posture docs/env examples need truth sync
- **Status:** open

### 4. Similarity-engine parity
- TS fallback and Rust sidecar normalize code differently
- inline `#` comments still evade normalization in Python/shell-like languages
- **Status:** open

### 5. Higher-assurance current-head follow-up workstreams
- recruiting identity assurance beyond shared secrets
- stronger event-integrity/runtime enforcement posture
- anti-cheat evidence-model tightening
- sensitive-data governance tightening
- worker-boundary operational containment improvements
- instructor/admin workflow simplification where still actionable
- **Status:** open; implement concrete code/docs hardening where possible during the slices below

## Execution ordering
1. Plan/doc reopening
2. Custom-role slice
3. Chat/admin-log slice
4. Realtime/upload/docker-runtime slice
5. Similarity/docs/final closure slice

## Verification bar
- `pnpm -s tsc --noEmit`
- targeted Vitest for each slice
- targeted eslint on changed files
- broader verification before closure
