# Deployment Guide

## Host Prerequisites

- Linux host (amd64 or arm64) with Docker Engine and nginx
- SSH access from the deploying machine (password or key-based)
- Ports `80`/`443` terminated by nginx; app container listens on port `3100` internally
- `/judge-workspaces` directory on the host — mounted into the worker container for workspace sharing

## Environment Configuration

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
- Set `JUDGE_DISABLE_CUSTOM_SECCOMP=1` on hosts where Docker 28+/modern kernels reject the repository seccomp profile

## Initial Provisioning

```bash
# Interactive setup (recommended)
bash scripts/setup.sh

# Or manual setup:
npm install
npm run db:push
ADMIN_USERNAME=admin ADMIN_PASSWORD=admin123 npm run seed
npm run languages:sync

# Build judge language Docker images (pick a preset)
# Presets: core (~0.8 GB), popular (~2.5 GB), extended (~8 GB), all (~14 GB)
for img in cpp python jvm; do
  docker build -t "judge-${img}" -f "docker/Dockerfile.judge-${img}" .
done

npm run build
```

## Systemd Services

```bash
sudo ./scripts/install-online-judge-service.sh
sudo ./scripts/install-online-judge-worker-rs-service.sh
```

Both expect the repo at `/home/ubuntu/online-judge` with `.env` in the same directory.

### Building the Rust Judge Worker

```bash
cd judge-worker-rs
cargo build --release
```

## nginx and TLS

```bash
sudo install -m 0644 scripts/online-judge.nginx-http.conf /etc/nginx/sites-available/online-judge
sudo ln -sfn /etc/nginx/sites-available/online-judge /etc/nginx/sites-enabled/online-judge
sudo nginx -t && sudo systemctl reload nginx
sudo certbot certonly --nginx -d your-domain.example --non-interactive
sudo install -m 0644 scripts/online-judge.nginx.conf /etc/nginx/sites-available/online-judge
sudo nginx -t && sudo systemctl reload nginx
```

## Deploy Updates

```bash
git pull --rebase origin main
npm install
npm run db:push
npm run languages:sync
npm run build
sudo systemctl restart online-judge.service
sudo systemctl restart online-judge-worker-rs.service
```

### Using `deploy-docker.sh` (Recommended)

Rsyncs source to the remote server and builds Docker images there (never locally), auto-detecting architecture. Supports password (`SSH_PASSWORD`) and key (`SSH_KEY`) SSH auth.

```bash
# Password auth
SSH_PASSWORD='...' REMOTE_HOST=... REMOTE_USER=... ./deploy-docker.sh

# Key auth
SSH_KEY=key.pem REMOTE_HOST=... REMOTE_USER=... DOMAIN=... ./deploy-docker.sh

# Flags: --skip-build, --skip-languages, --languages=core, --languages=cpp,python
```

## Post-deploy Verification

```bash
systemctl is-active online-judge.service
systemctl is-active online-judge-worker-rs.service
curl -I http://127.0.0.1:3000/login
curl http://127.0.0.1:3000/api/health
```

- Confirm submissions progress out of `pending`
- Confirm `/api/health` returns `{"status":"ok"...}` with `checks.database` set to `ok`
- If `401 Unauthorized` in worker logs, verify `JUDGE_AUTH_TOKEN`
- If container-init error (`fsmount:fscontext:proc`), set `JUDGE_DISABLE_CUSTOM_SECCOMP=1`

## CI and Backup

- GitHub Actions CI: `.github/workflows/ci.yml` — lint, build, backup/restore, Playwright
- SQLite backup: `scripts/backup-db.sh`, `scripts/verify-db-backup.sh`
- Systemd backup timer: `scripts/online-judge-backup.service`, `scripts/online-judge-backup.timer`

## Database Reset

```bash
# Stop app first, then:
rm data/judge.db data/judge.db-shm data/judge.db-wal
npm run db:push
npm run seed
```

Default admin: `admin` / `admin123` (forced password change on first login).
