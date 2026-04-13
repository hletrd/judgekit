# Select contract sweep plan — 2026-04-13 (`e1051e9`)

## Source finding
- LIKELY: several `SelectValue` call sites still violate the project select contract and likely show raw IDs/keys or behave poorly under Turbopack

## Goal
Normalize all select controls to the repository’s documented `SelectValue` usage pattern so selected labels render predictably and do not rely on fragile inline expressions.

## Scope candidates from the review
Examples already identified:
- `src/components/contest/code-timeline-panel.tsx`
- `src/components/contest/recruiting-invitations-panel.tsx`
- `src/app/(dashboard)/dashboard/groups/[id]/group-members-manager.tsx`
- `src/app/(dashboard)/dashboard/problem-sets/_components/problem-set-form.tsx`
- any other current `<SelectValue />` or complex-inline-child call sites in `src/`

## Implementation slices

### Slice A — inventory and classify all `SelectValue` call sites
**Tasks**
- build a repo-wide inventory of `<SelectValue />` usage
- classify each call site as:
  - safe/static
  - empty/raw-value risk
  - complex-child/Turbopack risk

### Slice B — normalize risky call sites
**Tasks**
- replace empty `SelectValue` nodes with explicit selected-label rendering where labels already exist
- move complex inline/IIFE label derivation into simple variables before JSX
- ensure corresponding `SelectItem` entries provide labels consistently

### Slice C — add an implementation guard
**Tasks**
- add a repo-level implementation test that flags:
  - empty `SelectValue` in places that should render human labels
  - obvious IIFE/render-function child patterns
- keep false positives manageable by scoping the check to project conventions already documented in `AGENTS.md`

## Verification target
- component/manual verification for the known risky contest/group/problem-set selects
- implementation test proving the normalized patterns stay in place

## Risks
- low functional risk, but broad UI touch surface
- possible false-positive test noise if the implementation guard is too naive

## Completion criteria
- all currently risky `SelectValue` usages are normalized
- a repo-level guard exists to catch future regressions
