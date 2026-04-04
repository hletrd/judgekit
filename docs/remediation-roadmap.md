# JudgeKit Remediation Roadmap

_Last updated: 2026-04-04_

## Purpose

This roadmap translates the current project review into an execution plan for making JudgeKit safe and credible for:

1. recruiting coding tests
2. student assignments and exams
3. programming contests

## Executive summary

JudgeKit has strong product breadth and promising architecture, but the current branch is **not yet suitable for high-stakes use**.

### Current blockers
- Plaintext credential handling in multiple places
- Broken private file authorization/caching policy
- Fake transaction helper used in critical grading paths
- Async rate-limit misuse
- Large TypeScript failure count
- Failing security/unit test baseline
- AI defaults too permissive for exam/recruiting/contest contexts

### Recommended rollout order
1. Homework / low-stakes assignments
2. Internal recruiting pilot
3. Internal contest
4. Formal exam
5. High-stakes/public contest

---

# Milestones

## M1 — Stop-ship security + integrity
Focus: eliminate critical security and data-integrity risks.

## M2 — Build health + test health
Focus: restore engineering trust by making typecheck/tests clean and enforceable.

## M3 — Product modes
Focus: introduce hard behavioral boundaries for homework / exam / contest / recruiting.

## M4 — Recruiting mode
Focus: candidate-safe UX, privacy boundaries, and hiring-mode restrictions.

## M5 — Exam/contest hardening
Focus: reliability, anti-cheat honesty, similarity behavior, ops readiness.

## M6 — Ops + docs cleanup
Focus: deployment truthfulness, documentation alignment, production readiness polish.

---

# Issue backlog

## 1. Stop storing and listing admin API keys in plaintext
**Labels:** `security`, `backend`, `auth`, `api`, `p0`  
**Severity:** Critical  
**Estimate:** M  
**Owner:** Security + Backend  
**Milestone:** M1

### Problem
Admin API keys are currently stored and listed in plaintext.

### Acceptance criteria
- [ ] Replace plaintext API key storage with hashed storage
- [ ] Show raw key only once at creation time
- [ ] Remove raw key from list/read APIs and admin UI
- [ ] Keep key prefix for display/search only
- [ ] Add rotation/revoke flow
- [ ] Add regression tests for auth and key listing

---

## 2. Encrypt LLM/provider secrets at rest in plugin config
**Labels:** `security`, `backend`, `plugins`, `ai`, `p0`  
**Severity:** Critical  
**Estimate:** M  
**Owner:** Security + Backend  
**Milestone:** M1

### Problem
Provider secrets for OpenAI / Claude / Gemini are stored too directly in plugin config.

### Acceptance criteria
- [ ] Encrypt provider API keys before DB persistence
- [ ] Decrypt only at point-of-use
- [ ] Keep logs/audit payloads redacted
- [ ] Add migration path for existing plaintext values
- [ ] Add tests proving read APIs do not expose raw credentials

---

## 3. Fix uploaded file authorization and private-cache policy
**Labels:** `security`, `backend`, `files`, `p0`  
**Severity:** Critical  
**Estimate:** M  
**Owner:** Security + Backend  
**Milestone:** M1

### Problem
Authenticated users can fetch uploaded files without sufficient authorization checks. Private files also use overly-public cache headers.

### Acceptance criteria
- [ ] Enforce owner/admin/explicit permission checks on `GET /api/v1/files/[id]`
- [ ] Define separate public vs private file policies
- [ ] Remove `public, immutable` caching from private files
- [ ] Add regression tests for IDOR cases

---

## 4. Replace fake execTransaction helper with real PostgreSQL transactions
**Labels:** `correctness`, `backend`, `db`, `judge`, `p0`  
**Severity:** Critical  
**Estimate:** L  
**Owner:** Backend Platform  
**Milestone:** M1

### Problem
`execTransaction` is a passthrough while being used in multi-step write flows.

### Acceptance criteria
- [ ] Implement real DB transaction support
- [ ] Audit all `execTransaction(...)` call sites
- [ ] Prioritize judge result finalization, rejudge, contest invite/access, bulk mutations
- [ ] Add failure-path tests proving no partial writes occur

---

## 5. Fix all unawaited server-action/chat rate-limit calls
**Labels:** `bug`, `backend`, `rate-limit`, `p0`  
**Severity:** High  
**Estimate:** S  
**Owner:** Backend  
**Milestone:** M1

### Problem
`checkServerActionRateLimit(...)` is async but used without `await` in multiple places.

### Acceptance criteria
- [ ] Add missing `await` to all call sites
- [ ] Add regression tests for blocked and allowed flows
- [ ] Add lint/review guard for future misuse

---

## 6. Get TypeScript typecheck to zero and make it blocking
**Labels:** `tech-debt`, `build`, `typescript`, `p0`  
**Severity:** Critical  
**Estimate:** L  
**Owner:** Backend Platform  
**Milestone:** M2

### Problem
`npx tsc --noEmit` currently fails heavily.

### Acceptance criteria
- [ ] Reduce TypeScript errors to zero
- [ ] Triage by category: DB typing, routes, tests, stale assumptions
- [ ] Make `tsc --noEmit` a required CI gate

---

## 7. Repair failing security/unit test harness and make security suite blocking
**Labels:** `test`, `security`, `ci`, `p0`  
**Severity:** High  
**Estimate:** M  
**Owner:** Backend + Security  
**Milestone:** M2

### Problem
Security-focused tests currently fail due to mocking/bootstrap issues.

### Acceptance criteria
- [ ] Fix DB mocking/bootstrap issues
- [ ] Repair `api-rate-limit` and `rate-limit` tests
- [ ] Remove unnecessary runtime DB coupling from security tests
- [ ] Make security suite required in CI

---

## 8. Introduce explicit product modes: homework, exam, contest, recruiting
**Labels:** `feature`, `product`, `policy`, `p1`  
**Severity:** High  
**Estimate:** L  
**Owner:** Product + Full-stack  
**Milestone:** M3

### Problem
The platform serves multiple high-stakes use cases without hard boundaries.

### Acceptance criteria
- [ ] Add explicit mode config/model
- [ ] Homework mode
- [ ] Exam mode
- [ ] Contest mode
- [ ] Recruiting mode
- [ ] Centralize behavior toggles behind mode policy

---

## 9. Disable AI assistant by default for exam, contest, and recruiting flows
**Labels:** `security`, `fairness`, `ai`, `product`, `p1`  
**Severity:** High  
**Estimate:** M  
**Owner:** Product + Backend  
**Milestone:** M3

### Problem
AI help is too permissive for high-stakes use.

### Acceptance criteria
- [ ] AI off by default in exam mode
- [ ] AI off by default in contest mode
- [ ] AI off by default in recruiting mode
- [ ] Auto AI review disabled in those modes
- [ ] Explicit opt-in only for homework/practice

---

## 10. Restrict standalone compiler in exam and recruiting modes
**Labels:** `fairness`, `product`, `ui`, `p1`  
**Severity:** High  
**Estimate:** S  
**Owner:** Full-stack  
**Milestone:** M3

### Problem
The standalone compiler undermines controlled evaluation.

### Acceptance criteria
- [ ] Hide/disable compiler page in exam mode
- [ ] Hide/disable compiler page in recruiting mode
- [ ] Add admin override if needed

---

## 11. Reframe anti-cheat as telemetry, not strong enforcement
**Labels:** `security`, `product`, `anti-cheat`, `p1`  
**Severity:** Medium  
**Estimate:** S  
**Owner:** Product  
**Milestone:** M5

### Problem
Current anti-cheat is mostly client-side telemetry and should not be represented as strong enforcement.

### Acceptance criteria
- [ ] Update instructor/admin UI copy
- [ ] Add limitation notice
- [ ] Avoid overstating evidentiary strength

---

## 12. Make similarity checking explicit, scalable, and non-silent
**Labels:** `correctness`, `anti-cheat`, `contest`, `p1`  
**Severity:** High  
**Estimate:** M  
**Owner:** Backend  
**Milestone:** M5

### Problem
Similarity checking can silently degrade or skip usefulness at larger scale.

### Acceptance criteria
- [ ] Never silently return “no issues” when the job did not meaningfully run
- [ ] Expose status values: `not_run`, `queued`, `running`, `completed`, `timed_out`, `partial`
- [ ] Add admin explanation for skipped/partial runs
- [ ] Add performance/load tests

---

## 13. Create a dedicated candidate/recruiting mode UX
**Labels:** `feature`, `recruiting`, `ux`, `p1`  
**Severity:** High  
**Estimate:** M  
**Owner:** Product + Full-stack  
**Milestone:** M4

### Problem
Current UX feels academic/classroom-oriented and is not ideal for candidates.

### Acceptance criteria
- [ ] Minimal candidate dashboard
- [ ] Remove school/group-centric terminology where not needed
- [ ] Present only relevant tasks/languages
- [ ] Hide academic admin noise
- [ ] Add recruiting smoke E2E flow

---

## 14. Harden judge worker trust boundary and container control model
**Labels:** `security`, `ops`, `judge`, `docker`, `p1`  
**Severity:** Critical  
**Estimate:** L  
**Owner:** Security + SRE + Backend  
**Milestone:** M5

### Problem
The judge path has a large blast radius and needs hardening.

### Acceptance criteria
- [ ] Review app Docker API scope and reduce it where possible
- [ ] Review worker privileges/capabilities
- [ ] Document threat model for compromised app / worker / malicious submission
- [ ] Add judge secret rotation guidance
- [ ] Add production hardening checklist

---

## 15. Add operational readiness checks for contest/exam use
**Labels:** `ops`, `contest`, `exam`, `reliability`, `p1`  
**Severity:** High  
**Estimate:** M  
**Owner:** SRE + Backend  
**Milestone:** M5

### Problem
High-stakes use needs proven reliability under load and failure.

### Acceptance criteria
- [ ] Load-test judge queue
- [ ] Test worker stale/reclaim behavior
- [ ] Test rejudge correctness
- [ ] Test leaderboard correctness under concurrent judging
- [ ] Write incident runbooks

---

## 16. Publish privacy/retention policy for chat logs, submissions, and anti-cheat events
**Labels:** `policy`, `privacy`, `recruiting`, `exam`, `p1`  
**Severity:** High  
**Estimate:** S  
**Owner:** Product + Security + Ops  
**Milestone:** M4

### Problem
Recruiting and exam contexts require explicit privacy boundaries and retention decisions.

### Acceptance criteria
- [ ] Define retention windows for submissions, chat logs, anti-cheat events, audit logs
- [ ] Define access boundaries by role
- [ ] Add candidate/student-facing notice where needed
- [ ] Add admin handling guidance

---

## 17. Reconcile documentation and runtime reality
**Labels:** `docs`, `trust`, `cleanup`, `p2`  
**Severity:** Medium  
**Estimate:** S  
**Owner:** Product + Backend  
**Milestone:** M6

### Problem
Counts/capabilities/runtime claims are drifting across README/docs/runtime.

### Acceptance criteria
- [ ] Reconcile language/image counts
- [ ] Reconcile runtime DB/deploy claims
- [ ] Add “known limitations” section
- [ ] Remove stale or misleading statements

---

# Dependency map

- #4 blocks #15
- #5 should finish before claiming rate-limit safety
- #6 and #7 are required before release credibility
- #8 blocks #9, #10, #13
- #14 supports #15
- #16 should complete before recruiting/exam rollout
- #17 should close before public rollout

---

# 30 / 60 / 90-day plan

## Days 0–30
Focus: stop-ship fixes

### Target outcomes
- No plaintext API key exposure
- No plaintext provider secret storage
- File auth bug fixed
- Rate-limit misuse fixed
- Security suite stabilized
- Transaction refactor started on grading-critical paths

---

## Days 31–60
Focus: engineering trust + safe product boundaries

### Target outcomes
- TypeScript at zero
- Security/unit suite green
- Product modes introduced
- AI defaults hardened
- Compiler restrictions implemented

---

## Days 61–90
Focus: pilot readiness

### Target outcomes
- Recruiting mode or homework mode ready for internal pilot
- Similarity behavior hardened
- Anti-cheat wording corrected
- Ops runbooks written
- Load/recovery tests performed
- Docs aligned with reality

---

# Go / no-go checklists

## Recruiting coding test
### Go only if:
- [ ] API keys are no longer stored/listed in plaintext
- [ ] provider secrets are encrypted at rest
- [ ] uploaded file auth bug is fixed
- [ ] TypeScript is clean
- [ ] security tests are green
- [ ] recruiting mode exists
- [ ] AI is disabled in recruiting mode
- [ ] compiler page is disabled or restricted in recruiting mode
- [ ] candidate privacy/retention policy is documented
- [ ] candidate UX is separated from classroom UX

### No-go if:
- [ ] candidates can access AI help
- [ ] private file access bug remains
- [ ] grading writes are not transactional
- [ ] typecheck still fails
- [ ] security suite still fails

---

## Student assignments / homework
### Go only if:
- [ ] stop-ship security fixes are complete
- [ ] judging flow is transactionally safe
- [ ] typecheck is clean
- [ ] assignment flows are regression tested
- [ ] AI policy is explicit

### No-go if:
- [ ] grading writes can partially fail
- [ ] private student data can leak across users
- [ ] production branch still has large build/test instability

---

## Formal exams
### Go only if:
- [ ] all assignment gates pass
- [ ] exam mode exists
- [ ] AI is disabled in exam mode
- [ ] compiler page is disabled in exam mode
- [ ] exam session timing logic is regression tested
- [ ] anti-cheat is presented as telemetry, not certainty
- [ ] operations runbook exists
- [ ] internal dry-run exam succeeded

### No-go if:
- [ ] students can still access AI help
- [ ] compiler page is accessible during exams
- [ ] deadline/session behavior is unproven
- [ ] admins may over-trust anti-cheat signals

---

## Programming contests
### Go only if:
- [ ] all exam-relevant integrity gates pass
- [ ] contest mode exists
- [ ] worker stale/reclaim recovery tested
- [ ] rejudge flow tested
- [ ] leaderboard correctness tested
- [ ] similarity status is explicit and non-silent
- [ ] load test passed at expected concurrency
- [ ] internal dry-run contest succeeded

### No-go if:
- [ ] judge finalization is not transaction-safe
- [ ] worker recovery is unproven
- [ ] similarity silently skips large contests
- [ ] leaderboard correctness is unproven under concurrency

---

# Recommended rollout order

1. Homework / low-stakes assignments
2. Internal recruiting pilot
3. Internal contest
4. Formal exam
5. High-stakes/public contest

---

# Project board suggestion

## Columns
- Backlog
- Ready
- In Progress
- Blocked
- In Review
- Done

## Ready first
- #1 API keys plaintext
- #2 provider secret encryption
- #3 file auth/cache
- #4 real transactions
- #5 await rate limits

## Then
- #6 typecheck zero
- #7 security test suite green

## Then
- #8 product modes
- #9 AI defaults
- #10 compiler restrictions

---

# Final recommendation

The highest-ROI path is:

- **short term:** make JudgeKit excellent for assignments/homework
- **medium term:** build a restricted recruiting mode
- **later:** harden for exams/contests after integrity and ops proof are in place
