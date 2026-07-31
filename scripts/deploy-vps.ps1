# ══════════════════════════════════════════════════════════
# PDHOAN PIPSNOTE — VPS Deploy Script (PowerShell)
# Domain: hoan.bhquan.store
# VPS: 159.223.77.247 (root / password auth)
# ══════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"

# ── Configuration ──────────────────────────────────────────
$VPS_IP = "159.223.77.247"
$VPS_USER = "root"
$VPS_PASSWORD = "12345678@AbcBHQuan"
$APP_DIR = "/opt/pdhoan"
$REPO_URL = "https://github.com/BHQUAN97/PDHOAN.git"
$BRANCH = "main"
$DOMAIN = "hoan.bhquan.store"

# ── Helper Functions ───────────────────────────────────────
function Write-Log { param($msg) Write-Host "[DEPLOY] $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor Red; exit 1 }
function Write-Info { param($msg) Write-Host "[INFO] $msg" -ForegroundColor Blue }

function SSH-Exec {
    param([string]$Command)

    $securePassword = ConvertTo-SecureString $VPS_PASSWORD -AsPlainText -Force
    $credential = New-Object System.Management.Automation.PSCredential($VPS_USER, $securePassword)

    # PowerShell remoting over SSH (requires OpenSSH)
    $result = & ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "${VPS_USER}@${VPS_IP}" $Command 2>&1

    if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {
        return @{ Success = $false; Output = $result }
    }
    return @{ Success = $true; Output = $result }
}

# ── Pre-flight checks ──────────────────────────────────────
Write-Log "Starting deployment to $DOMAIN..."

# Test SSH
Write-Info "Testing SSH connection..."
try {
    $testSSH = SSH-Exec "echo 'SSH OK'"
    if (-not $testSSH.Success) {
        Write-Err "Cannot connect to VPS"
    }
} catch {
    Write-Err "SSH connection failed: $_"
}

# ── Step 1: Check shared infrastructure ────────────────────
Write-Log "Step 1: Checking shared infrastructure..."
$mysqlCheck = SSH-Exec "docker ps --filter 'name=shared-mysql' --format '{{.Names}}'"
$nginxCheck = SSH-Exec "docker ps --filter 'name=shared-nginx' --format '{{.Names}}'"

if ([string]::IsNullOrWhiteSpace($mysqlCheck.Output) -or [string]::IsNullOrWhiteSpace($nginxCheck.Output)) {
    Write-Err "Shared infrastructure not running! Start shared-mysql and shared-nginx first."
}
Write-Info "✓ Shared infrastructure running"

# ── Step 2: Clone/update repository ────────────────────────
Write-Log "Step 2: Cloning/updating repository..."
$cloneCmd = "if [ -d $APP_DIR/.git ]; then echo 'Pulling...'; cd $APP_DIR && git fetch origin $BRANCH && git reset --hard origin/$BRANCH; else echo 'Cloning...'; git clone -b $BRANCH $REPO_URL $APP_DIR; fi"

SSH-Exec $cloneCmd | Out-Null

# ── Step 3: Check .env ─────────────────────────────────────
Write-Log "Step 3: Checking .env file..."
$envCheck = SSH-Exec "test -f $APP_DIR/.env && echo 'yes' || echo 'no'"

if ($envCheck.Output -match 'no') {
    Write-Warn ".env not found! Creating from template..."
    SSH-Exec "cd $APP_DIR && cp .env.example .env && chmod 600 .env" | Out-Null

    Write-Warn "IMPORTANT: Edit .env on VPS before continuing!"
    Write-Host ""
    Write-Host "Run this command to edit:" -ForegroundColor Cyan
    Write-Host "  ssh root@$VPS_IP 'nano $APP_DIR/.env'" -ForegroundColor Cyan
    Write-Host ""

    $continue = Read-Host "Press Enter after configuring .env (or 'skip' to continue anyway)"
    if ($continue -eq 'skip') {
        Write-Warn "Continuing with default .env (may fail!)"
    }
}

# ── Step 4: Create MySQL database ──────────────────────────
Write-Log "Step 4: Creating MySQL database..."
$dbCmd = "docker exec shared-mysql mysql -u root -e 'CREATE DATABASE IF NOT EXISTS pipsnote CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;'"

SSH-Exec $dbCmd | Out-Null
Write-Info "✓ Database ready"

# ── Step 5: Docker networks ────────────────────────────────
Write-Log "Step 5: Ensuring Docker networks..."
SSH-Exec "docker network create webphoto_backend 2>&1 || true" | Out-Null
Write-Info "✓ Networks ready"

# ── Step 6: DB changelogs ──────────────────────────────────
Write-Log "Step 6: Running DB changelogs..."
$changelogResult = SSH-Exec "cd $APP_DIR && bash scripts/db-changelog.sh 2>&1"
if ($changelogResult.Output) {
    Write-Info $changelogResult.Output
}

# ── Step 7: Build & Start containers ───────────────────────
Write-Log "Step 7: Building Docker images (this may take 5-10 minutes)..."
SSH-Exec "cd $APP_DIR && docker compose -f docker-compose.prod.yml build --no-cache" | Out-Null

Write-Log "Stopping old containers..."
SSH-Exec "cd $APP_DIR && docker compose -f docker-compose.prod.yml down --timeout 30 2>/dev/null || true" | Out-Null

Write-Log "Starting new containers..."
SSH-Exec "cd $APP_DIR && docker compose -f docker-compose.prod.yml up -d" | Out-Null

# ── Step 8: Health check ───────────────────────────────────
Write-Log "Step 8: Waiting for app to start..."
Start-Sleep -Seconds 15

$retries = 0
$maxRetries = 30
$healthy = $false

while ($retries -lt $maxRetries) {
    $healthCheck = SSH-Exec "curl -sf http://127.0.0.1:5601/ 2>&1"
    if ($healthCheck.Success) {
        $healthy = $true
        break
    }
    Write-Host "." -NoNewline
    Start-Sleep -Seconds 2
    $retries++
}

Write-Host ""
if ($healthy) {
    Write-Info "✓ App is responding!"
} else {
    Write-Warn "Health check timeout. Check logs: docker logs pipsnote-app"
}

# ── Step 9: Nginx config ───────────────────────────────────
Write-Log "Step 9: Configuring Nginx..."
$nginxConf = "/etc/nginx/sites-available/$DOMAIN"
$nginxExists = SSH-Exec "test -f $nginxConf && echo 'yes' || echo 'no'"

if ($nginxExists.Output -match 'no') {
    Write-Warn "Creating Nginx config..."

    $nginxConfig = @"
upstream pipsnote_upstream {
    server 127.0.0.1:5601;
    keepalive 32;
}

server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://`$server_name`$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    client_max_body_size 20M;

    access_log /var/log/nginx/pipsnote_access.log;
    error_log /var/log/nginx/pipsnote_error.log warn;

    location / {
        proxy_pass http://pipsnote_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade `$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host `$host;
        proxy_set_header X-Real-IP `$remote_addr;
        proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto `$scheme;
        proxy_cache_bypass `$http_upgrade;
    }
}
"@

    # Write config to VPS
    $nginxConfig | SSH-Exec "cat > $nginxConf"
    SSH-Exec "ln -sf $nginxConf /etc/nginx/sites-enabled/" | Out-Null
    SSH-Exec "nginx -t && systemctl reload nginx" | Out-Null
    Write-Info "✓ Nginx configured"
} else {
    Write-Info "✓ Nginx config exists"
}

# ── Step 10: SSL certificate ───────────────────────────────
Write-Log "Step 10: Checking SSL..."
$sslCheck = SSH-Exec "test -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem && echo 'yes' || echo 'no'"

if ($sslCheck.Output -match 'no') {
    Write-Warn "Obtaining SSL certificate..."
    $certbotResult = SSH-Exec "certbot certonly --nginx -d $DOMAIN --non-interactive --agree-tos --email buihongquan28041997@gmail.com 2>&1"

    if ($certbotResult.Success) {
        SSH-Exec "nginx -t && systemctl reload nginx" | Out-Null
        Write-Info "✓ SSL certificate obtained"
    } else {
        Write-Warn "Certbot failed (check DNS). Output: $($certbotResult.Output)"
    }
} else {
    Write-Info "✓ SSL certificate exists"
}

# ── Step 11: Verify containers ─────────────────────────────
Write-Log "Step 11: Verifying containers..."
$containers = SSH-Exec "docker ps --filter 'name=pipsnote' --format '{{.Names}}'"
Write-Info "Running containers:`n$($containers.Output)"

# ── Cleanup ────────────────────────────────────────────────
Write-Log "Cleaning up old images..."
SSH-Exec "docker image prune -f" | Out-Null

# ── Done ───────────────────────────────────────────────────
Write-Log "════════════════════════════════════════════════════════"
Write-Log "  Deployment complete!"
Write-Log "  URL: https://$DOMAIN"
Write-Log "  API: https://$DOMAIN/api/health"
Write-Log "  Logs: ssh root@$VPS_IP 'docker logs pipsnote-app --tail=100'"
Write-Log "════════════════════════════════════════════════════════"
