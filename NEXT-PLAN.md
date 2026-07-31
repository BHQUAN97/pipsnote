# PIPSNOTE - Next Steps Plan

> Session tiếp theo bắt đầu từ đây. Port: **5601** (prod, đã đồng bộ toàn bộ scripts + docs). Roadmap đầy đủ: `task.md` §0-9.

## ✅ DONE (Session 1-3)

### Infrastructure & Architecture
- Task 1-8: Core setup (package.json, Tailwind v4, globals.css, layout, logger, Redis singleton, error handler)
- Task 10: Design system - 3 color presets (Editorial Red, Fintech Blue, Crypto Neon) — flat `theme.*`/`layout.*` key-value model
- Task 12: Auth system thật — MySQL `admin_users` + bcrypt + JWT (`jsonwebtoken`, HS256, 24h)
- Task 11: Admin settings UI — full form wired với preset buttons, save/logout, real-time preview

### Database Connection
- `lib/db.ts`, `lib/auth.ts`, `lib/logSink.ts`, `lib/settings.ts`+`lib/settingsPresets.ts` — tất cả query DB thật, không còn mock
- `app/api/admin/settings/route.ts` + `preset/route.ts` — UPSERT DB thật, cache invalidate, `admin_audit_log` diff log
- `lib/security/loginGuard.ts` — Redis-backed (`login-fail:{ip}`, `blocked_ips:{ip}`), đúng `docs/SECURITY_DETECTION.md`
- `db/changelog/005_seed_admin/` — seed admin/admin123 (bcrypt hash)

### §3: Component extraction (HOÀN THÀNH)
`components/` đã port đầy đủ từ `index.html`: `Header`, `TickerStrip`, `Hero`, `BrokerCard`/`BrokerGrid`, `PostCard`/`BlogGrid`, `CategoryFilter`, `Newsletter`, `Footer`, `RiskDisclaimer`, `ThemeToggle` + `components/admin/PostForm.tsx`, `components/admin/BrokerForm.tsx`. `app/page.tsx` không còn là placeholder — dùng `getSiteSettings()` + query DB thật, render qua các component trên.

### §7: Tính năng nghiệp vụ chính (HOÀN THÀNH phần core)
- **Posts**: `app/api/admin/posts/*` (CRUD, Zod, audit log) + `app/admin/posts/{page,new,[id]/edit}.tsx` (client components, `PostForm` dùng chung create/edit) + public `app/blog/page.tsx` + `app/blog/[slug]/page.tsx`
- **Brokers**: `app/api/admin/brokers/*` (CRUD, Zod, audit log, `ER_DUP_ENTRY`→409) + `app/admin/brokers/{page,new,[id]/edit}.tsx` + public `app/brokers/page.tsx` + `app/brokers/[slug]/page.tsx`
- **Affiliate redirect**: `app/go/[slug]/route.ts` tồn tại (redirect + click tracking)
- **Categories**: `app/api/admin/categories/route.ts` (GET, dùng cho dropdown trong PostForm)
- **Admin logs UI**: `app/admin/logs/page.tsx` — filter theo level/module/message/khoảng thời gian, click row để xem chi tiết JSON inline (đã verify Playwright: không lỗi console, key-prop dùng `Fragment` đúng cách)
- **SEO**: `app/robots.ts`, `app/sitemap.ts` đã có
- **Newsletter**: `app/api/subscribe/route.ts` + `db/changelog/006_business/002_create_subscribers.sql`

### Known Issues cũ — TẤT CẢ ĐÃ FIX
1. ~~Port inconsistency 5600/5601~~ → grep xác nhận toàn bộ `scripts/*.sh` + `DEPLOY.md` + `docker-compose.prod.yml` đều dùng `5601` nhất quán.
2. ~~`npm run lint` không chạy được~~ → `eslint.config.js` đã tồn tại, `npm run lint` → "No issues found".
3. ~~`middleware.ts` convention cũ~~ → đã rename thành `proxy.ts` (Next.js 16 convention mới).
4. ~~Không có `type-check` script~~ → `package.json` đã có `"type-check": "tsc --noEmit"`.

### Bug fix quan trọng — Session 3 (double UTF-8 encoding)
- **Phát hiện qua Playwright**: screenshot mobile homepage cho thấy toàn bộ text tiếng Việt từ DB (title bài viết, tên category, badge broker) hiển thị mojibake (vd `"HÆ°á»›ng dáº«n"` thay vì `"Hướng dẫn"`), trong khi text tĩnh trong component (nav, footer) vẫn đúng.
- **Root cause**: `scripts/db-changelog.sh` gọi `mysql` CLI không có flag `--default-character-set=utf8mb4` → client mặc định dùng `latin1` cho `character_set_client`/`connection`/`results` → mọi byte UTF-8 trong các file seed (`006_business/003_seed_content.sql`...) bị double-encode khi INSERT. Xác nhận bằng `HEX()` byte-level và 2 script Node.js test round-trip (chứng minh `lib/db.ts`/mysql2 — dùng bởi toàn bộ app runtime — KHÔNG bị ảnh hưởng, chỉ dữ liệu seed qua shell script mới bị).
- **Fix đã áp dụng**:
  - `scripts/db-changelog.sh`: thêm `--default-character-set=utf8mb4` vào cả `mysql_exec()` và `mysql_exec_file()` — ngăn tái diễn ở mọi migration/deploy sau này (script này được `deploy.sh` gọi as fatal gate mỗi lần deploy).
  - `db/changelog/007_fix_encoding/001_fix_double_utf8.sql` — migration mới (không sửa file cũ, đúng convention) dùng `CONVERT(CAST(CONVERT(col USING latin1) AS BINARY) USING utf8mb4)` để sửa `categories.{name,description}`, `posts.{title,excerpt,content,seo_title,seo_desc}`, `brokers.{name,description,badge}`.
  - Đã chạy `bash scripts/db-changelog.sh` local — PASS. Verify lại qua Playwright: homepage + toàn bộ trang admin (posts list/new/edit, brokers list/new/edit, logs) hiển thị tiếng Việt đúng, 0 console error/warning.

### Code Quality (verify lại session 3)
- `npm run build` — PASS, 30 routes (`○` static, `ƒ` dynamic) — xem output đầy đủ lúc build
- `npm run lint` — PASS, "No issues found"
- Migrations: 9 batch đã applied + `007_fix_encoding` mới applied, tổng SUMMARY `PASS=1 SKIP=9 FAIL=0` ở lần chạy gần nhất
- Playwright mobile 375px: homepage + `/admin/login` → `/admin/posts` (list/new/edit) → `/admin/brokers` (list/new/edit) → `/admin/logs` (kể cả expand row) — tất cả PASS, không console error/warning

### Meilisearch — HOÀN THÀNH (Session 4)
`lib/meilisearch.ts` (mới) — client wrapper theo pattern graceful-degradation giống `lib/redis.ts` (`getMeiliClient()` trả `null` nếu thiếu `MEILI_HOST`, không throw):
- `syncPostSearchIndex(id)` — hook vào `app/api/admin/posts/route.ts` (POST) và `app/api/admin/posts/[id]/route.ts` (PATCH): upsert doc nếu `status === 'published'`, xoá khỏi index nếu draft/archived. Lỗi chỉ log `logger.warn`, không throw — index sync không bao giờ làm fail post CRUD.
- `removePostFromIndex(id)` — hook vào `deleteHandler` của `[id]/route.ts`.
- `searchPosts(q, {categorySlug, limit, offset})` — dùng Meili nếu có, **fallback MySQL FULLTEXT** (`MATCH() AGAINST() IN NATURAL LANGUAGE MODE` trên `idx_search`) nếu Meili down/lỗi/chưa config — search không bao giờ 500 vì thiếu Meili.
- `app/api/search/route.ts` (mới) — public GET endpoint, Zod validate `q`/`cat`/`page`/`pageSize`, wrap `withApiHandler`.
- `components/SearchBox.tsx` (mới) — client component, đặt trong `/blog` (không phải global Header, theo quyết định đã chốt), navigate `/blog?q=...`.
- `app/blog/page.tsx` — đọc `q` từ `searchParams`, dùng `searchPosts()` thay vì query trực tiếp khi có `q`; pagination giữ nguyên `q`.
- **Verify thật (không chỉ code review)**: publish → search thấy ngay; chuyển draft → biến mất khỏi search; dừng container Meilisearch → search vẫn trả kết quả đúng qua MySQL FULLTEXT fallback, không lỗi 500; khởi động lại Meili → hoạt động lại bình thường. Playwright mobile 375px trên `/blog`: gõ "nến" vào search box → submit → đúng 1 kết quả khớp hiển thị, URL thành `/blog?q=n%E1%BA%BFn`.
- Local dev: thêm `MEILI_HOST=http://localhost:7700` + `MEILI_MASTER_KEY` vào `.env.local`, chạy container dev `pipsnote-meilisearch-dev` (`docker run getmeili/meilisearch:v1.6`, image pin khớp prod) — không phải container tồn tại lâu dài, cần tự chạy lại nếu máy restart (`docker start pipsnote-meilisearch-dev` nếu container cũ vẫn còn, hoặc `docker run` lại nếu đã bị xoá).
- `npm run build`/`lint`/`type-check` đều PASS sau khi thêm.

### §8: Test & verify trước deploy (còn thiếu)
- Dark mode toggle — `components/ThemeToggle.tsx` đã tồn tại nhưng chưa test thật qua Playwright (chỉ mới verify field `theme.dark_default` lưu đúng ở session trước) — cần test toggle thật + `--surface-dark` không vỡ dark mode
- Rate-limit test 11 lần login sai → 403 — đã verify login lockout ghi vào Redis + `system_logs` (thấy log thật trong `/admin/logs`), nhưng chưa test lại từ session này với data mới

### §9: Deploy (chưa bắt đầu)
- Set GitHub Secrets theo `DEPLOY.md`
- Chạy `setup-server.sh` trên VPS thật lần đầu
- Deploy thủ công qua SSH trước khi bật CI tự động
- Test `backup-mysql.sh` chạy tay + decrypt thử trước khi tin cron
- **Lưu ý riêng cho lần deploy đầu tiên**: đảm bảo VPS chạy `db-changelog.sh` bản đã fix charset (không phải bản cũ thiếu `--default-character-set=utf8mb4`) — nếu không sẽ tái diễn corruption khi seed data lần đầu trên production.

---

## 🔑 Environment Variables (dev, `.env.local` thật)

`.env.local` đã tồn tại và hoạt động, trỏ vào container `shared-mysql`/`shared-redis` local:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=pipsnote_app
DB_NAME=pipsnote
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=<đã generate, xem file thật>
```
File `.env.local` bị gitignore — không commit, không cần re-tạo ở session sau trừ khi bị mất.

Khi chạy `scripts/db-changelog.sh` cục bộ (không phải qua `deploy.sh` trên VPS), cần set `ENV_FILE` trỏ về `.env.local` (mặc định script tìm `/opt/pipsnote/.env` — chỉ đúng trên VPS):
```bash
ENV_FILE="$(pwd)/.env.local" bash scripts/db-changelog.sh
```

---

## 📝 Notes

- **Default login**: `admin` / `admin123` (đổi khi deploy production!)
- **Port mapping**: 5601 (prod), 3306 (MySQL local qua `shared-mysql`), 6379 (Redis local qua `shared-redis`)
- **Redis TTL**: `site_settings` cache 300s
- **Stack**: Next.js 16, React 19, Tailwind v4, MySQL 8, Redis 7, Pino, Zod, bcryptjs, jsonwebtoken

---

**Meilisearch wiring đã HOÀN THÀNH và verify thật** (Session 4, xem §7 ở trên) — bao gồm test Playwright mobile 375px trên `/blog`: gõ "nến" lọc đúng từ 6 posts xuống còn 1 post khớp. `is_featured` của post id=2 (dùng để test featured badge) đã revert về `0` sau khi test xong.

Session sau bắt đầu từ **§8 còn lại**: dark mode toggle Playwright test (`components/ThemeToggle.tsx` + `--surface-dark`) và rate-limit retest (11 lần login sai → 403) với data mới. Không còn Known Issue nào chặn — có thể tiến tới **§9 deploy thật** bất cứ lúc nào sau khi hoàn tất §8, hoặc bỏ qua §8 tạm để deploy MVP trước nếu ưu tiên lên production sớm.
