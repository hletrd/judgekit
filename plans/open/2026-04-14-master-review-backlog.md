# Master review backlog — 2026-04-14

## Source review set read in this pass
- all current review artifacts under `.context/reviews/*.md`
- existing plan/archive notes under `plans/README.md` and `plans/archive/`
- current repository state at `HEAD` plus the latest current-head review artifacts

## Revalidation conclusion from the full review set
After re-reading the full review inventory and comparing it against the existing archive notes and the current repository state:

- the **older 2026-04-07 / 2026-04-09 / 2026-04-10 / 2026-04-12 broad review sets** remain **implemented**, **superseded**, or **historical** and do not need reopened implementation plans right now;
- the currently actionable work is concentrated in the **current-head review set**;
- several findings from `.context/reviews/comprehensive-code-review-2026-04-13-current-head.md` were already closed by later work and are **not** reopened here (for example production upload persistence, docker-proxy image-management support, TS/Rust similarity parity, inline `#` comment normalization, and the `get_assignment_info` access check);
- the remaining still-actionable criticism now clusters into four plan lanes below.

## Archival result of this planning pass
- `plans/open/` contained no active implementation plans before this pass, so **no additional open plan files needed to be moved to archive**.
- previously completed plan sets remain in `plans/archive/`.
- the old “no open plans” note is now superseded by the new 2026-04-14 open backlog below.

## Current actionable review drivers
Primary open drivers:
- `.context/reviews/multi-agent-comprehensive-review-2026-04-13-current-head.md`
- `.context/reviews/comprehensive-code-review-2026-04-13-current-head.md` (only the still-open / partially revalidated lines)
- `.context/reviews/adversarial-security-review-2026-04-12-current-head.md`
- `.context/reviews/multi-perspective-review-2026-04-12-current-head.md`

## Open backlog by workstream

### 1. Authorization and trusted-context hardening
**Plan:** `plans/open/2026-04-14-authorization-and-context-hardening-plan.md`
**Status:** in progress
**Progress note:** started implementation of the repo-local authorization lane; current work covers problem-set visibility scoping, contest code-snapshot and recruiting-invitation object checks, server-derived restricted assignment context, co-instructor/TA submission visibility, capability-aware lecture/submission privilege cleanup, and reduced anonymous recruiting-validation payloads.

Open review lines folded here:
- problem-set visibility leaks across instructors/groups
- contest code-snapshot object-level authorization gap
- recruiting-invitation assignment-scope authorization gap
- AI-assistant and standalone-compiler contest/exam bypass via omitted `assignmentId`
- assignment-submission visibility still ignoring `group_instructors`
- remaining built-in-role/capability mismatches in page/UI privilege logic
- recruiting-token validation metadata minimization

### 2. Judge runtime, worker coordination, and deployment hardening
**Plan:** `plans/open/2026-04-14-judge-runtime-and-deployment-hardening-plan.md`
**Status:** in progress
**Progress note:** started implementation of the runtime lane; current work refreshes claim timestamps during in-progress reports, clears worker ownership and decrements active task counts on terminal reports, aligns problem authoring/import limits with the worker’s real 1 GiB run-time cap, wires the similarity sidecar into Docker app services, tries Rust similarity before TypeScript large-contest bailout, validates `ngram_size > 0`, makes migration failure fatal, and updates checked-in nginx/systemd/docs toward the generated runtime truth.

Open review lines folded here:
- stale-claim timeout reclaiming legitimate long-running jobs
- `judge_workers.active_tasks` not released on terminal reports
- problem memory-limit mismatch between app and worker
- split-host runner/admin features pointing at a stopped local worker
- code-similarity sidecar not actually serving Docker production and not handling large contests
- deploy script continuing after migration failure
- nginx/systemd/deploy-doc truth drift
- shared judge token / worker trust-boundary hardening follow-up

### 3. Verification, E2E, and readiness evidence hardening
**Plan:** `plans/archive/2026-04-14-verification-and-readiness-plan.md`
**Status:** implemented and archived

Implemented:
- CI now runs integration, component, and coverage-threshold enforcement
- Playwright has explicit smoke/full profiles via `PLAYWRIGHT_PROFILE`
- Source-grep test inventory documented with baseline count and categorization
- Integration README corrected to describe PostgreSQL harness
- High-stakes validation matrix updated with concrete evidence expectations and CI lane
- Release readiness checklist updated with data governance gates

Deferred to external operational prerequisites:
- Student-submission E2E depth (requires live judge worker in CI)
- Worker lifecycle E2E (requires multi-instance test infrastructure)
- Load/failover validation (requires staging environment)

### 4. Privacy, governance, and high-stakes hardening
**Plan:** `plans/archive/2026-04-14-privacy-governance-and-high-stakes-plan.md`
**Status:** implemented and archived

Implemented:
- Anti-cheat detail double-encoding fixed (stores raw details directly)
- Chat completion status tracked (complete/partial/error distinction)
- Sanitized export mode (redacts passwords, tokens, keys) separated from full-fidelity backup
- Recruiting validation response minimized (uniform valid/invalid, no metadata leakage)
- Legal hold mechanism (`DATA_RETENTION_LEGAL_HOLD`) suspends automatic pruning
- Transcript access audit enhanced with break-glass trail
- Anti-cheat monitoring description added to i18n (en/ko) disclaiming telemetry as non-proof
- Data retention policy and transcript access policy docs created

Deferred to external operational prerequisites:
- Higher-assurance recruiting identity/re-entry (requires product decision on auth factor)
- Instructor/admin UX simplification (requires design pass)

## Recommended execution order
1. Authorization / trusted-context hardening
2. Judge runtime / deployment hardening
3. Verification and readiness hardening
4. Privacy / governance / high-stakes hardening

## Global acceptance condition for archiving this backlog
This backlog can move to `plans/archive/` only when:
- each child plan is either implemented and verified, or explicitly accepted/deferred by the owner,
- `plans/open/README.md` and `plans/README.md` are updated to reflect the new status,
- the current-head review set is either closed by code or reduced to explicit external prerequisites.
