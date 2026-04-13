# Master review backlog — 2026-04-13 (`e1051e9`)

## Source review set read in this pass
- `.context/reviews/comprehensive-code-review-2026-04-13-e1051e9.md`
- all prior review artifacts listed in `plans/README.md`
- archive status notes under `plans/archive/`

## Conclusion from the full review set
After re-reading the available reviews and comparing them against:
- archived plan artifacts in `plans/archive/`
- repository history through `e1051e9`
- current code at `HEAD`

I found **no additional still-open work** in the older archived review set beyond what is already captured by the latest comprehensive review at `e1051e9`.

In other words:
- older reviews remain **implemented**, **superseded**, or **historical**
- the still-open repository-local work is the set of findings in `.context/reviews/comprehensive-code-review-2026-04-13-e1051e9.md`

## Open finding inventory

### High
1. Anti-cheat monitoring is mounted on the contest landing page instead of the actual problem-solving page.
2. The student-facing anti-cheat POST endpoint accepts privileged/internal event types (`ip_change`, `code_similarity`) that contestants can forge.
3. Residual built-in-`student` branches still allow custom learner roles to bypass assignment-context enforcement.

### Medium
4. Contest access codes are not unique.
5. Rejoining through an existing contest access token does not repair a missing enrollment row.
6. Contest analytics/export authorization is inconsistent with the page-level authorization model.
7. Lecture-mode submission stats are effectively dead code, and their data source is not assignment-scoped.
8. Chat-widget submission history ignores assignment context and mixes reused-problem histories.

### Likely / manual validation target
9. Several `SelectValue` call sites still violate the project select contract and likely show raw values or behave poorly under Turbopack.

## Plan breakdown
- `2026-04-13-e1051e9-contest-integrity-plan.md`
  - covers findings 1, 2, and 7
- `2026-04-13-e1051e9-role-and-authorization-consistency-plan.md`
  - covers findings 3 and 6
- `2026-04-13-e1051e9-access-code-and-chat-scope-plan.md`
  - covers findings 4, 5, and 8
- `2026-04-13-e1051e9-select-contract-plan.md`
  - covers finding 9

## Recommended execution order
1. Contest integrity path (`anti-cheat` mount + endpoint trust boundary)
2. Role / authorization consistency
3. Access code integrity + chat assignment scoping
4. Select contract sweep

## Acceptance condition for closing this backlog
This master backlog can be archived only when:
- each child plan is either implemented and verified, or explicitly accepted/deferred by the owner
- `plans/README.md` is updated to mark the associated review artifact as archived/implemented or accepted current posture
