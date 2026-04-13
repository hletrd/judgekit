# Review planning index — 2026-04-13

This directory contains **planning only**. No implementation is included here.

## Goal
- read the review artifacts under `.context/reviews/`
- separate already-implemented or superseded review lines from still-open criticism
- keep finished plan artifacts in `plans/archive/`
- keep only the currently actionable planning backlog in `plans/open/`

## Directory layout
- `plans/open/` — currently actionable implementation plans
- `plans/archive/` — finished or historical plan artifacts plus review-status notes

## Status legend
- **Open plan** — still actionable; execution should start by revalidating the cited files against `HEAD`
- **Archived (implemented)** — later repo evidence or archived plan artifacts show the review line was already completed
- **Archived (superseded)** — an older review is covered by later review/plan artifacts and should not get a fresh implementation plan
- **Historical** — old review/archive context retained for reference only
- **Archived (accepted current posture)** — remaining gaps were explicitly accepted by the user/owner for now, so the plan is closed without further implementation

## Current review inventory and plan mapping

| Review artifact | Status | Plan / archive note | Why |
| --- | --- | --- | --- |
| `.context/reviews/comprehensive-code-review-2026-04-07.md` | Archived (superseded) | `plans/archive/2026-04-12-review-status.md` | Older broad review; later 2026-04-09/10 reviews plus archived remediation plans cover the same surfaces with fresher evidence |
| `.context/reviews/comprehensive-code-review-2026-04-09-worktree.md` | Archived (implemented) | `plans/archive/2026-04-12-review-status.md` | Its concrete findings were already remediated and previously archived |
| `.context/reviews/comprehensive-code-review-2026-04-09.md` | Archived (implemented) | `plans/archive/2026-04-11-comprehensive-code-review-2026-04-09-plan.md` | Archived plan records completion at `HEAD` |
| `.context/reviews/comprehensive-code-review-2026-04-10.md` | Archived (implemented) | `plans/archive/2026-04-11-comprehensive-code-review-2026-04-10-plan.md` | Archived plan records completion at `HEAD` |
| `.context/reviews/comprehensive-review-2026-04-09.md` | Archived (implemented) | `plans/archive/2026-04-11-comprehensive-review-2026-04-09-plan.md` | Archived plan records completion at `HEAD` |
| `.context/reviews/comprehensive-security-review-2026-04-09.md` | Archived (superseded) | `plans/archive/2026-04-12-review-status.md` | Superseded by the fresher 2026-04-10 security review and later remediation evidence |
| `.context/reviews/comprehensive-security-review-2026-04-10.md` | Archived (implemented) | `plans/archive/2026-04-12-review-status.md` | The review itself includes a remediation addendum saying actionable findings were addressed |
| `.context/reviews/deep-code-review-2026-04-12.md` | Archived (implemented) | `plans/archive/2026-04-12-deep-code-review-remediation-plan.md` | Archived remediation plan records completion |
| `.context/reviews/deep-code-review-2026-04-12-post-remediation.md` | Archived (implemented) | `plans/archive/2026-04-12-post-remediation-review-plan.md` | Archived follow-up plan records completion |
| `.context/reviews/multi-perspective-review-2026-04-12.md` | Archived (implemented) | `plans/archive/2026-04-12-multi-perspective-readiness-plan.md` | The 2026-04-12 multi-perspective remediation slices were implemented and pushed on 2026-04-12 |
| `.context/reviews/adversarial-security-review-2026-04-12.md` | Archived (implemented) | `plans/archive/2026-04-12-adversarial-security-plan.md` | The 2026-04-12 adversarial-security remediation slices were implemented and pushed on 2026-04-12 |
| `.context/reviews/multi-perspective-review-2026-04-12-current-head.md` | Archived (accepted current posture) | `plans/archive/2026-04-12-current-head-multi-perspective-plan.md` | Current-HEAD follow-up gaps were explicitly accepted for now by the user/owner on 2026-04-13 |
| `.context/reviews/adversarial-security-review-2026-04-12-current-head.md` | Archived (implemented/revalidated) | `plans/archive/2026-04-13-current-head-remediation-plan.md` | Repository-local follow-up gaps were closed or reduced to explicit external prerequisites during the 2026-04-13 remediation pass |
| `.context/reviews/comprehensive-code-review-2026-04-13-current-head.md` | Archived (implemented/revalidated) | `plans/archive/2026-04-13-current-head-remediation-plan.md` | Its actionable repository-local findings were implemented during the 2026-04-13 remediation pass |
| `.context/reviews/comprehensive-code-review-2026-04-13-e1051e9.md` | Open plan | `plans/open/2026-04-13-e1051e9-master-review-backlog.md` + child plans | Latest full review against `e1051e9`; still-open repository-local findings remain and need fresh implementation planning |
| `.context/reviews/_archive/*` | Historical | source archive | Already archived review context only |

## Currently actionable plan set
- `plans/open/2026-04-13-e1051e9-master-review-backlog.md`
- `plans/open/2026-04-13-e1051e9-contest-integrity-plan.md`
- `plans/open/2026-04-13-e1051e9-role-and-authorization-consistency-plan.md`
- `plans/open/2026-04-13-e1051e9-access-code-and-chat-scope-plan.md`
- `plans/open/2026-04-13-e1051e9-select-contract-plan.md`

## Archival note for this pass
No additional active plan files needed moving into `plans/archive/` during this planning pass.
All previously completed review plans were already archived before this run; this pass adds a new open plan set for the latest comprehensive review only.
