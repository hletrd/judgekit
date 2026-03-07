<p align="center">
  <img src="src/app/icon.svg" alt="Online Judge" width="96" height="96" />
</p>

<h1 align="center">Online Judge</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/SQLite-Drizzle_ORM-green?logo=sqlite" alt="SQLite" />
  <img src="https://img.shields.io/badge/Docker-Sandboxed-2496ED?logo=docker" alt="Docker" />
  <img src="https://img.shields.io/badge/Auth.js-v5-purple?logo=auth0" alt="Auth.js" />
</p>

<p align="center">
  A secure online judge system for student programming assignments.<br/>
  Automated code evaluation with Docker-sandboxed execution for C, C++, and Python.
</p>

<p align="center">
  <a href="#features">Features</a> &middot;
  <a href="#getting-started">Getting Started</a> &middot;
  <a href="#tech-stack">Tech Stack</a> &middot;
  <a href="#project-structure">Project Structure</a>
</p>

---

## Features

- **Role-based access** — Super admin, admin, instructor, and student roles with granular permissions
- **Classroom management** — Groups, enrollments, and assignments with deadlines and late penalties
- **Problem management** — Sanitized descriptions, configurable time/memory limits, public/private/hidden visibility, and test-case editing before submissions exist
- **Secure code execution** — Docker containers with no network, seccomp profiles, memory/CPU limits, and non-root users
- **Multi-language support** — C, C++, and Python with admin-customizable compile options
- **Submission workflow** — JSON submission flow, live status polling, per-test-case results, and paginated submission history

## Current Status

- Phase 0 remediation is complete: submission flow works, the judge worker executes submissions, instructors can manage test cases during problem authoring, the problem edit page exists, and the group creation flow is wired
- High-priority Phase 1 work is also in place: dashboard `loading.tsx` / `error.tsx` / `not-found.tsx`, submission polling, paginated submissions, solved/attempted problem indicators, translated status badges, callback-aware login, and sanitized problem descriptions
- Security hardening now includes login rate limiting, explicit auth/judge env validation, stronger API access checks, problem/test-case exposure fixes, and shared security headers
- Remaining roadmap items live in `docs/review.md`, `docs/security-review.md`, and `docs/feature-plan.md`; assignment CRUD, group membership management, audit logging, CI, and backup/observability work are still open

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env and set AUTH_SECRET (generate with: openssl rand -base64 32)

# Push database schema
npm run db:push

# Seed default admin user
npm run seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application.

### Default Admin Account

| Field | Value |
|-------|-------|
| Username | `admin` |
| Email | `admin@example.com` |
| Password | `admin123` |
| Role | `super_admin` |

> **Note:** The seeded admin is forced through `/change-password` on first login. Change the default password immediately in production.

### Local Production Run

```bash
npm run build
PORT=3000 npm run start
```

If port `3000` is already occupied, stop the stale process before restarting the production server on the same port.

## Authentication Notes

- Credentials sign-in accepts either username or email, but the seeded admin uses username `admin` by default.
- Protected-route login preserves `callbackUrl`, so logging in from a deep link should return the user to the original destination unless the forced password-change flow overrides it.
- Next.js 16 route protection now lives in `src/proxy.ts`, not `src/middleware.ts`.
- HTTPS deployments that terminate TLS at a reverse proxy must preserve the original scheme. Auth.js JWT readers in `src/proxy.ts` and `src/lib/api/auth.ts` rely on `src/lib/auth/secure-cookie.ts` to choose the correct secure cookie name.

## Deployment and Database Reset

- Deployment notes for the OCI demo instance live in `docs/deployment.md`.
- Before touching production, verify that the SSH target matches the public DNS for the environment you intend to change. `oj-demo.atik.kr` should be treated as a separate host from the main `atik.kr` box unless you confirm otherwise.
- As of 2026-03-07, the demo host runs the web app via `online-judge.service` from `/home/ubuntu/online-judge`. A separate managed judge-worker service is not configured there yet.
- To reset the SQLite database for a disposable or demo environment, stop the app first, remove `data/judge.db`, `data/judge.db-shm`, and `data/judge.db-wal`, then run:

```bash
npm run db:push
npm run seed
```

- Re-verify login after a reset with username `admin` and password `admin123`; the expected first destination is `/change-password`.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | SQLite + Drizzle ORM |
| Auth | Auth.js v5 (Credentials) |
| UI | Tailwind CSS v4, shadcn/ui |
| Code Editor | Textarea today, Monaco-ready dependency installed |
| Judge | Docker on Alpine Linux (GCC toolchain, Python 3) |
| Validation | Zod |

## Project Structure

```
online-judge/
├── docker/              # Judge Docker images & seccomp profile
├── judge-worker/        # Separate judge process (polls & executes)
├── scripts/             # Seed scripts
├── src/
│   ├── app/
│   │   ├── (auth)/      # Login page
│   │   ├── (dashboard)/ # Protected dashboard routes
│   │   └── api/         # API routes
│   ├── lib/
│   │   ├── db/          # Schema, relations, connection
│   │   └── auth/        # Auth config & permissions
│   ├── components/      # UI components
│   └── types/           # TypeScript types
└── data/                # SQLite database (gitignored)
```

## License

MIT
