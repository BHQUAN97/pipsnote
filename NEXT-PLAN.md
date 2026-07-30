# PIPSNOTE - Next Steps Plan

> Session tiếp theo bắt đầu từ đây. Port: 5600 (dev), 5601 (prod preview)

## ✅ DONE (Session 1)

### Infrastructure & Architecture
- [x] Task 1-8: Core setup (package.json, Tailwind v4, globals.css, layout, logger, Redis singleton, error handler)
- [x] Task 10: Design system - 3 color presets (Editorial Red, Fintech Blue, Crypto Neon)
- [x] Task 12: Auth system - mock admin/admin123, login/logout API, getAdminUser()
- [x] Task 11: Admin settings UI - full form wired với preset buttons, save/logout, real-time preview

### Database Schema
- [x] SQL migrations viết xong trong `db/changelog/`:
  - `001_init/` - core tables: categories, admin_users, posts, tags, post_tags, brokers, affiliate_clicks
  - `002_logging/` - system_logs table (technical errors)
  - `003_audit/` - admin_audit_log table (business/security audit)

### Code Quality
- [x] Build pass clean (no TypeScript errors)
- [x] All API routes use withApiHandler() wrapper
- [x] Zod validation tại mọi boundary
- [x] Pino structured logging
- [x] Redis singleton với graceful fallback
- [x] Anti-FOUC dark mode

### Files Structure
```
E:\DEVELOP\PDHOAN\
├── app/
│   ├── layout.tsx          ← Runtime CSS injection từ getSiteSettings()
│   ├── globals.css         ← CSS variables, theme presets
│   ├── admin/
│   │   ├── login/page.tsx  ← Login form với rate-limit warning
│   │   └── settings/page.tsx ← Full admin settings UI (color picker, presets, layout)
│   └── api/
│       └── admin/
│           ├── auth/       ← login.ts, logout.ts (mock bcrypt)
│           └── settings/   ← route.ts (GET/PATCH), preset/route.ts (POST)
├── lib/
│   ├── redis.ts           ← Singleton pattern, null in non-production
│   ├── logger.ts          ← Pino với dev pretty-print
│   ├── withApiHandler.ts  ← HOF wrapper cho error handling
│   ├── auth.ts            ← Mock verifyLogin, admin/admin123
│   ├── getAdminUser.ts    ← requireAdmin(), getAdminUser()
│   ├── settings.ts        ← getSiteSettings(), invalidateSiteSettingsCache()
│   └── settingsPresets.ts ← PRESETS map (red/blue/neon)
├── db/
│   └── changelog/         ← Flyway-style SQL migrations
└── tailwind.config.ts     ← Maps CSS vars → Tailwind utilities
```

---

## 🔴 PENDING (Chưa xong)

### Task #9: CDN Configuration
**Cần khi có VPS + domain**

```typescript
// Tạo: lib/cdn.ts
export function getCDNUrl(path: string): string {
  const cdnBase = process.env.NEXT_PUBLIC_CDN_BASE || '';
  if (!cdnBase) return path; // fallback local
  return `${cdnBase}${path}`;
}

// Sử dụng:
<Image src={getCDNUrl('/uploads/broker-logo.png')} ... />
```

**Config cần:**
- Cloudflare R2 bucket cho uploads
- `NEXT_PUBLIC_CDN_BASE` trong .env
- Nginx reverse proxy cho `/uploads` → R2
- Image optimization với Next.js Image component

---

## 🟡 TODO: Database Connection

**Tất cả API routes có `// TODO: ...` comments cần implement**

### Step 1: Tạo mysql2 pool

```typescript
// lib/db.ts
import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

export function getDB(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      connectionLimit: 10,
      waitForConnections: true,
      queueLimit: 0,
    });
  }
  return pool;
}
```

### Step 2: Replace TODO comments

**File locations với TODO:**

1. **lib/settings.ts:58**
   ```typescript
   // TODO: Query từ DB site_settings table
   const [rows] = await db.query('SELECT * FROM site_settings WHERE id = 1');
   const dbSettings = rows[0] || DEFAULT_SETTINGS;
   ```

2. **app/api/admin/settings/route.ts:45**
   ```typescript
   // TODO: Update DB site_settings table
   const db = getDB();
   await db.query(
     'UPDATE site_settings SET ? WHERE id = 1',
     [parsed.data]
   );
   ```

3. **app/api/admin/settings/preset/route.ts:35**
   ```typescript
   // TODO: Batch update DB
   const db = getDB();
   await db.query(
     'UPDATE site_settings SET ? WHERE id = 1',
     [presetValues]
   );
   ```

4. **lib/withApiHandler.ts:35**
   ```typescript
   // TODO: Ghi vào DB system_logs table
   const db = getDB();
   await db.query(
     'INSERT INTO system_logs SET ?',
     [logEntry]
   );
   ```

5. **lib/auth.ts** (toàn bộ mock logic)
   - `verifyLogin()` → query admin_users table
   - Check bcrypt password hash từ DB
   - Return real user data

6. **lib/getAdminUser.ts** (cookies-based auth)
   - Parse session token từ cookies
   - Query admin_users table với session validation
   - Check expiry, role

### Step 3: Migrations

**Chạy migrations (manual, không ORM):**

```bash
# Local dev
mysql -u root -p pipsnote < db/changelog/001_init/001_create_core_tables.sql
mysql -u root -p pipsnote < db/changelog/002_logging/001_create_system_logs.sql
mysql -u root -p pipsnote < db/changelog/003_audit/001_create_admin_audit_log.sql

# VPS production
mysql -h <VPS_IP> -u pipsnote -p pipsnote < db/changelog/*.sql
```

**Seed data:**

```sql
-- Tạo admin user đầu tiên
INSERT INTO admin_users (username, password_hash, email, role) VALUES
('admin', '$2a$10$...bcrypt_hash...', 'admin@pipsnote.local', 'superadmin');

-- Tạo site_settings row đầu tiên (Editorial Red preset)
INSERT INTO site_settings SET
  bg = '#ffffff',
  ink = '#1a1a1a',
  surfaceDark = '#1a1a1a',
  brand = '#dc2626',
  brandDark = '#991b1b',
  -- ... rest of defaults
  headerSticky = 1,
  showDarkModeToggle = 1;
```

---

## 🟢 TODO: Content Management

### Posts CRUD
Tạo admin UI cho:
- `/admin/posts` - list posts, filter by category/tag/status
- `/admin/posts/new` - create post (TinyMCE/Tiptap editor)
- `/admin/posts/[id]/edit` - edit post
- API routes: `/api/admin/posts` (GET/POST/PATCH/DELETE)

### Brokers CRUD
- `/admin/brokers` - list brokers
- `/admin/brokers/new` - add broker (logo upload → CDN)
- `/admin/brokers/[id]/edit` - edit broker, affiliate link
- API routes: `/api/admin/brokers`

### Categories & Tags
- `/admin/categories` - manage categories (CRUD)
- `/admin/tags` - manage tags (CRUD)

---

## 🔵 TODO: Public Frontend

### Homepage
- Hero section với latest posts
- Featured brokers
- Market news ticker (optional, external API)

### Post Detail Page
- `/posts/[slug]`
- SEO meta tags
- Related posts
- Broker affiliate CTA

### Broker Review Page
- `/brokers/[slug]`
- Ratings, pros/cons
- Affiliate click tracking

### Category/Tag Pages
- `/category/[slug]`
- `/tag/[slug]`

---

## 🟣 TODO: VPS Deployment

### Prerequisites
- VPS IP: `___.___.___.__` (điền khi có)
- Domain: `pipsnote.com` (điền khi có)
- SSH key: `~/.ssh/id_ed25519` đã setup chưa? (test: `ssh -i ~/.ssh/id_ed25519 user@vps`)

### VPS Setup Steps

**1. Install dependencies:**
```bash
ssh user@vps
sudo apt update && sudo apt install -y nodejs npm nginx mysql-server redis-server certbot python3-certbot-nginx
```

**2. Setup MySQL:**
```bash
sudo mysql_secure_installation
sudo mysql -e "CREATE DATABASE pipsnote CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER 'pipsnote'@'localhost' IDENTIFIED BY 'STRONG_PASSWORD';"
sudo mysql -e "GRANT ALL ON pipsnote.* TO 'pipsnote'@'localhost';"
```

**3. Clone repo:**
```bash
mkdir -p /var/www/pipsnote
cd /var/www/pipsnote
git clone https://github.com/BHQUAN97/pipsnote.git .
```

**4. Environment variables:**
```bash
cat > .env.production.local <<EOF
NODE_ENV=production
DB_HOST=localhost
DB_PORT=3306
DB_USER=pipsnote
DB_PASSWORD=STRONG_PASSWORD
DB_NAME=pipsnote

REDIS_HOST=localhost
REDIS_PORT=6379

NEXT_PUBLIC_SITE_URL=https://pipsnote.com
NEXT_PUBLIC_CDN_BASE=https://cdn.pipsnote.com

SESSION_SECRET=RANDOM_64_CHAR_STRING
EOF
```

**5. Build:**
```bash
npm install --production
npm run build
```

**6. PM2:**
```bash
sudo npm install -g pm2
pm2 start npm --name "pipsnote" -- start
pm2 save
pm2 startup
```

**7. Nginx:**
```nginx
# /etc/nginx/sites-available/pipsnote
server {
    listen 80;
    server_name pipsnote.com www.pipsnote.com;

    location / {
        proxy_pass http://localhost:5601;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/pipsnote /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**8. SSL (Certbot):**
```bash
sudo certbot --nginx -d pipsnote.com -d www.pipsnote.com
```

**9. Auto-renew cron:**
```bash
sudo crontab -e
# Add:
0 3 * * * certbot renew --quiet
```

---

## 📋 Checklist Trước Khi Bàn Giao

- [ ] Database connection hoạt động (test login thật)
- [ ] Settings UI save → DB → cache invalidate → reload UI
- [ ] Preset buttons apply ngay lập tức
- [ ] Admin audit log ghi lại mọi thay đổi settings
- [ ] System logs ghi error vào DB
- [ ] CDN config cho uploads
- [ ] At least 5 sample posts + 3 sample brokers
- [ ] SEO meta tags cho public pages
- [ ] Mobile responsive (test 375px, 768px, 1024px)
- [ ] Dark mode toggle hoạt động
- [ ] Rate limiting test (10 login failures → block)
- [ ] SSL certificate valid
- [ ] PM2 auto-restart on crash
- [ ] Daily backup script cho MySQL

---

## 🔑 Environment Variables Cần Có

**Development (.env.local):**
```env
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=pipsnote

REDIS_HOST=localhost
REDIS_PORT=6379

NEXT_PUBLIC_SITE_URL=http://localhost:5600
```

**Production (.env.production.local trên VPS):**
```env
NODE_ENV=production
DB_HOST=localhost
DB_PORT=3306
DB_USER=pipsnote
DB_PASSWORD=___FILL_ME___
DB_NAME=pipsnote

REDIS_HOST=localhost
REDIS_PORT=6379

NEXT_PUBLIC_SITE_URL=https://pipsnote.com
NEXT_PUBLIC_CDN_BASE=https://cdn.pipsnote.com

SESSION_SECRET=___64_CHAR_RANDOM___
```

---

## 🚨 Known Issues & Workarounds

### 1. Redis không available khi build
**Solved** - lib/redis.ts returns null in non-production, all Redis consumers check null first

### 2. Tailwind CSS v4 PostCSS plugin
**Solved** - Use `@tailwindcss/postcss` thay vì `tailwindcss` trong postcss.config.mjs

### 3. Windows file lock khi rm -rf node_modules
**Workaround** - Dùng PowerShell: `Remove-Item -Recurse -Force node_modules`

---

## 📝 Notes

- **Default login**: username=`admin`, password=`admin123` (THAY ĐỔI khi deploy production!)
- **Port mapping**: 5600 (dev), 5601 (prod preview), 3310 (MySQL local)
- **Redis TTL**: site_settings cache 300s (5 phút)
- **Rate limit**: `/api/admin/login` max 10 requests/10min → block 1h
- **Logger**: Pino với pretty-print trong dev, JSON trong prod
- **Stack**: Next.js 16, React 19, Tailwind v4, MySQL 8, Redis 7, Pino, Zod, bcryptjs

---

Session sau bắt đầu từ **TODO: Database Connection** → implement mysql2 pool → replace TODO comments → test real login flow.
