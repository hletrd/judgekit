#!/usr/bin/env bash
# =============================================================================
# Static Site Deploy Script
#
# Deploys static HTML content to the production server via Docker.
# Uses the same SSH credentials as the main JudgeKit deployment.
#
# Usage:
#   ./deploy.sh                  # Full deploy (build + start + nginx)
#   ./deploy.sh --content-only   # Just sync content and rebuild container
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
JUDGEKIT_DIR="$(dirname "$SCRIPT_DIR")"

# Production target (same server as oj.auraedu.me)
REMOTE_HOST="${REMOTE_HOST:-oj.auraedu.me}"
REMOTE_USER="${REMOTE_USER:-ubuntu}"
SSH_KEY="${SSH_KEY:-${JUDGEKIT_DIR}/key.pem}"
REMOTE_DIR="/home/${REMOTE_USER}/static-site"
STATIC_DOMAIN="static.auraedu.me"

# Docker compose command (hyphenated on this host)
COMPOSE_CMD="docker-compose"

# SSH options
SSH_OPTS="-o StrictHostKeyChecking=no -o LogLevel=ERROR"
if [[ -n "${SSH_KEY:-}" && -f "$SSH_KEY" ]]; then
    SSH_OPTS="$SSH_OPTS -i $SSH_KEY"
fi

ssh_cmd() {
    ssh $SSH_OPTS "${REMOTE_USER}@${REMOTE_HOST}" "$@"
}

scp_cmd() {
    scp $SSH_OPTS "$@"
}

CONTENT_ONLY=false
for arg in "$@"; do
    case "$arg" in
        --content-only) CONTENT_ONLY=true ;;
    esac
done

echo "==> Syncing static site to ${REMOTE_HOST}:${REMOTE_DIR}"
ssh_cmd "mkdir -p ${REMOTE_DIR}"
rsync -avz --delete \
    -e "ssh $SSH_OPTS" \
    "$SCRIPT_DIR/" \
    "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/"

echo "==> Building and starting static site container"
ssh_cmd "cd ${REMOTE_DIR} && ${COMPOSE_CMD} build && ${COMPOSE_CMD} up -d"

if [[ "$CONTENT_ONLY" == "true" ]]; then
    echo "==> Content-only deploy done"
    exit 0
fi

echo "==> Installing nginx vhost for ${STATIC_DOMAIN}"

# Check if cert already exists
if ssh_cmd "test -d /etc/letsencrypt/live/${STATIC_DOMAIN}"; then
    echo "    TLS certificate already exists"
else
    echo "    Requesting Let's Encrypt certificate for ${STATIC_DOMAIN}"
    ssh_cmd "sudo certbot certonly --nginx -d ${STATIC_DOMAIN} --non-interactive --agree-tos --email admin@auraedu.me"
fi

# Deploy nginx config
scp_cmd "${SCRIPT_DIR}/static.nginx.conf" "${REMOTE_USER}@${REMOTE_HOST}:/tmp/static-site.nginx.conf"
ssh_cmd "sudo mv /tmp/static-site.nginx.conf /etc/nginx/sites-available/static-site && \
    sudo ln -sf /etc/nginx/sites-available/static-site /etc/nginx/sites-enabled/static-site && \
    sudo nginx -t && \
    sudo systemctl reload nginx"

echo "==> Verifying deployment"
sleep 2
STATUS=$(ssh_cmd "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3101/")
if [[ "$STATUS" == "200" ]]; then
    echo "    Docker container: OK (HTTP $STATUS)"
else
    echo "    Docker container: FAILED (HTTP $STATUS)"
    ssh_cmd "cd ${REMOTE_DIR} && ${COMPOSE_CMD} logs --tail=20"
    exit 1
fi

echo ""
echo "==> Deploy complete!"
echo "    https://${STATIC_DOMAIN}/"
