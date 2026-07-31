# PDHOAN — Quick Deploy Guide (Manual)

Auto deploy script gặp lỗi authentication khi clone GitHub repo (private repo).

## Solution: Manual Deploy từng bước

### Step 1: SSH vào VPS

```bash
ssh root@159.223.77.247
# Password: 12345678@AbcBHQuan
```

### Step 2: Tạo GitHub Personal Access Token

1. Vào: https://github.com/settings/tokens/new
2. Note: `VPS pipsnote deploy`
3. Expiration: `90 days`
4. Scopes: chọn `repo` (full control of private repos)
5. Click "Generate token"
6. Copy token (chỉ hiện 1 lần!)

**Hoặc dùng gh CLI (local):**
```bash
gh auth token
```

### Step 3: Clone repo trên VPS (với token)

```bash
# Thay <YOUR_GITHUB_TOKEN> bằng token từ step 2
export GH_TOKEN="<YOUR_GITHUB_TOKEN>"

git clone https://${GH_TOKEN}@github.com/BHQUAN97/pipsnote.git /opt/pdhoan

# Hoặc nếu đã có folder, xóa và clone lại:
rm -rf /opt/pdhoan
git clone https://${GH_TOKEN}@github.com/BHQUAN97/pipsnote.git /opt/pdhoan

cd /opt/pdhoan
```

### Step 4: Setup .env

```bash
cd /opt/pdhoan
cp .env.example .env
nano .env
```

**Điền values (CRITICAL):**
```env
DB_HOST=shared-mysql
DB_PORT=3306
DB_NAME=pipsnote
DB_USER=pipsnote_app
DB_PASSWORD=<generate: openssl rand -base64 24>
MYSQL_BACKUP_PASSWORD=<generate: openssl rand -base64 24>

REDIS_HOST=pipsnote-redis
REDIS_PORT=6379
REDIS_PASSWORD=<generate: openssl rand -base64 24>

MEILI_HOST=http://pipsnote-meilisearch:7700
MEILI_MASTER_KEY=<generate: openssl rand -base64 32>

JWT_SECRET=<generate: openssl rand -base64 32>
IP_SALT=<generate: openssl rand -hex 16>
ENCRYPTION_KEY=<generate: openssl rand -base64 32>

# R2 backup (optional, skip nếu chưa có)
R2_ENDPOINT=
R2_BUCKET=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=

BACKUP_ENC_KEY=<generate: openssl rand -base64 32>

SEED_DEMO_DATA=false
```

Save file (Ctrl+O, Enter, Ctrl+X)

### Step 5: Create MySQL Database + Users

```bash
# Get DB passwords from .env
DB_PASSWORD=$(grep ^DB_PASSWORD= .env | cut -d'=' -f2)
BACKUP_PASSWORD=$(grep ^MYSQL_BACKUP_PASSWORD= .env | cut -d'=' -f2)

# Create DB + users
docker exec -i shared-mysql mysql -u root <<EOSQL
CREATE DATABASE IF NOT EXISTS pipsnote CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'pipsnote_app'@'%' IDENTIFIED BY '${DB_PASSWORD}';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP ON pipsnote.* TO 'pipsnote_app'@'%';

CREATE USER IF NOT EXISTS 'pipsnote_backup'@'%' IDENTIFIED BY '${BACKUP_PASSWORD}';
GRANT SELECT, LOCK TABLES ON pipsnote.* TO 'pipsnote_backup'@'%';

FLUSH PRIVILEGES;
EOSQL

# Test connection
docker exec shared-mysql mysql -u pipsnote_app -p${DB_PASSWORD} -e "USE pipsnote; SHOW TABLES;"
```

### Step 6: Ensure Docker Network

```bash
docker network create webphoto_backend 2>/dev/null || echo "Network already exists (OK)"
```

### Step 7: Run DB Changelogs (if any)

```bash
cd /opt/pdhoan
bash scripts/db-changelog.sh
```

Output: "No pending changelogs" hoặc "Applied X migrations"

### Step 8: Build & Start Docker Containers

```bash
cd /opt/pdhoan

# Build images (5-10 phút)
docker compose -f docker-compose.prod.yml build --no-cache

# Start containers
docker compose -f docker-compose.prod.yml up -d

# Check status
docker ps | grep pipsnote
# Should see 3 containers:
# - pipsnote-app
# - pipsnote-redis
# - pipsnote-meilisearch
```

### Step 9: Check App Health

```bash
# Wait 10s for app to start
sleep 10

# Check logs
docker logs pipsnote-app --tail=50

# Test HTTP
curl -I http://127.0.0.1:5601/
# Should return: HTTP/1.1 200 OK (hoặc 404 nếu route không tồn tại, vẫn OK nếu server respond)
```

### Step 10: Configure Nginx

```bash
cd /opt/pdhoan

# Copy config
cat scripts/nginx-hoan.bhquan.store.conf > /etc/nginx/sites-available/hoan.bhquan.store

# Enable site
ln -sf /etc/nginx/sites-available/hoan.bhquan.store /etc/nginx/sites-enabled/

# Test config
nginx -t
# Should output: "syntax is ok", "test is successful"

# Reload Nginx
systemctl reload nginx
```

### Step 11: Setup SSL Certificate

**IMPORTANT:** Domain `hoan.bhquan.store` phải trỏ về `159.223.77.247` trước!

Check DNS:
```bash
dig hoan.bhquan.store +short
# Should return: 159.223.77.247
```

Nếu chưa đúng → vào Cloudflare/DNS provider → thêm A record:
```
Type: A
Name: hoan
Content: 159.223.77.247
Proxy: OFF (DNS only)
```

Khi DNS đã đúng, run Certbot:
```bash
certbot certonly --nginx \
  -d hoan.bhquan.store \
  --non-interactive \
  --agree-tos \
  --email buihongquan28041997@gmail.com

# Reload Nginx with SSL
nginx -t && systemctl reload nginx
```

### Step 12: Verify Deployment

```bash
# Check containers
docker ps | grep pipsnote

# Check app logs
docker logs pipsnote-app --tail=100

# Test HTTPS (from VPS or local)
curl -I https://hoan.bhquan.store/
# Should return: HTTP/2 200 (hoặc 404, vẫn OK nếu server respond)

# Test từ browser
# Mở: https://hoan.bhquan.store
```

---

## Troubleshooting

### Lỗi: "fatal: could not read Username"
→ Clone với token embedded (Step 3)

### Lỗi: "ERROR 1045 (28000): Access denied"
→ Check DB password trong `.env` khớp với password khi CREATE USER

### Lỗi: "Error response from daemon: network not found"
→ Chạy: `docker network create webphoto_backend`

### Container crash loop
```bash
docker logs pipsnote-app --tail=200
```
Common causes:
- DB connection failed → check `shared-mysql` running
- Redis password mismatch → check `.env` REDIS_PASSWORD
- Missing env var → check `.env` file complete

### Nginx 502 Bad Gateway
```bash
# Check app responding
curl http://127.0.0.1:5601/

# Check Nginx config
nginx -t

# Restart Nginx
systemctl restart nginx
```

### SSL certificate failed
```bash
# Check DNS
dig hoan.bhquan.store +short

# Check port 80 accessible from internet
curl -I http://hoan.bhquan.store/

# Re-run certbot with verbose
certbot certonly --nginx -d hoan.bhquan.store --verbose
```

---

## Optional: Setup Automated Backups

```bash
# Test backup script
cd /opt/pdhoan
bash scripts/backup-mysql.sh

# Add cron job
crontab -e

# Add line (daily backup 1:30 AM Vietnam = 18:30 UTC previous day):
30 18 * * * cd /opt/pdhoan && bash scripts/backup-mysql.sh >> /var/log/pipsnote-backup.log 2>&1
```

---

## Maintenance Commands

```bash
# View logs
docker logs -f pipsnote-app --tail=100

# Restart app
cd /opt/pdhoan && docker compose -f docker-compose.prod.yml restart pipsnote-app

# Update code
cd /opt/pdhoan
git pull origin main
docker compose -f docker-compose.prod.yml build pipsnote-app
docker compose -f docker-compose.prod.yml up -d

# Check disk space
df -h
docker system df

# Prune old images
docker image prune -f
```

---

**✅ Deploy Complete Checklist:**
- [ ] Containers running (3/3)
- [ ] App responding on :5601
- [ ] Nginx proxy working
- [ ] HTTPS certificate valid
- [ ] Database seeded (if needed)
- [ ] Backup cron configured
