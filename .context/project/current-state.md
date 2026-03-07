# Current State

Last updated: 2026-03-07

## Shipped and deployed

- Commit `6951d46` is deployed on `oj-demo.atik.kr`.
- Admin system settings now support a default timezone in addition to the site title and description.
- Rendered timestamps now use the configured timezone on student/admin submission pages, admin user pages, and group assignment schedule views.
- Local verification passed for the timezone rollout with `npx tsc --noEmit`, `npm run build`, and `npm run test:e2e -- --grep "@smoke"`.
- Remote deployment verification confirmed `online-judge.service` and `online-judge-worker.service` are active, the public login page returns HTTP 200, and the on-host `system_settings` table includes `time_zone`.

## Operational notes

- The demo host runs from `/home/ubuntu/online-judge`.
- The demo host must keep `JUDGE_POLL_URL=http://localhost:3000/api/v1/judge/poll`.
- The demo host still requires `JUDGE_DISABLE_CUSTOM_SECCOMP=1` because the custom seccomp profile is rejected on its Docker/kernel combination.
- Do not assume the long-lived demo host still accepts the seeded `admin` / `admin123` credentials unless the instance was freshly reset and reseeded.

## Documentation sync points

- `README.md` should describe the timezone-aware system settings behavior and the current deployed state.
- `docs/deployment.md` should mention the deployed revision, the `time_zone` schema requirement, and the seeded-credential caveat on the shared demo host.
- `docs/review.md` should list the timezone rollout in the status update section.
- `AGENTS.md` should reflect that `system_settings` now carries title, description, and timezone overrides.
