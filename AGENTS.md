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
cd judge-worker-rs && cargo test              # Rust tests
npx playwright test tests/e2e/               # E2E tests
```

## Deployment

Deployment targets and credentials are documented in `ENV.md` (gitignored).
The primary deploy script is `deploy-docker.sh`. See `ENV.md` for per-target configuration.

## Conventions

- Semantic commits: `<type>(<scope>): <gitmoji> <description>`
- GPG-signed commits with gitminer (7 leading zeros)
- Fine-grained commits (one per feature/fix)
- Always `git pull --rebase` before `git push`
