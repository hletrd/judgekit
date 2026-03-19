<p align="center">
  <img src="src/app/icon.svg" alt="JudgeKit" width="96" height="96" />
</p>

<h1 align="center">JudgeKit</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/SQLite-Drizzle_ORM-green?logo=sqlite" alt="SQLite" />
  <img src="https://img.shields.io/badge/Docker-Sandboxed-2496ED?logo=docker" alt="Docker" />
  <img src="https://img.shields.io/badge/Auth.js-v5-purple?logo=auth0" alt="Auth.js" />
</p>

<p align="center">
  A secure code evaluation platform for programming assignments.<br/>
  Automated judging with Docker-sandboxed execution for 55 language variants including C, C++, Java, Kotlin, Python, Rust, Go, Swift, and esoteric languages like Befunge, Aheui, Hyeong, and Whitespace.
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
- **Configurable site identity and timezone** — Admins can override the site title, description, and default timezone used for rendered timestamps across the application
- **Classroom management** — Groups, enrollments, and assignments with deadlines and late penalties
- **Instructor assignment oversight** — Group-scoped assignment status boards with scoped drill-down into assignment-linked student submissions
- **Problem management** — Sanitized descriptions, configurable time/memory limits, public/private/hidden visibility, and test-case editing before submissions exist
- **Admin login history** — Credential login outcomes with safe filtering and pagination for admin-only review
- **Secure code execution** — Docker containers with no network, seccomp profiles, memory/CPU limits, and non-root users
- **55 language variants** — C (C89/C99/C17/C23, GCC & Clang), C++ (C++20/C++23, GCC & Clang), Java 25, Kotlin 2.3, Python 3.14, JavaScript (Node.js 24), TypeScript 5.9, Rust 1.94, Go 1.26, Swift 6.2, C# (Mono), Ruby, Lua, Haskell, Dart, Zig, Nim, OCaml, Elixir, Julia, D, Racket, V, Fortran, Pascal, COBOL, Brainfuck, Scala, Erlang, Common Lisp, Bash, R, Perl, PHP, Ada, Clojure, Prolog, Tcl, AWK, Scheme, Groovy, Octave, Crystal, PowerShell, PostScript, plus esoteric languages Befunge-93, Aheui, Hyeong, and Whitespace — all with admin-customizable compile options
- **Admin language management** — Per-language Docker image, compile command, run command, and enabled/disabled toggle can be overridden from `/dashboard/admin/languages` without redeploying; changes take effect immediately for new submissions
- **Docker image management** — `GET /api/v1/admin/docker/images` returns locally available Docker images on the judge host; used by the language admin UI to suggest and validate image names
- **Contest system** — IOI (partial scoring) and ICPC (binary scoring) models, scheduled (fixed time) and windowed (per-participant duration) modes, real-time leaderboard with optional freeze period, anti-cheat event recording (tab switches, copy/paste, focus loss), code similarity detection, and per-participant audit timelines
- **Student detail view** — Admins and instructors can drill into per-student submission breakdowns for any assignment at `/dashboard/contests/[assignmentId]/students/[userId]`
- **Submission workflow** — JSON submission flow, live status polling with tab-aware backoff, per-test-case results, paginated submission history, draft recovery, confirmation dialog, local file upload to editor, and mixed legacy/hex submission ID support

## Getting Started

### Quickstart for Agents

Paste the following prompt into [Claude Code](https://claude.com/claude-code), [Codex](https://openai.com/index/codex/), [OpenCode](https://opencode.ai/), [Gemini CLI](https://github.com/google-gemini/gemini-cli), or any AI coding agent:

```text
Set up JudgeKit (online judge platform) for local development.

Steps:
1. Run `npm install` to install dependencies.
2. Copy `.env.example` to `.env`. Generate a random AUTH_SECRET with `openssl rand -base64 32` and write it into `.env`.
3. Run `npm run db:push` to create the SQLite database schema.
4. Run `npm run seed` to create the default admin user (admin / admin123).
5. Run `npm run dev` to start the dev server on http://localhost:3000.

Do NOT build Docker judge images — they are only needed for submission judging, not for running the web app.
```

<details>
<summary><b>Slowstart for Humans</b> — manual setup, step by step</summary>

<br/>

**1. Install dependencies**

```bash
npm install
```

**2. Configure environment**

```bash
cp .env.example .env
```

Open `.env` and set `AUTH_SECRET`:

```bash
# Generate a secure secret
openssl rand -base64 32
# Paste the output as the AUTH_SECRET value in .env
```

**3. Create the database**

```bash
npm run db:push
```

**4. Seed the admin account**

```bash
npm run seed
```

This creates the default admin:

| Field | Value |
|-------|-------|
| Username | `admin` |
| Email | `admin@example.com` |
| Password | `admin123` |
| Role | `super_admin` |

> **Note:** The seeded admin is forced through `/change-password` on first login. Change the default password immediately in production.

**5. Start the dev server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application.

**6. (Optional) Production build**

```bash
npm run build
PORT=3000 npm run start
```

If port `3000` is already occupied, stop the stale process before restarting the production server on the same port.

</details>

## Authentication Notes

- Credentials sign-in accepts either username or email, but the seeded admin uses username `admin` by default.
- Protected-route login preserves `callbackUrl`, so logging in from a deep link should return the user to the original destination unless the forced password-change flow overrides it.
- Next.js 16 route protection now lives in `src/proxy.ts`, not `src/middleware.ts`.
- HTTPS deployments that terminate TLS at a reverse proxy must preserve the original scheme. Auth.js JWT readers in `src/proxy.ts` and `src/lib/api/auth.ts` rely on `src/lib/auth/secure-cookie.ts` to choose the correct secure cookie name.
- Normal protected `/api/v1/*` routes use the Auth.js credentials login plus the session cookie that carries the JWT-backed session rather than a standalone bearer token; the separate bearer token is reserved for `GET`/`POST /api/v1/judge/poll`.

## Remote API Smoke Test

For browser-driven or same-origin automation, the existing Auth.js session is reused automatically. For external scripts, log in through the credentials callback first and persist the session cookie in a cookie jar before calling protected user-facing `/api/v1/*` routes. The example below is read-only and safe to rerun; instructor/admin-only writes such as `POST /api/v1/problems` use the same cookie-jar flow but mutate remote state.

```bash
export OJ_BASE_URL="https://your-domain.example"
export OJ_USERNAME="instructor"
export OJ_PASSWORD="your-password"

COOKIE_JAR="$(mktemp)"
CSRF_TOKEN="$(curl -s -c "$COOKIE_JAR" "$OJ_BASE_URL/api/auth/csrf" | python3 -c 'import json,sys; print(json.load(sys.stdin)["csrfToken"])')"

curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "csrfToken=$CSRF_TOKEN" \
  --data-urlencode "username=$OJ_USERNAME" \
  --data-urlencode "password=$OJ_PASSWORD" \
  --data-urlencode "callbackUrl=$OJ_BASE_URL/dashboard" \
  "$OJ_BASE_URL/api/auth/callback/credentials" \
  >/dev/null

curl -s -b "$COOKIE_JAR" \
  "$OJ_BASE_URL/api/v1/problems?limit=5" \
  | python3 -c 'import json,sys; payload=json.load(sys.stdin); print(json.dumps({"total": payload.get("total"), "titles": [item.get("title") for item in payload.get("data", [])]}, ensure_ascii=False, indent=2))'

rm -f "$COOKIE_JAR"
```

## System Settings

- Admins and super admins can manage site-wide title, description, and default timezone overrides from `/dashboard/admin/settings`.
- Settings are stored in the SQLite `system_settings` table and resolved through `src/lib/system-settings.ts`.
- The configured title and description flow into root metadata, the login card title, the dashboard header title, and the sidebar brand label.
- The configured timezone is used when rendering timestamps in student/admin submission views, admin user pages, and group assignment schedules.
- Leaving any field blank falls back to defaults, with localized app strings for title/description and `Asia/Seoul` as the default timezone.

## Deployment and Database Reset

- To reset the SQLite database, stop the app first, remove `data/judge.db`, `data/judge.db-shm`, and `data/judge.db-wal`, then run:

```bash
npm run db:push
npm run seed
```

- Re-verify login after a reset with username `admin` and password `admin123`; the expected first destination is `/change-password`.

## Comprehensive Deployment Guide

### 1. Host prerequisites

- Linux host (amd64 or arm64) with Docker Engine and nginx
- SSH access from the deploying machine (password or key-based)
- Ports `80`/`443` terminated by nginx; app container listens on port `3100` internally
- `/judge-workspaces` directory on the host — mounted into the worker container for workspace sharing between the worker and sibling judge containers

### 2. Environment configuration

Start from `.env.example` and set at least:

```bash
AUTH_SECRET=<openssl rand -base64 32>
AUTH_URL=https://your-domain.example
AUTH_TRUST_HOST=true
JUDGE_AUTH_TOKEN=<openssl rand -hex 32>
JUDGE_POLL_URL=http://localhost:3000/api/v1/judge/poll
POLL_INTERVAL=2000
JUDGE_DISABLE_CUSTOM_SECCOMP=0
```

- Keep `JUDGE_POLL_URL` on the internal host URL unless the worker runs on another machine
- Set `JUDGE_DISABLE_CUSTOM_SECCOMP=1` on hosts where Docker 28+/modern kernels reject the repository seccomp profile during container init; local main now uses Docker's default seccomp for compilation, applies the repository seccomp profile only during run-phase execution when enabled, and fails closed if that run-phase profile cannot be applied

### 3. Initial provisioning

```bash
npm install
npm run db:push
npm run seed
npm run languages:sync

# Build all 44 judge language Docker images
for img in cpp clang python node jvm rust go swift csharp r perl php ruby lua \
  haskell dart zig nim ocaml elixir julia d racket v fortran pascal cobol \
  brainfuck scala erlang commonlisp bash esoteric ada clojure prolog tcl awk \
  scheme groovy octave crystal powershell postscript; do
  docker build -t "judge-${img}" -f "docker/Dockerfile.judge-${img}" .
done

npm run build
```

### 4. Install systemd services

The web app, judge worker, and optional legacy TS worker are versioned in the repo.

```bash
sudo ./scripts/install-online-judge-service.sh
sudo ./scripts/install-online-judge-worker-rs-service.sh
```

The web app unit lives at `scripts/online-judge.service`, and the Rust judge worker unit lives at `scripts/online-judge-worker-rs.service`. Both expect the repo at `/home/ubuntu/online-judge` with `.env` in the same directory.

#### Building the Rust judge worker

The Rust worker must be compiled on the target host:

```bash
cd judge-worker-rs
cargo build --release
```

The resulting binary is at `judge-worker-rs/target/release/judge-worker`.

### 4a. Install nginx and TLS config

Bootstrap the hostname with the HTTP-only vhost first, issue the certificate, then switch to the final HTTPS config:

```bash
sudo install -m 0644 scripts/online-judge.nginx-http.conf /etc/nginx/sites-available/online-judge
sudo ln -sfn /etc/nginx/sites-available/online-judge /etc/nginx/sites-enabled/online-judge
sudo nginx -t
sudo systemctl reload nginx
sudo certbot certonly --nginx -d your-domain.example --non-interactive
sudo install -m 0644 scripts/online-judge.nginx.conf /etc/nginx/sites-available/online-judge
sudo nginx -t
sudo systemctl reload nginx
```

The final checked-in HTTPS config serves `your-domain.example` only and rejects requests for unknown or retired hostnames.

### 5. Deploy updates

```bash
git pull --rebase origin main
npm install
npm run db:push
npm run languages:sync
npm run build
sudo systemctl restart online-judge.service
sudo systemctl restart online-judge-worker-rs.service
```

If you changed the judge Dockerfiles or compiler/runtime assumptions, run `npm run languages:sync`, rebuild the affected images, and then restart the worker. If you changed the Rust worker source, rebuild with `cd judge-worker-rs && cargo build --release` before restarting.
If you changed versioned systemd unit files or drop-ins, run `sudo systemctl daemon-reload` before restarting services.

**Using `deploy-docker.sh` (recommended for Docker-based deployments):** The deploy script rsyncs source to the remote server and builds all Docker images there (never locally), avoiding architecture mismatches between dev machines and the target host. It auto-detects the target server's architecture (`amd64`/`arm64`) via `uname -m` and passes `--platform` to all `docker build` commands. The nginx config is written to a local temp file, transferred via `scp`, then installed with `sudo cp` (avoiding heredoc+tee issues over SSH). Supports both password-based (`SSH_PASSWORD`) and key-based (`SSH_KEY`) SSH authentication.

### 5a. Optional CI and backup tooling

- GitHub Actions CI now runs lint, production build, backup/restore verification, and the Playwright suite on pushes, pull requests, and manual dispatch via `.github/workflows/ci.yml`.
- SQLite backup tooling now lives in `scripts/backup-db.sh` and `scripts/verify-db-backup.sh`.
- Repo-managed backup timer artifacts live in `scripts/online-judge-backup.service`, `scripts/online-judge-backup.timer`, and `scripts/install-online-judge-backup-timer.sh`.

### 6. Post-deploy verification

```bash
systemctl is-active online-judge.service
systemctl is-active online-judge-worker-rs.service
curl -I http://127.0.0.1:3000/login
curl http://127.0.0.1:3000/api/health
journalctl -u nginx -n 50 --no-pager
journalctl -u certbot.timer -n 20 --no-pager
journalctl -u online-judge-worker-rs.service -n 50 --no-pager
```

- Confirm submissions progress out of `pending`
- Run the all-languages judge E2E test: `PLAYWRIGHT_BASE_URL=https://your-domain.example npx playwright test tests/e2e/all-languages-judge.spec.ts`
- Confirm `/api/health` returns `{"status":"ok"...}` with `checks.database` set to `ok`
- Confirm `https://your-domain.example/login` completes TLS validation and serves the app
- If you see `401 Unauthorized` in worker logs, verify `JUDGE_AUTH_TOKEN`
- If `your-domain.example` shows a certificate mismatch, reissue the certificate for `your-domain.example` and reload nginx before treating the cutover as complete
- If you see the `fsmount:fscontext:proc` container-init error, either restore/fix the repository seccomp profile or explicitly set `JUDGE_DISABLE_CUSTOM_SECCOMP=1` before restarting `online-judge-worker-rs.service`; the worker no longer retries under Docker's default seccomp when the custom run-phase profile is expected
- For system settings schema or timezone changes, verify `/dashboard/admin/settings` and at least one timestamped page such as `/dashboard/submissions` or `/dashboard/admin/users/[id]` after deploy

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | SQLite + Drizzle ORM |
| Auth | Auth.js v5 (Credentials) |
| UI | Tailwind CSS v4, shadcn/ui |
| Code Editor | CodeMirror 6 with CSP-nonce-aware syntax highlighting and theme-aware styling |
| Judge Worker | Rust binary with zero-allocation output comparison |
| Judge Runtimes | 44 Dockerized toolchains covering 55 language variants: GCC, Clang, Java 25, Kotlin 2.3, Python 3.14, Node.js 24, TypeScript 5.9, Rust 1.94, Go 1.26, Swift 6.2, Mono 6.12, Ruby 3.4, Lua 5.4, Haskell (GHC 9.4), Dart 3.8, Zig 0.13, Nim 2.2, OCaml 4.14, Elixir 1.18, Julia 1.12, D (LDC), Racket 8.10, V 0.5, Fortran (GFortran 14), Pascal (FPC 3.2), COBOL (GnuCOBOL), Brainfuck, Scala 3.5, Erlang 27, SBCL, Bash, R 4.5, Perl 5.40, PHP 8.4, GNAT (Ada), Clojure 1.12, SWI-Prolog, Tcl 8.6, GAWK, Chicken Scheme, Groovy 4.0, GNU Octave, Crystal 1.14, PowerShell 7.5, Ghostscript, and esoteric interpreters (Befunge-93, Aheui, Hyeong, Whitespace) |
| Validation | Zod |

## Project Structure

```
judgekit/
├── docker/              # Judge Docker images & seccomp profile
├── judge-worker/        # Legacy TS judge worker (reference)
├── judge-worker-rs/     # Rust judge worker (production)
├── scripts/             # Systemd services & deploy scripts
├── src/
│   ├── app/
│   │   ├── (auth)/      # Login page
│   │   ├── (dashboard)/ # Protected dashboard routes
│   │   └── api/         # API routes
│   ├── lib/
│   │   ├── db/          # Schema, relations, connection
│   │   ├── auth/        # Auth config & permissions
│   │   └── system-settings.ts # Resolved site identity settings
│   ├── components/      # UI components
│   └── types/           # TypeScript types
└── data/                # SQLite database (gitignored)
```

## License

MIT
