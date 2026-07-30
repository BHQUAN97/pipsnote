#!/bin/bash
# ══════════════════════════════════════════════════════════
# PDHOAN PIPSNOTE — VPS Deploy Script
# Domain: hoan.bhquan.store
# VPS: 159.223.77.247 (root / password auth)
# ══════════════════════════════════════════════════════════

set -euo pipefail

# ── Configuration ──────────────────────────────────────────
VPS_IP="159.223.77.247"
VPS_USER="root"
VPS_PASSWORD="12345678@AbcBHQuan"
APP_DIR="/opt/pdhoan"
REPO_URL="https://github.com/BHQUAN97/PDHOAN.git"
BRANCH="main"
DOMAIN="hoan.bhquan.store"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }

# ── Helper: SSH command wrapper ────────────────────────────
ssh_exec() {
    local cmd="$1"
    sshpass -p "${VPS_PASSWORD}" ssh -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_IP}" "${cmd}" 2>&1
}

# ── Pre-flight checks ──────────────────────────────────────
log "Starting deployment to ${DOMAIN}..."

# Check sshpass
command -v sshpass >/dev/null 2>&1 || {
    warn "sshpass not installed. Installing via Chocolatey..."
    choco install sshpass -y || err "Failed to install sshpass"
}

# Test SSH connection
info "Testing SSH connection to VPS..."
ssh_exec "echo 'SSH OK'" || err "Cannot connect to VPS"

# ── Step 1: Check shared infrastructure ────────────────────
log "Step 1: Checking shared infrastructure..."
MYSQL_RUNNING=$(ssh_exec "docker ps --filter 'name=shared-mysql' --format '{{.Names}}'" || echo "")
NGINX_RUNNING=$(ssh_exec "docker ps --filter 'name=shared-nginx' --format '{{.Names}}'" || echo "")

if [ -z "$MYSQL_RUNNING" ] || [ -z "$NGINX_RUNNING" ]; then
    err "Shared infrastructure not running! Please start shared-mysql and shared-nginx first."
fi
info "✓ shared-mysql and shared-nginx are running"

# ── Step 2: Clone/pull repository ──────────────────────────
log "Step 2: Cloning/updating repository..."
ssh_exec "
    if [ -d ${APP_DIR}/.git ]; then
        echo 'Pulling latest code...'
        cd ${APP_DIR}
        git fetch origin ${BRANCH}
        git reset --hard origin/${BRANCH}
    else
        echo 'Cloning repository...'
        git clone -b ${BRANCH} ${REPO_URL} ${APP_DIR}
    fi
"

# ── Step 3: Setup .env file ────────────────────────────────
log "Step 3: Checking .env file..."
ENV_EXISTS=$(ssh_exec "[ -f ${APP_DIR}/.env ] && echo 'yes' || echo 'no'")

if [ "$ENV_EXISTS" = "no" ]; then
    warn ".env not found! Creating from template..."
    ssh_exec "
        cd ${APP_DIR}
        cp .env.example .env
        chmod 600 .env
    "
    warn "IMPORTANT: Please edit ${APP_DIR}/.env with production values before continuing!"
    read -p "Press Enter after you've configured .env on VPS..."
fi

# ── Step 4: Create MySQL database if not exists ────────────
log "Step 4: Creating MySQL database..."
ssh_exec "
    docker exec shared-mysql mysql -u root -p\${MYSQL_ROOT_PASSWORD} <<EOSQL
CREATE DATABASE IF NOT EXISTS pipsnote CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'pipsnote_app'@'%' IDENTIFIED BY '\${DB_PASSWORD}';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP ON pipsnote.* TO 'pipsnote_app'@'%';
CREATE USER IF NOT EXISTS 'pipsnote_backup'@'%' IDENTIFIED BY '\${MYSQL_BACKUP_PASSWORD}';
GRANT SELECT, LOCK TABLES ON pipsnote.* TO 'pipsnote_backup'@'%';
FLUSH PRIVILEGES;
EOSQL
" || warn "Database might already exist (safe to ignore)"

# ── Step 5: Ensure Docker networks ─────────────────────────
log "Step 5: Ensuring Docker networks..."
ssh_exec "docker network create webphoto_backend 2>/dev/null || true"
info "✓ webphoto_backend network ready"

# ── Step 6: Run DB changelogs ──────────────────────────────
log "Step 6: Running DB changelogs..."
ssh_exec "cd ${APP_DIR} && bash scripts/db-changelog.sh" || warn "No changelogs or script failed (check manually)"

# ── Step 7: Build & Start containers ───────────────────────
log "Step 7: Building Docker images..."
ssh_exec "cd ${APP_DIR} && docker compose -f docker-compose.prod.yml build --no-cache"

log "Stopping old containers..."
ssh_exec "cd ${APP_DIR} && docker compose -f docker-compose.prod.yml down --timeout 30" || true

log "Starting new containers..."
ssh_exec "cd ${APP_DIR} && docker compose -f docker-compose.prod.yml up -d"

# ── Step 8: Wait for health check ──────────────────────────
log "Step 8: Waiting for services to start..."
sleep 10

RETRIES=0
MAX_RETRIES=30
until ssh_exec "curl -sf http://127.0.0.1:5600/api/health > /dev/null 2>&1" || [ ${RETRIES} -ge ${MAX_RETRIES} ]; do
    RETRIES=$((RETRIES + 1))
    echo -n "."
    sleep 2
done

if [ ${RETRIES} -ge ${MAX_RETRIES} ]; then
    warn "Health check timeout! Check logs: docker logs pipsnote-app"
else
    echo ""
    info "✓ App is healthy!"
fi

# ── Step 9: Configure Nginx (if not exists) ────────────────
log "Step 9: Configuring Nginx..."
NGINX_CONF="/etc/nginx/sites-available/${DOMAIN}"
NGINX_EXISTS=$(ssh_exec "[ -f ${NGINX_CONF} ] && echo 'yes' || echo 'no'")

if [ "$NGINX_EXISTS" = "no" ]; then
    warn "Nginx config not found. Creating..."
    ssh_exec "cat > ${NGINX_CONF} << 'EOFNGINX'
upstream pipsnote_upstream {
    server 127.0.0.1:5600;
    keepalive 32;
}

server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN};

    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    client_max_body_size 20M;

    access_log /var/log/nginx/pipsnote_access.log;
    error_log /var/log/nginx/pipsnote_error.log warn;

    location / {
        proxy_pass http://pipsnote_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOFNGINX
"
    ssh_exec "ln -sf ${NGINX_CONF} /etc/nginx/sites-enabled/"
    ssh_exec "nginx -t && systemctl reload nginx"
    info "✓ Nginx configured"
else
    info "✓ Nginx config already exists"
fi

# ── Step 10: Setup SSL certificate ─────────────────────────
log "Step 10: Checking SSL certificate..."
SSL_EXISTS=$(ssh_exec "[ -f /etc/letsencrypt/live/${DOMAIN}/fullchain.pem ] && echo 'yes' || echo 'no'")

if [ "$SSL_EXISTS" = "no" ]; then
    warn "SSL certificate not found. Running certbot..."
    ssh_exec "certbot certonly --nginx -d ${DOMAIN} --non-interactive --agree-tos --email buihongquan28041997@gmail.com" || warn "Certbot failed (check DNS first)"
    ssh_exec "nginx -t && systemctl reload nginx"
else
    info "✓ SSL certificate exists"
fi

# ── Step 11: Post-deploy verification ──────────────────────
log "Step 11: Post-deploy verification..."

CONTAINERS=$(ssh_exec "docker ps --filter 'name=pipsnote' --format '{{.Names}}' | wc -l")
info "Running containers: ${CONTAINERS}/3 (app, redis, meilisearch)"

# ── Cleanup ────────────────────────────────────────────────
log "Cleaning up old images..."
ssh_exec "docker image prune -f" || true

# ── Done ───────────────────────────────────────────────────
log "════════════════════════════════════════════════════════"
log "  Deployment complete!"
log "  URL: https://${DOMAIN}"
log "  API: https://${DOMAIN}/api/health"
log "  Check logs: ssh root@${VPS_IP} 'docker logs pipsnote-app --tail=100'"
log "════════════════════════════════════════════════════════"
