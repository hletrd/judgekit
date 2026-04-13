# Role and authorization consistency plan — 2026-04-13 (`e1051e9`)

## Source findings
- HIGH: residual built-in-`student` branches still let custom learner roles bypass assignment-context enforcement
- MEDIUM: contest analytics/export authorization is inconsistent with page-level authorization

## Goals
1. Remove built-in-role branching where capability- or policy-based checks are required.
2. Ensure page-level access and API-level access enforce the same visibility model.

## Implementation slices

### Slice A — replace learner-only `student` branches with policy-driven checks
**Primary files**
- `src/app/(dashboard)/dashboard/problems/[id]/page.tsx`
- `src/app/api/v1/submissions/route.ts`
- `src/app/api/v1/code-snapshots/route.ts`
- `src/components/layout/app-sidebar.tsx`
- shared role helpers under `src/lib/security/constants.ts`, `src/lib/auth/permissions.ts`, `src/lib/assignments/submissions.ts`

**Tasks**
- define the intended rule explicitly (for example: users without elevated contest/group visibility must supply assignment context when one exists)
- centralize that rule in a helper instead of scattered `role === "student"` checks
- update problem page assignment-choice logic to use that helper
- update submission creation and code-snapshot creation to use the same helper
- audit sidebar/platform-mode visibility logic for built-in-role assumptions that should instead be capability-driven

**Verification target**
- unit tests for the helper and the submission/code-snapshot gates
- custom-role integration/E2E scenario:
  - create custom learner-like role
  - access assignment-scoped problem
  - verify assignment context is still required

### Slice B — unify analytics/export access with the visible page policy
**Primary files**
- `src/app/(dashboard)/dashboard/contests/[assignmentId]/analytics/page.tsx`
- `src/app/api/v1/contests/[assignmentId]/analytics/route.ts`
- `src/app/api/v1/contests/[assignmentId]/export/route.ts`
- `src/lib/assignments/submissions.ts`
- `src/lib/assignments/contests.ts`

**Tasks**
- pick one authoritative permission model for viewing analytics/export:
  - either `canViewAssignmentSubmissions(...)`
  - or a new explicit contest analytics/export capability helper
- apply the same helper to both page route and API routes
- confirm custom roles with `assignments.view_status` and/or `submissions.view_all` behave consistently

**Verification target**
- route tests for analytics/export under:
  - manager/instructor
  - custom review role with visibility capability
  - ordinary contestant
- page/API parity tests to ensure pages that render can also load their backing API data

## Risks
- unintentionally widening access if helper design is too permissive
- unintentionally narrowing access for legitimate custom reviewer roles if analytics/export stay manager-only

## Completion criteria
- no remaining critical learner-path checks depend on the literal built-in role `student`
- contest analytics/export page and APIs enforce the same role/capability logic
