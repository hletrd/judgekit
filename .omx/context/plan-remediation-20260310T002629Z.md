## Task Statement

Work through the active plan backlog in the repository, fix the actionable open items, update plan-progress documents, and ship the work in verified, fine-grained signed commits.

## Desired Outcome

Land the next coherent remediation batch from the active plan set with code, tests, and plan-document updates all aligned.

## Known Facts / Evidence

- `.omx/plans/` is empty.
- Active unfinished work is tracked in `.context/development/open-workstreams.md`.
- `docs/review-plan.md` is the remediation ledger with many implemented items and a smaller unresolved backlog.
- Metis analysis points to `P1.8` unit-test expansion as the best bounded next batch.
- Missing direct unit coverage is centered on `src/lib/auth/permissions.ts`, `src/lib/security/rate-limit.ts`, `src/lib/security/api-rate-limit.ts`, and `src/lib/assignments/submissions.ts`.

## Constraints

- Do not disturb unrelated dirty-worktree changes.
- No destructive git operations.
- Commit only coherent batches with semantic gitmoji messages and GPG signing.
- Verify with diagnostics, unit tests, typecheck, lint, and build before claiming completion.

## Unknowns / Open Questions

- Whether any plan items are already implemented but not yet reflected in docs beyond the active `P1.8` slice.
- Whether committing plan-doc files with existing user edits should include only the relevant updated files in this batch.

## Likely Touchpoints

- `tests/unit/**/*`
- `src/lib/auth/permissions.ts`
- `src/lib/security/rate-limit.ts`
- `src/lib/security/api-rate-limit.ts`
- `src/lib/assignments/submissions.ts`
- `docs/review-plan.md`
- `.context/development/open-workstreams.md`
