#!/bin/bash
# Manual deploy PDHOAN to VPS via SSH

set -e

VPS="root@159.223.77.247"
APP_DIR="/opt/pdhoan"

echo "=== PDHOAN VPS Deploy ==="
echo ""

# Step 1: Test connection
echo "[1/10] Testing SSH..."
ssh -o StrictHostKeyChecking=no $VPS "echo 'SSH OK'" || { echo "SSH FAILED"; exit 1; }

# Step 2: Check shared infra
echo "[2/10] Checking shared infrastructure..."
ssh $VPS "docker ps | grep -E 'shared-mysql|shared-nginx'" || { echo "Shared infra not running!"; exit 1; }

# Step 3: Clone/update repo
echo "[3/10] Cloning/updating repository..."
ssh $VPS "
if [ -d $APP_DIR/.git ]; then
    cd $APP_DIR && git fetch origin main && git reset --hard origin/main
else
    git clone -b main https://github.com/BHQUAN97/pipsnote.git $APP_DIR
fi
"

# Step 4: Check .env
echo "[4/10] Checking .env..."
ssh $VPS "[ -f $APP_DIR/.env ] || (cp $APP_DIR/.env.example $APP_DIR/.env && echo 'Created .env from template - EDIT IT!')"

# Step 5: Create DB
echo "[5/10] Creating MySQL database..."
ssh $VPS "docker exec shared-mysql mysql -u root -e \"CREATE DATABASE IF NOT EXISTS pipsnote CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\"" || echo "DB might exist (safe)"

# Step 6: Ensure network
echo "[6/10] Ensuring Docker networks..."
ssh $VPS "docker network create webphoto_backend 2>/dev/null || true"

# Step 7: Run changelogs
echo "[7/10] Running DB changelogs..."
ssh $VPS "cd $APP_DIR && bash scripts/db-changelog.sh 2>&1 || echo 'No changelogs or failed (check manually)'"

# Step 8: Build containers
echo "[8/10] Building Docker images (5-10 min)..."
ssh $VPS "cd $APP_DIR && docker compose -f docker-compose.prod.yml build --no-cache"

# Step 9: Start containers
echo "[9/10] Starting containers..."
ssh $VPS "cd $APP_DIR && docker compose -f docker-compose.prod.yml down --timeout 30 2>/dev/null || true"
ssh $VPS "cd $APP_DIR && docker compose -f docker-compose.prod.yml up -d"

# Step 10: Check status
echo "[10/10] Checking status..."
sleep 5
ssh $VPS "docker ps | grep pipsnote"
ssh $VPS "curl -s http://127.0.0.1:5601/ | head -20 || echo 'App not responding yet'"

echo ""
echo "=== Deploy complete! ==="
echo "Next: Configure Nginx + SSL manually on VPS"
