# Open Workstreams

Last updated: 2026-03-09

The `dashboard-rendering-audit-and-editor-upgrades` batch is now locally verified and its plan docs are reconciled. The items below remain open outside that completed batch.

## Recently closed locally

- Assignment-aware submission validation, the group-scoped assignment board, and scoped instructor submission drill-down
- Login-event logging plus the admin login-log dashboard/navigation surface
- Theme switching, CodeMirror code surfaces, markdown rendering, draft recovery, mixed submission IDs, and guarded delete flows
- Group membership management plus assignment create/edit/delete flows, assignment-linked student detail pages, and submission guards tied to assignment schedules/history
- Broader audit/event logging across admin mutations, submission/judge lifecycle events, and the admin audit-log page
- GitHub Actions CI plus the operational-hardening baseline: `/api/health`, SQLite backup/restore scripts, and repo-managed backup timer artifacts
- Security/API hardening from the 2026-03-08 remediation plans: SQLite-backed rate limiting, CSRF mutation-route checks, env-gated Auth.js trusted-host handling with explicit auth-route validation, judge claim tokens, SQL-level problem pagination, and CSP-compatible removal of inline `style` props from key UI primitives
- Local Playwright smoke stability fixes: auto-apply `npm run db:push` before the test web server starts, disable local server reuse so stale schemas are not reused, clear the runtime admin's old submissions before each run, and align mutation-route E2E fetches with the new `X-Requested-With` CSRF requirement
- Remaining security follow-ups from the 2026-03-08 review set are now closed locally: exact `next-auth` pinning with an 8-hour JWT max age, invalidation-aware auth lookups for password/role resets, self-service username/email restrictions, a Zod source-code size cap, timing-equalized invalid logins, and run-phase seccomp hardening that fails closed instead of silently retrying without the custom profile

## Still open

- Additional language/runtime expansion work

## Safety note

- The demo host was reverified on 2026-03-08 after the classroom/audit rollout; future sessions should still verify the host again after any later deploy.
- Future sessions should isolate the next coherent batch before updating deployment-facing docs again.
