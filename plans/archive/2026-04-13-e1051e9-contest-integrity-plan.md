# Contest integrity and lecture telemetry plan — 2026-04-13 (`e1051e9`)

## Source findings
- HIGH: anti-cheat monitoring is mounted on the contest landing page instead of the actual problem-solving page
- HIGH: student-facing anti-cheat POST endpoint accepts privileged/internal event types
- MEDIUM: lecture-mode submission stats are dead/unwired and currently use an unscoped data source

## Goals
1. Ensure contestant telemetry is active on the page where contestants actually solve problems.
2. Ensure contestants cannot forge server-originated anti-cheat evidence classes.
3. Either wire lecture-mode stats correctly or explicitly constrain/hide the feature until it is correct.

## Implementation slices

### Slice A — move or replicate contest telemetry at the actual solving surface
**Primary files**
- `src/app/(dashboard)/dashboard/problems/[id]/page.tsx`
- `src/app/(dashboard)/dashboard/contests/[assignmentId]/page.tsx`
- `src/components/exam/anti-cheat-monitor.tsx`
- possibly `src/app/(dashboard)/dashboard/problems/[id]/problem-lecture-wrapper.tsx`

**Tasks**
- decide the authoritative mount point for contest telemetry:
  - preferred: problem-solving page when `assignmentContext` exists and anti-cheat is enabled
  - acceptable alternative: assignment-scoped layout-level mount shared across contest and problem pages
- verify the chosen mount preserves telemetry across navigation from contest overview → problem page
- ensure telemetry does not double-mount when both overview and problem pages render in the same navigation path

**Verification target**
- component/integration test proving the monitor mounts in the contest problem flow
- E2E test: open contest problem page, trigger `copy`, `blur`, or `tab_switch`, then verify those events appear via `/api/v1/contests/[assignmentId]/anti-cheat`

### Slice B — split client-allowed anti-cheat event types from server-only event types
**Primary files**
- `src/app/api/v1/contests/[assignmentId]/anti-cheat/route.ts`
- `src/lib/assignments/code-similarity.ts`
- any internal paths that write `ip_change` / `code_similarity`

**Tasks**
- define a client-allowed enum for the public POST route
- reject server-only event types (`ip_change`, `code_similarity`) on the public endpoint
- if needed, add an internal-only insertion helper for backend-generated anti-cheat events
- keep heartbeat client-originated but separate from server-generated evidence tiers

**Verification target**
- route tests:
  - allowed client event types still accepted
  - `code_similarity` and `ip_change` rejected from contestant POSTs
  - backend code-similarity insertion path still works

### Slice C — fix or explicitly fence lecture-mode submission stats
**Primary files**
- `src/app/(dashboard)/layout.tsx`
- `src/components/lecture/lecture-toolbar.tsx`
- `src/app/(dashboard)/dashboard/problems/[id]/problem-lecture-wrapper.tsx`
- `src/components/lecture/submission-overview.tsx`
- possibly a new assignment-scoped aggregate endpoint

**Tasks**
- wire `onToggleStats` through the mounted toolbar and wrapper state, or remove the dead control path
- change the stats data source so it respects `assignmentId` when the problem is viewed through an assignment/contest
- replace “latest 100 submissions” pseudo-stats with either:
  - an assignment-scoped aggregate endpoint, or
  - a clearly-labeled bounded recent-activity panel

**Verification target**
- component test for the stats toggle path
- integration test for assignment-scoped stats correctness
- manual UX check in lecture mode

## Risks
- duplicate telemetry rows if the monitor is mounted in more than one place
- breaking existing dashboards if anti-cheat event-type filtering is too aggressive
- lecture-mode state coupling between global layout and per-problem wrapper

## Completion criteria
- contest telemetry is active on the problem-solving page
- contestants cannot write privileged anti-cheat event classes through the public POST route
- lecture-mode stats are either correctly wired and scoped or intentionally hidden/deferred
