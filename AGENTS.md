# JudgeKit — Agent Guide

## Project Overview

JudgeKit is a secure online judge platform for programming assignments. Next.js 16 frontend + API, Rust judge worker, Docker-sandboxed execution, SQLite database.

## Key Directories

| Path | Purpose |
|------|---------|
| `src/` | Next.js app (App Router), components, lib, types |
| `judge-worker-rs/` | Rust judge worker (production) |
| `docker/` | Judge language Dockerfiles + seccomp profile |
| `scripts/` | Systemd services, deploy helpers, backup tools |
| `tests/` | Playwright E2E tests |
| `data/` | SQLite database (gitignored) |

## Adding a New Language

1. Add to `Language` union in `src/types/index.ts`
2. Add config in `src/lib/judge/languages.ts` (toolchain version, Docker image info, compile/run commands)
3. Add Rust enum variant in `judge-worker-rs/src/types.rs`
4. Add Rust config + match arm + test entry in `judge-worker-rs/src/languages.rs`
5. Create `docker/Dockerfile.judge-<name>`
6. Add A+B test solution in `tests/e2e/all-languages-judge.spec.ts`
7. Run `npm run languages:sync` to sync to database

## Build & Verify

```bash
npx tsc --noEmit                              # TypeScript check
npx vitest run                                # Unit tests
npx vitest run --config vitest.config.integration.ts  # Integration tests
cd judge-worker-rs && cargo test              # Rust tests
npx playwright test tests/e2e/               # E2E tests (needs PLAYWRIGHT_BASE_URL)
```

## Testing Rules (MANDATORY)

Every feature, fix, or enhancement MUST include appropriate tests. **No code is considered complete without tests.** Work that lacks tests will be rejected.

### Test Layers (ALL required per feature)

Every new feature MUST have tests across all applicable layers:

| Layer | Tool | Location | Purpose | Required? |
|-------|------|----------|---------|-----------|
| **Unit** | Vitest | `tests/unit/` | Pure functions, validators, utilities, scoring logic, data helpers | Always |
| **API / Mock** | Vitest | `tests/unit/api/` | Route handlers with mocked DB/auth, mock external deps | When API routes are added/changed |
| **Integration** | Vitest | `tests/integration/` | Cross-module interactions, real DB queries | When DB logic is complex |
| **E2E** | Playwright | `tests/e2e/` | Full user flows through the browser UI | Always for user-facing features |

### Per-Feature Test Checklist

For every feature, go through this checklist:

1. **Unit tests** — Test all pure logic (helpers, validators, scoring, data transforms) with known inputs/outputs. Mock DB and external dependencies. Cover both success and error paths.
2. **API / Mock tests** — Test route handlers with mocked auth and DB. Verify request validation, authorization checks, happy path responses, and error responses (401, 403, 404, 422).
3. **E2E tests** — Test the full user flow in a real browser. Navigate to the feature, interact with it, verify all sections render, verify navigation works. Test with both Korean and English locales where applicable.

### What to Test

- **New feature**: Unit tests for logic + API/mock tests for routes + E2E test for user flow (ALL three)
- **Bug fix**: Regression test that fails without the fix, passes with it
- **Refactor**: Existing tests must still pass; add tests if coverage gaps found
- **New language**: A+B solution in `tests/e2e/all-languages-judge.spec.ts` + Rust config test
- **New API route**: API test with auth/validation/happy-path/error cases + unit test for any helper functions
- **Validators**: Unit tests for valid/invalid inputs and edge cases
- **Scoring/contest logic**: Unit tests with known inputs and expected outputs
- **UI components**: E2E tests verifying rendering, interaction, and navigation

### Test Conventions

- Use factories from `tests/unit/support/factories.ts` for test data
- Mock external dependencies (DB, auth) in unit/API tests using `vi.mock()`
- E2E tests run against the test server (`oj-internal.maum.ai`), never production
- Name test files as `<module>.test.ts` (unit/API) or `<feature>.spec.ts` (E2E)
- Group related assertions in `describe` blocks
- Test both success and error paths
- Use `test.skip()` with clear reason for tests that depend on external state (e.g., "No contests available")

### E2E Testing Rules (MANDATORY)

**Target:** Always run E2E tests against `oj-internal.maum.ai` (test server). Never against production.

```bash
# Standard E2E run (read ENV.md for credentials)
PLAYWRIGHT_BASE_URL=http://oj-internal.maum.ai E2E_USERNAME=admin E2E_PASSWORD='<from ENV.md>' \
  npx playwright test tests/e2e/
```

**What to E2E test:**
- All user-facing features (contest, assignments, submissions, admin pages)
- All user roles (admin, instructor, student) with proper capabilities
- Contest modes: scheduled (start/end time) and windowed (fixed duration)
- All supported judge languages (`tests/e2e/all-languages-judge.spec.ts`)
- Participant audit: navigation, all sections render, back link
- Admin console: roles, users, settings, audit logs, languages
- Anti-cheat: event recording, filtering, similarity checks

**After every deploy:** Run full E2E suite against the test server to verify the deployment is healthy.

### Quality Gates (ALL must pass before deploy)

- `npx tsc --noEmit` — zero type errors
- `npx vitest run` — all unit tests pass
- `cargo test` (in judge-worker-rs/) — all Rust tests pass
- E2E tests pass against test server after deploy

## Environment Variables (`ENV.md`)

All deployment credentials, SSH access, target hosts, and runtime secrets are documented in **`ENV.md`** (gitignored, never committed). Before any deployment, SSH, or E2E testing task, **always read `ENV.md` first** to get the correct values.

`ENV.md` contains:
- **Deployment targets** — host IPs, domains, SSH users/passwords/keys, remote directories, app ports
- **Web admin credentials** — username/password for each environment
- **E2E test credentials** — `PLAYWRIGHT_BASE_URL`, `E2E_USERNAME`, `E2E_PASSWORD`
- **SSH access commands** — ready-to-use `sshpass`/`ssh` commands for each target
- **Docker & Nginx** — container management commands, nginx config paths

## Deployment

**RULE: Always read `ENV.md` before any deployment, SSH, or E2E testing task.** Never guess credentials or host addresses — they are all documented in `ENV.md`. Failing to read it first leads to failed deploys and wasted time.

The primary deploy script is `deploy-docker.sh`. Pass environment variables from `ENV.md`:
- `SSH_PASSWORD` — for password-based SSH auth (Target 1)
- `SSH_KEY` — for key-based SSH auth (Target 2)
- `REMOTE_HOST`, `REMOTE_USER`, `DOMAIN` — target overrides
- `PLATFORM` — `linux/amd64` (default, Target 1) or `linux/arm64` (Target 2)

Always test against `oj-internal.maum.ai` (test), never against `oj.auraedu.me` (production).

## Conventions

- Semantic commits: `<type>(<scope>): <gitmoji> <description>`
- GPG-signed commits with gitminer (7 leading zeros)
- Fine-grained commits (one per feature/fix)
- Always `git pull --rebase` before `git push`
- Every commit MUST include relevant tests (see Testing Rules above)
