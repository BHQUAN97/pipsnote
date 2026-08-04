# ADMIN_SETTINGS.md — Trang cấu hình giao diện cho Admin

Cho phép admin đổi màu sắc/bố cục **ngay trên UI** (không cần sửa code/CSS thủ công như mô tả ở `docs/DESIGN_SYSTEM.md`). Áp dụng khi build app thật — schema DB đã có migration mẫu: `db/changelog/002_settings/001_create_site_settings.sql`.

## 1. Nguyên lý

`site_settings` (key-value, xem migration) lưu đúng bộ token đã định nghĩa ở `DESIGN_SYSTEM.md` §2 + vài cờ layout. Admin sửa qua UI → ghi DB → cache Redis (TTL ngắn hoặc invalidate ngay khi save) → root layout đọc cache, render `<style>` inline chứa `:root{--bg:...; --red:...;}` đè lên giá trị mặc định trong CSS tĩnh.

```
Admin UI (/admin/settings) → PATCH /api/admin/settings → validate (Zod: hex color, enum)
  → UPDATE site_settings + ghi admin_audit_log (spec §16.5)
  → invalidate cache Redis "site_settings:v1"
  → request tiep theo: root layout doc lai tu DB, set cache moi
```

## 2. Trang `/admin/settings` — 2 tab

### Tab "Giao diện" (category = `theme`)
- **Preset nhanh** (dropdown): Editorial Red (mặc định) / Fintech Trust Blue / Crypto Neon Dark — chọn 1 preset = ghi đè toàn bộ `theme.*` cùng lúc bằng giá trị tương ứng trong `DESIGN_SYSTEM.md` §4 (không cần tự chọn từng màu).
- **Tùy chỉnh chi tiết**: color picker cho từng token (`theme.bg`, `theme.ink`, `theme.red`, `theme.red_dark`, `theme.gray_bg`, `theme.gray_line`, `theme.gray_mid`, `theme.up`, `theme.down`) — mỗi input kèm hex code + preview realtime (không cần save mới thấy).
- **Dark mode mặc định** (`theme.dark_default`, toggle) — user mới vào site lần đầu (chưa có `localStorage`) sẽ thấy theme nào.
- Nút "Xem trước" mở tab mới render live trước khi bấm Lưu (áp dụng tạm qua query param `?preview=1`, không ghi DB).

### Tab "Bố cục" (category = `layout`)
- `layout.show_ticker` (toggle) — ẩn/hiện ticker bar giá real-time ở trang chủ.
- `layout.hero_variant` (dropdown, mở rộng dần: `editorial` hiện tại / thêm sau nếu cần variant khác).
- `layout.site_name` (text) — tên hiển thị ở logo/header/footer, tránh hardcode "PIPSNOTE" trong code khi cần đổi brand.

## 3. API

```
GET  /api/admin/settings              -> tra ve toan bo site_settings (group theo category)
PATCH /api/admin/settings             -> body: { key: value, ... } (partial update, nhieu key 1 luc)
POST /api/admin/settings/preset       -> body: { preset: 'blue' | 'red' | 'neon' } (ghi de hang loat theme.*)
GET  /go... (khong lien quan, chi vi du prefix)
```

**Validate (Zod) bắt buộc** trước khi ghi DB:
- `theme.*` (trừ `dark_default`): regex hex color `^#[0-9A-Fa-f]{6}$` — admin nhập sai hex làm vỡ layout toàn site, không được bỏ qua bước này.
- `layout.show_ticker` / `theme.dark_default`: boolean strict.
- `layout.hero_variant`: enum whitelist (không cho nhập tự do → tránh tham chiếu component không tồn tại).

Mọi lần `PATCH` thành công → ghi 1 dòng `admin_audit_log` (đã có sẵn cơ chế ở spec §16.5) với nội dung diff (key nào đổi, giá trị cũ→mới) — vì đây là hành động ảnh hưởng toàn site, cần audit như đổi `affiliate_url`.

## 4. Render runtime (root layout)

```ts
// app/layout.tsx (rut gon)
import { getSiteSettings } from '@/lib/settings'; // doc cache Redis, fallback DB neu cache miss

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
  const themeVars = Object.entries(settings)
    .filter(([k]) => k.startsWith('theme.'))
    .map(([k, v]) => `--${k.replace('theme.', '').replace(/_/g, '-')}: ${v};`)
    .join(' ');

  return (
    <html lang="vi" data-theme={settings['theme.dark_default'] === 'true' ? 'dark' : undefined}>
      <head>
        {/* De tren cung <head>, truoc moi CSS khac -> ghi de dung --bg/--red/... tu DB */}
        <style id="theme-vars" dangerouslySetInnerHTML={{ __html: `:root{${themeVars}}` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

```ts
// lib/settings.ts
import { redis } from '@/lib/redis';
import { db } from '@/lib/db';

const CACHE_KEY = 'site_settings:v1';
const CACHE_TTL = 300; // 5 phut — invalidate ngay khi admin save, TTL chi la fallback an toan

export async function getSiteSettings(): Promise<Record<string, string>> {
  const cached = await redis.get(CACHE_KEY);
  if (cached) return JSON.parse(cached);

  const rows = await db.query('SELECT setting_key, setting_value FROM site_settings');
  const map = Object.fromEntries(rows.map((r: any) => [r.setting_key, r.setting_value]));
  await redis.set(CACHE_KEY, JSON.stringify(map), 'EX', CACHE_TTL);
  return map;
}

export async function invalidateSiteSettingsCache() {
  await redis.del(CACHE_KEY); // goi ngay sau moi PATCH thanh cong
}
```

## 4b. Ảnh nền (Background Images)

4 key mới trong `site_settings` (migration `db/changelog/010_background_images/001_add_background_settings.sql`), `value_type='image'`, `category='background'`, mặc định rỗng (`''` = không dùng ảnh nền, giữ nền màu token như hiện tại):

- `bg.global` — nền toàn site, áp trực tiếp lên `<body>` (`app/layout.tsx`) qua inline `style.backgroundImage`.
- `bg.hero`, `bg.ticker`, `bg.newsletter` — nền riêng cho 3 khối ở trang chủ (`components/Hero.tsx`, `TickerStrip.tsx`, `Newsletter.tsx`), truyền qua prop `bgUrl`. Không áp cho Header/Footer.

Mỗi khối dùng `next/image` (`fill` + `object-cover`) phủ lớp `bg-surface-dark/70` (token có sẵn + opacity, không hex mới — đúng rule `DESIGN_SYSTEM.md`) để đảm bảo chữ đọc được trên mọi ảnh nền.

Admin chọn ảnh qua `/admin/settings` → section "Ảnh nền": click 1 trong 4 ảnh mặc định (`lib/backgroundPresets.ts`, ảnh tĩnh trong `public/images/backgrounds/`) hoặc tải ảnh riêng (`POST /api/admin/upload` với `folder=backgrounds` → lưu R2 dưới prefix `backgrounds/`). Nút "Xoá ảnh" set lại giá trị rỗng.

Validate: `ImageUrlSchema` trong `app/api/admin/settings/route.ts` — chuỗi rỗng hoặc bắt đầu bằng `http://`/`https://` hoặc `/images/backgrounds/`. Vẫn `superadmin`-only, vẫn ghi `admin_audit_log`, vẫn qua `PATCH /api/admin/settings` chung với các key khác — không có endpoint riêng.

## 5. Quyền truy cập & bảo mật

- Chỉ `superadmin` được sửa (đổi giao diện toàn site ảnh hưởng mọi visitor — không phải quyền admin thường).
- Input color bắt buộc qua Zod hex-regex (mục 3) — không tin dữ liệu client dù đến từ admin đã login (đúng nguyên tắc "validate input ở boundary" của backend rules).
- Log qua `admin_audit_log`, không phải `system_logs` (đây là hành động nghiệp vụ có chủ đích, không phải lỗi kỹ thuật — phân biệt như đã nêu ở `docs/LOGGING_STANDARD.md`).

## 6. Liên kết

- Bộ token/preset màu: `docs/DESIGN_SYSTEM.md` (nguồn sự thật cho giá trị mặc định + 3 preset).
- Migration: `db/changelog/002_settings/001_create_site_settings.sql`.
- Audit: spec `(1).md` §16.5 (`admin_audit_log`).
