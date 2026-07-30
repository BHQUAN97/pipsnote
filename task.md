# task.md — Lộ trình code app thật PIPSNOTE (Next.js 14)

> File này tổng hợp toàn bộ tài liệu chuẩn đã scaffold (`DEPLOY.md`, `docs/LOGGING_STANDARD.md`, `docs/SECURITY_DETECTION.md`, `docs/DESIGN_SYSTEM.md`, `docs/ADMIN_SETTINGS.md`, `spec (1).md`) thành 1 checklist có thứ tự để tự code. Không phải spec — mọi quyết định kiến trúc đã chốt, chỉ việc theo thứ tự bên dưới.

**Trạng thái hiện tại**: chỉ có `index.html` (nháp UI + token màu) + tài liệu + hạ tầng deploy/backup. **Chưa có** app Next.js thật, chưa init git repo.

---

## 0. Nguyên tắc bắt buộc (đọc trước khi code, áp dụng xuyên suốt)

Đây là các luật KHÔNG được vi phạm dù đang code phần nào — vi phạm 1 trong số này = phải sửa lại trước khi merge.

### 0.1 Error handling & logging (theo `docs/LOGGING_STANDARD.md`)
- **Mọi** Route Handler (`app/api/**/route.ts`) PHẢI bọc qua `withApiHandler()` — không viết try-catch tay lại, không có handler nào bỏ trần.
- Log đầy đủ stacktrace + message ở server (Pino, structured JSON), nhưng trả về client **chỉ** message chung chung (không leak stacktrace/SQL/path nội bộ ra response).
- Log `warn`/`error`/`fatal` phải persist vào bảng `system_logs` (fire-and-forget, không block response).
- Không dùng `console.log` trong code business — dùng logger từ `lib/logger.ts`.

### 0.2 Bảo mật (theo `docs/SECURITY_DETECTION.md` + spec §16)
- Input ở mọi boundary (form admin, API public, webhook affiliate) phải validate bằng Zod trước khi chạm DB.
- Route `/admin/**` bắt buộc qua rate-limit + login-guard (`checkRateLimit`, `recordLoginFailure`, `isIpBlocked`) đã viết sẵn — wire vào `middleware.ts`, không tự chế lại.
- Không hardcode secret/token/connection string — mọi giá trị nhạy cảm lấy từ `.env` (đã có `.env.example` làm chuẩn).
- Không bao giờ log password/token dạng plaintext (kể cả trong `system_logs`).
- `admin_audit_log` (business/security audit — ai đổi gì) và `system_logs` (lỗi kỹ thuật) là 2 bảng **tách biệt**, không gộp.

### 0.3 Design token (theo `docs/DESIGN_SYSTEM.md`)
- `--ink` CHỈ dùng cho màu chữ. Bất kỳ khối nền luôn-tối nào (ticker, badge, hover fill) dùng `--surface-dark`, không dùng `--ink`.
- Không hardcode mã màu hex trong component — mọi màu qua token Tailwind (`bg-brand`, `text-up`, `bg-surface-dark`...) map tới CSS variables, để 3 preset màu ở `DESIGN_SYSTEM.md` §4 vẫn áp dụng được sau này.
- `--up`/`--down` luôn đi kèm icon ▲▼ cạnh con số (không chỉ dựa màu — accessibility).

### 0.4 Admin settings (theo `docs/ADMIN_SETTINGS.md`)
- Mọi giá trị theme/layout hiển thị ra site PHẢI đọc từ bảng `site_settings` (qua `getSiteSettings()`, cache-aside Redis 300s) — không hardcode giá trị mặc định rải rác trong component.
- Sửa `site_settings` chỉ qua API `/api/admin/settings` (role `superadmin`), mỗi lần sửa phải gọi `invalidateSiteSettingsCache()` và ghi `admin_audit_log`.

### 0.5 Database / migration
- **Không dùng ORM auto-migrate.** Mọi thay đổi schema PHẢI là 1 file `.sql` mới trong `db/changelog/<NNN_ten_batch>/`, chạy qua `scripts/db-changelog.sh` (Flyway-style, đã có sẵn). Đây là nguồn migration DUY NHẤT.
- Đặt tên thư mục/file theo tăng dần: `003_xxx`, `004_xxx`... không sửa lại file cũ đã apply — chỉ thêm file mới.
- Chạy `bash scripts/db-changelog.sh` local (trỏ MySQL dev) sau mỗi lần thêm migration để test trước khi commit.

### 0.6 Quy ước code chung (global CLAUDE.md)
- Comment business logic bằng tiếng Việt, comment technical/API bằng tiếng Anh.
- Function > 20 dòng phải có comment mục đích ngắn.
- Commit message: `type(scope): mô tả` (feat/fix/refactor/chore/docs).
- Không commit `.env`, `node_modules`, `.next`.

---

## 1. Khởi tạo project (chưa có app code — bắt đầu từ đây)

- [ ] `npx create-next-app@latest . --typescript --tailwind --app --eslint` (App Router, chạy trong `E:\DEVELOP\PDHOAN` — cẩn thận không ghi đè `index.html`/`spec (1).md`/`docs/`/`scripts/`, review trước khi confirm)
- [ ] `git init` (repo chưa init) → tạo `.gitignore` (`.env`, `node_modules`, `.next`, `db/changelog/**/.applied` nếu có)
- [ ] Tạo repo GitHub `BHQUAN97/pipsnote` (đăng ký trong `git-nexus.md` sau khi có)
- [ ] Cài dependency cốt lõi: `pino`, `pino-pretty` (dev), `zod`, `ioredis`, `mysql2` (hoặc Prisma/Drizzle — quyết định ORM query, KHÔNG dùng ORM migrate), `bcrypt`/`argon2` (hash password admin)
- [ ] Copy `.env.example` → `.env.local`, điền giá trị dev (MySQL local, Redis local)

## 2. Database & schema nền tảng

- [ ] Review `spec (1).md` phần schema chính (bảng bài viết, category, broker/review, affiliate link, admin user...) — liệt kê thành file `db/changelog/001_init/001_create_core_tables.sql`
- [ ] **Xử lý gap đã biết**: tạo `db/changelog/001_logging/001_create_system_logs.sql` (bảng `system_logs` đúng schema đã mô tả trong `docs/LOGGING_STANDARD.md` — file này được tài liệu tham chiếu nhưng chưa từng được tạo, chỉ có thư mục rỗng)
- [ ] Tạo `db/changelog/00X_audit/001_create_admin_audit_log.sql` (bảng `admin_audit_log` theo spec §16.5 — tách biệt với `system_logs`)
- [ ] `db/changelog/002_settings/001_create_site_settings.sql` đã có sẵn — chạy thử `scripts/db-changelog.sh` để xác nhận toàn bộ chain migration chạy được theo thứ tự
- [ ] Setup MySQL dev local (hoặc container `shared-mysql` nếu dev trực tiếp trên VPS/staging)

## 3. Core layout & design system

- [ ] Tạo `tailwind.config.ts` — map token theo `docs/DESIGN_SYSTEM.md` §5 (`theme.extend.colors` trỏ `var(--bg)`, `var(--ink)`, `var(--surface-dark)`, `var(--red)`/`var(--red-dark)`, `var(--up)`, `var(--down)`...)
- [ ] Tạo `app/globals.css` — copy nguyên khối `:root{}` + `[data-theme="dark"]{}` từ `index.html`
- [ ] `app/layout.tsx` — anti-FOUC inline script (đọc `localStorage` + `prefers-color-scheme` trước khi CSS load), copy đúng logic từ `index.html`
- [ ] Convert các block chính của `index.html` (header, ticker strip, news list, footer) thành component React (`components/Header.tsx`, `components/TickerStrip.tsx`...) — giữ nguyên class Tailwind đã map token, không hardcode màu mới

## 4. Logging & error handling infra

- [ ] `lib/logger.ts` — khởi tạo Pino instance theo mẫu trong `docs/LOGGING_STANDARD.md`
- [ ] `lib/logSink.ts` — `persistLog()` insert async vào `system_logs`
- [ ] `lib/withApiHandler.ts` — HOF wrap try-catch cho mọi route handler
- [ ] Viết 1 route test (`/api/health`) qua `withApiHandler()` để xác nhận pattern chạy đúng — route này cũng cần cho health-check của `scripts/deploy.sh`
- [ ] Trang `/admin/logs` — UI xem `system_logs` (filter theo level/date, theo spec UI đã mô tả trong `LOGGING_STANDARD.md`)

## 5. Security & rate-limit

- [ ] `lib/security/rateLimiter.ts`, `lib/security/loginGuard.ts` — copy code mẫu từ `docs/SECURITY_DETECTION.md`
- [ ] `middleware.ts` — wire `checkRateLimit`/`isIpBlocked` cho toàn site, `recordLoginFailure` riêng cho route login admin
- [ ] Trang `/admin/login` — form + gọi `recordLoginFailure` khi sai, khóa theo ngưỡng đã định nghĩa
- [ ] Ghi mọi hành động admin (tạo/sửa/xóa bài, đổi settings, đăng nhập) vào `admin_audit_log`

## 6. Admin settings (theme/layout runtime)

- [ ] `lib/settings.ts` — `getSiteSettings()` (cache-aside Redis 300s) + `invalidateSiteSettingsCache()`
- [ ] `app/layout.tsx` — inject `<style>` runtime từ `getSiteSettings()` (override token CSS variables theo giá trị DB, đúng cơ chế đã mô tả `ADMIN_SETTINGS.md`)
- [ ] `app/admin/settings/page.tsx` — 2 tab (Giao diện / Bố cục) theo spec UI trong `ADMIN_SETTINGS.md`
- [ ] `app/api/admin/settings/route.ts` (`GET`/`PATCH`) + `app/api/admin/settings/preset/route.ts` (`POST`) — Zod validate, chỉ role `superadmin`, gọi `invalidateSiteSettingsCache()` sau khi lưu

## 7. Tính năng nghiệp vụ chính (theo `spec (1).md`)

> Thứ tự cụ thể tùy độ ưu tiên business — gợi ý theo nhóm, xem chi tiết field/logic trong spec gốc:

- [ ] Model bài viết (post/category/tag), CRUD admin + trang public list/detail (chú ý E-E-A-T/YMYL content requirement §8.4/§13: tác giả, ngày cập nhật, disclaimer rủi ro)
- [ ] Model broker/review (nếu có so sánh sàn) + affiliate link tracking (click, conversion) — mọi outbound affiliate link qua redirect nội bộ để log click
- [ ] Trang chủ + ticker strip (giá real-time hoặc mock data ban đầu) dùng đúng token `--up`/`--down` + icon ▲▼
- [ ] SEO cơ bản: metadata động (`generateMetadata`), sitemap, robots.txt
- [ ] Tích hợp Meilisearch cho search bài viết (container đã có sẵn trong `docker-compose.prod.yml`)

## 8. Test & verify trước khi deploy

- [ ] `npm run build` pass, `npm run lint` pass
- [ ] Test toàn bộ route admin có rate-limit chặn đúng (thử sai login liên tục → bị khóa)
- [ ] Test dark mode toggle không vỡ `--surface-dark`
- [ ] Test đổi preset màu qua `/admin/settings` → site đổi giao diện không cần deploy lại
- [ ] `bash scripts/db-changelog.sh` chạy sạch từ đầu trên DB rỗng (fresh install test)
- [ ] Playwright cơ bản cho trang chủ + admin login (mobile viewport, theo global rule UI phải test trước khi báo xong)

## 9. Deploy (khi có VPS/secrets thật — xem `DEPLOY.md`)

- [ ] Set GitHub Secrets theo bảng trong `DEPLOY.md`
- [ ] Chạy `setup-server.sh` trên VPS 1 lần, tạo DB `pipsnote` + user `pipsnote_app`/`pipsnote_backup`
- [ ] Deploy thủ công qua SSH lần đầu (`deploy.sh`) trước khi bật CI tự động — xác nhận health-check pass
- [ ] Test `backup-mysql.sh` chạy tay 1 lần, verify file `.enc` decrypt được trước khi tin tưởng cron

---

## Ghi chú thứ tự ưu tiên
Nếu cần MVP nhanh: làm xong **1 → 2 → 3 → 4** trước (có app chạy được + logging chuẩn), rồi mới đến **5 (security)** và **6 (admin settings)** — 2 phần này có thể tạm dùng giá trị mặc định hardcode trong lúc code phần 7, rồi quay lại wire đúng chuẩn trước khi deploy production (không được bỏ qua bước 5/6 khi lên production).
