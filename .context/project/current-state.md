# Current State

Last updated: 2026-03-08

## Shipped and deployed

- Commit `6951d46` is deployed on `oj-demo.atik.kr`.
- Admin system settings now support a default timezone in addition to the site title and description.
- Rendered timestamps now use the configured timezone on student/admin submission pages, admin user pages, and group assignment schedule views.
- Local verification passed for the timezone rollout with `npx tsc --noEmit`, `npm run build`, and `npm run test:e2e -- --grep "@smoke"`.
- Remote deployment verification confirmed `online-judge.service` and `online-judge-worker.service` are active, the public login page returns HTTP 200, and the on-host `system_settings` table includes `time_zone`.

## Locally verified, not yet deployed

- The `dashboard-rendering-audit-and-editor-upgrades` plan is complete in the local repository.
- Local main now includes the instructor assignment status board and scoped assignment submission drill-down, admin login logs, theme switching, CodeMirror-based code surfaces, markdown-safe problem rendering, source-draft recovery, mixed submission ID support, and guarded user/problem delete flows.
- Local main also includes group membership management, assignment create/edit/delete flows, student assignment detail pages, assignment-linked submission paths, assignment-context enforcement from the generic problem view, synchronized problem-group access for assignment problems, and safety blocks on removing members, deleting assignments, or deleting groups after assignment submissions exist.
- Local main now also includes broader audit/event logging: append-only `audit_events`, an admin audit-log dashboard with request-context visibility, system-actor rendering, resource-ID search, and mutation coverage for settings, user-management, problems, groups, memberships, assignments, submissions, judge updates, profile edits, and password changes.
- Local verification passed on 2026-03-08 with directory TypeScript diagnostics, `npm run lint`, `npm run build`, targeted Playwright for `tests/e2e/admin-audit-logs.spec.ts tests/e2e/group-assignment-management.spec.ts tests/e2e/task12-destructive-actions.spec.ts`, and full `npx playwright test`.

## Operational notes

- The demo host runs from `/home/ubuntu/online-judge`.
- The demo host must keep `JUDGE_POLL_URL=http://localhost:3000/api/v1/judge/poll`.
- The demo host still requires `JUDGE_DISABLE_CUSTOM_SECCOMP=1` because the custom seccomp profile is rejected on its Docker/kernel combination.
- Do not assume the long-lived demo host still accepts the seeded `admin` / `admin123` credentials unless the instance was freshly reset and reseeded.

## Documentation sync points

- `README.md` now distinguishes the last confirmed demo deployment from the newer locally verified dashboard/audit/editor upgrades.
- `README.md` and `docs/review.md` now also treat assignment CRUD and group membership management as locally verified but not yet deployed.
- `README.md`, `.context/development/open-workstreams.md`, and `docs/review.md` now treat broader audit/event logging as locally complete rather than open roadmap work.
- `docs/deployment.md` now captures the deployed revision, the `time_zone` schema requirement, and the shared-host credential/env caveats.
- `docs/review.md` now records the timezone rollout plus the newer locally verified-but-undeployed dashboard/audit/editor batch.
- `AGENTS.md` already reflects that `system_settings` carries title, description, and timezone overrides.
