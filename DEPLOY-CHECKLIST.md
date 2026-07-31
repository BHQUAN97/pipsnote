# PDHOAN PIPSNOTE — Deploy Checklist

## Pre-Deploy (Đã hoàn thành ✓)
- [x] GitHub repo: `https://github.com/BHQUAN97/pipsnote`
- [x] Code pushed to `main` branch
- [x] `.next` build artifacts available
- [x] Docker Compose config ready (`docker-compose.prod.yml`)
- [x] Deploy scripts created

## Deploy Script Status

Auto deploy đang chạy qua `scripts/manual-deploy.sh`:
1. ✓ SSH connection test
2. ✓ Shared infrastructure check (shared-mysql + shared-nginx running)
3. 🔄 Clone repository to VPS `/opt/pdhoan`
4. 🔄 Setup `.env` file
5. 🔄 Create MySQL database `pipsnote`
6. 🔄 Docker network setup
7. 🔄 Run DB changelogs
8. 🔄 Build Docker images
9. 🔄 Start containers
10. 🔄 Health check

## Manual Steps Required (Sau khi deploy script xong)

### 1. Configure `.env` on VPS ⚠️ CRITICAL

SSH vào VPS và edit `.env`:

```bash
ssh root@159.223.77.247
cd /opt/pdhoan
nano .env
```

**Required values:**
```env
# Database (shared-mysql)
DB_HOST=shared-mysql
DB_PORT=3306
DB_NAME=pipsnote
DB_USER=pipsnote_app
DB_PASSWORD=<GENERATE-STRONG-PASSWORD>
MYSQL_BACKUP_PASSWORD=<ANOTHER-STRONG-PASSWORD>

# Redis (container riêng)
REDIS_HOST=pipsnote-redis
REDIS_PORT=6379
REDIS_PASSWORD=<GENERATE-STRONG-PASSWORD>

# Meilisearch (container riêng)
MEILI_HOST=http://pipsnote-meilisearch:7700
MEILI_MASTER_KEY=<GENERATE-32-CHAR-KEY>

# App secrets
JWT_SECRET=$(openssl rand -base64 32)
IP_SALT=$(openssl rand -hex 16)
ENCRYPTION_KEY=$(openssl rand -base64 32)

# Cloudflare R2 (backup)
R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
R2_BUCKET=pipsnote-backups
R2_ACCESS_KEY_ID=<from-cloudflare>
R2_SECRET_ACCESS_KEY=<from-cloudflare>

# Backup encryption
BACKUP_ENC_KEY=$(openssl rand -base64 32)

# Dataseed (production = false)
SEED_DEMO_DATA=false
```

**Generate passwords:**
```bash
openssl rand -base64 24   # for DB_PASSWORD
openssl rand -base64 24   # for MYSQL_BACKUP_PASSWORD
openssl rand -base64 24   # for REDIS_PASSWORD
openssl rand -base64 32   # for MEILI_MASTER_KEY
```

### 2. Create MySQL Users ⚠️ CRITICAL

Sau khi `.env` đã có passwords, tạo users:

```bash
docker exec -it shared-mysql mysql -u root -p
```

```sql
-- Tạo database (nếu chưa có)
CREATE DATABASE IF NOT EXISTS pipsnote CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Main app user
CREATE USER IF NOT EXISTS 'pipsnote_app'@'%' IDENTIFIED BY '<DB_PASSWORD>';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP ON pipsnote.* TO 'pipsnote_app'@'%';

-- Backup user (read-only + lock tables)
CREATE USER IF NOT EXISTS 'pipsnote_backup'@'%' IDENTIFIED BY '<MYSQL_BACKUP_PASSWORD>';
GRANT SELECT, LOCK TABLES ON pipsnote.* TO 'pipsnote_backup'@'%';

FLUSH PRIVILEGES;
EXIT;
```

### 3. Restart Containers với .env mới

```bash
cd /opt/pdhoan
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

Check logs:
```bash
docker logs pipsnote-app --tail=100 -f
```

### 4. Setup Nginx Reverse Proxy

Copy config file:
```bash
cd /opt/pdhoan
cat scripts/nginx-hoan.bhquan.store.conf > /etc/nginx/sites-available/hoan.bhquan.store
ln -s /etc/nginx/sites-available/hoan.bhquan.store /etc/nginx/sites-enabled/
```

Test config:
```bash
nginx -t
```

Reload Nginx:
```bash
systemctl reload nginx
```

### 5. Obtain SSL Certificate

**IMPORTANT:** Domain `hoan.bhquan.store` phải trỏ A record về `159.223.77.247` trước!

Check DNS:
```bash
dig hoan.bhquan.store +short
# Should return: 159.223.77.247
```

Run Certbot:
```bash
certbot certonly --nginx \
  -d hoan.bhquan.store \
  --non-interactive \
  --agree-tos \
  --email buihongquan28041997@gmail.com
```

Reload Nginx after SSL:
```bash
nginx -t && systemctl reload nginx
```

### 6. Setup Cloudflare R2 Backup (Optional but Recommended)

1. Vào Cloudflare Dashboard → R2
2. Tạo bucket mới: `pipsnote-backups`
3. Tạo API token với quyền Object R/W trên bucket này
4. Copy `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` vào `.env`
5. Restart app container (bước 3)

Test backup:
```bash
cd /opt/pdhoan
bash scripts/backup-mysql.sh
```

Check R2 bucket xem có file backup không.

### 7. Setup Cron Jobs (Automated Backups)

```bash
cd /opt/pdhoan
crontab -e
```

Add:
```cron
# Daily backup at 1:30 AM Vietnam time (UTC+7 = 18:30 UTC previous day)
30 18 * * * cd /opt/pdhoan && bash scripts/backup-mysql.sh >> /var/log/pipsnote-backup.log 2>&1

# Weekly cleanup old backups (keep 30 days)
0 2 * * 0 find /opt/pdhoan/backups -name "*.sql.gz.enc" -mtime +30 -delete
```

## Verification Checklist

After all steps:

- [ ] Containers running: `docker ps | grep pipsnote` (3 containers: app, redis, meilisearch)
- [ ] App responding: `curl http://127.0.0.1:5601/` (should return HTML)
- [ ] Nginx proxy working: `curl http://hoan.bhquan.store/` (should redirect to HTTPS)
- [ ] HTTPS working: `curl -I https://hoan.bhquan.store/` (should return 200)
- [ ] DB connection: `docker logs pipsnote-app | grep -i "database connected"` (no errors)
- [ ] Redis connection: `docker logs pipsnote-app | grep -i "redis"` (no errors)
- [ ] Meilisearch connection: `docker logs pipsnote-app | grep -i "meilisearch"` (no errors)
- [ ] Backup script working: `bash scripts/backup-mysql.sh` (no errors, file in `/opt/pdhoan/backups/`)
- [ ] SSL auto-renewal: `certbot renew --dry-run` (should pass)

## Troubleshooting

### App container crash loop
```bash
docker logs pipsnote-app --tail=200
```
Common issues:
- Missing `.env` values → check `.env` file
- DB connection failed → check `shared-mysql` running + user created
- Redis password mismatch → check `REDIS_PASSWORD` in `.env`

### Nginx 502 Bad Gateway
```bash
# Check app is listening on 5601
curl http://127.0.0.1:5601/

# Check Nginx upstream
nginx -t
systemctl status nginx
```

### SSL certificate failed
```bash
# Check DNS first
dig hoan.bhquan.store +short

# Check Nginx HTTP (port 80) accessible
curl http://hoan.bhquan.store/.well-known/acme-challenge/test

# Re-run certbot with debug
certbot certonly --nginx -d hoan.bhquan.store --debug
```

### Backup failed
```bash
# Check DB credentials
docker exec shared-mysql mysql -u pipsnote_backup -p<MYSQL_BACKUP_PASSWORD> -e "USE pipsnote; SHOW TABLES;"

# Check R2 credentials
aws s3 ls --endpoint-url $R2_ENDPOINT s3://pipsnote-backups
```

## Rollback Plan

If deploy fails:

```bash
cd /opt/pdhoan
docker compose -f docker-compose.prod.yml down
git reset --hard <previous-commit-hash>
docker compose -f docker-compose.prod.yml up -d --build
```

Or restore from backup:
```bash
bash scripts/restore-mysql.sh latest
```

## Monitoring

### Check app status
```bash
docker ps | grep pipsnote
docker stats --no-stream pipsnote-app
```

### Check logs
```bash
# Real-time logs
docker logs -f pipsnote-app --tail=100

# Error logs only
docker logs pipsnote-app 2>&1 | grep -i error

# Nginx access log
tail -f /var/log/nginx/pipsnote_access.log

# Nginx error log
tail -f /var/log/nginx/pipsnote_error.log
```

### Check disk space
```bash
df -h
docker system df
```

### Check SSL expiry
```bash
certbot certificates
```

## Performance Tuning (Optional)

After deploy stable, consider:

1. **Redis maxmemory:** Edit `docker-compose.prod.yml` → redis command
2. **MySQL query cache:** Check slow queries
3. **Next.js cache:** Monitor `.next/cache` size
4. **Nginx cache:** Add proxy_cache for static assets
5. **CDN:** Cloudflare proxy for static files

## Security Hardening (Recommended)

1. **Firewall:** Only allow ports 22, 80, 443
   ```bash
   ufw allow 22/tcp
   ufw allow 80/tcp
   ufw allow 443/tcp
   ufw --force enable
   ```

2. **SSH key-only auth:** Disable password login
   ```bash
   nano /etc/ssh/sshd_config
   # Set: PasswordAuthentication no
   systemctl restart sshd
   ```

3. **Fail2ban:** Auto-ban brute force
   ```bash
   apt install fail2ban
   cp /opt/pdhoan/security/fail2ban/* /etc/fail2ban/filter.d/
   systemctl restart fail2ban
   ```

4. **Auto-updates:** Security patches
   ```bash
   apt install unattended-upgrades
   dpkg-reconfigure --priority=low unattended-upgrades
   ```

---

**Next Actions:**
1. ⏳ Wait for deploy script to complete
2. ✅ Configure `.env` on VPS
3. ✅ Create MySQL users
4. ✅ Setup Nginx + SSL
5. ✅ Test site: https://hoan.bhquan.store
