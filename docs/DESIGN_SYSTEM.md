# DESIGN_SYSTEM.md — pipsnote

Hệ thống màu/token cho app Next.js (`app/globals.css`, giá trị mặc định đồng bộ trong `site_settings` qua migration `db/changelog/007_design_refresh`) — mục tiêu: giao diện "financial dashboard/terminal" dark-first, hiện đại, đáng tin cậy, đồng thời **đổi màu/bố cục chỉ bằng sửa 1 khối CSS variables** (hoặc qua `/admin/settings`), không đụng vào component.

## 1. Vì sao chọn phong cách "Signal" (dark-first financial terminal)

Đối tượng chính là trader/nhà đầu tư Forex/Crypto (EU/US) — nhóm này quen thuộc và tin tưởng phong cách "trading terminal/dashboard": nền tối tương phản cao, font mono cho số liệu (đáng tin, dễ đọc con số), accent màu ấm (amber) cho tính khẩn cấp/thị trường mà không lạm dụng đỏ (đỏ dành riêng cho `--down`). Card có elevation (`box-shadow` + hover lift nhẹ) để tạo cảm giác "dense data" thay vì phẳng. Đây cũng là hướng đúng để đạt E-E-A-T cho content YMYL (đã ghi ở spec §8.4/§13) — trông "chuyên nghiệp tài chính" thay vì "startup màu mè" giúp tăng độ tin cậy.

## 2. Token hiện tại (`app/globals.css`, đồng bộ `lib/settingsPresets.ts` key `red` = preset mặc định "Signal")

| Token | Vai trò | Dark mặc định (`:root` / `[data-theme="dark"]`) | Light thủ công (`[data-theme="light"]`, qua `ThemeToggle`) |
|---|---|---|---|
| `--bg` | Nền chính trang | `#0B0E14` | `#F6F7FA` |
| `--ink` | **Chỉ dùng cho màu chữ/text**, không dùng làm nền khối tối | `#E8EBF2` | `#0B0E14` |
| `--surface-dark` | Khối LUÔN tối (ticker strip, badge, news-box, hover fill) — độc lập với theme sáng/tối | `#05070A` | `#0B0E14` |
| `--red` / `--red-dark` | Accent chính (CTA, active state) — amber, không phải đỏ cảnh báo | `#FFB020` / `#D68F0C` | `#C97F00` / `#A66900` |
| `--gray-bg` | Nền phụ (section xen kẽ, thumbnail placeholder) | `#131721` | `#EEF1F5` |
| `--gray-line` | Border/divider | `#232A38` | `#DCE1E8` |
| `--gray-mid` | Text phụ/mô tả | `#8891A6` | `#5B6472` |
| `--up` | Giá tăng (ticker, stat card) — **dùng thống nhất 1 nơi**, không hardcode rải rác | `#17C879` | `#0FA968` |
| `--down` | Giá giảm | `#F0455C` | `#D6303B` |
| `--shadow-elevated` | Box-shadow chuẩn cho card (dùng qua class `.card-elevated` / `.shadow-elevated-static`) | 2 lớp: contact-shadow mờ + shadow lan toả — xem `app/globals.css` | Bản nhạt hơn tương ứng |

**Quy tắc quan trọng:** `--ink` chỉ set màu **chữ**. Bất kỳ chỗ nào cần 1 khối nền luôn-tối (ticker, badge, news-box, hover fill nút outline) phải dùng `--surface-dark`, KHÔNG dùng `--ink`. Không hardcode hex trong component — nếu cần 1 màu luôn-tối bất kể theme (vd border/text trên nền `--surface-dark` cố định như `TickerStrip`/`Newsletter`), dùng Tailwind opacity modifier trên token trung tính có sẵn (`border-white/10`, `text-white/60`) thay vì thêm hex mới.

**Elevation:** `.card-elevated` (trong `app/globals.css`) = shadow + hover lift (`translateY(-2px)`, border sáng hơn) — dùng cho card có thể click (`BrokerCard`, `PostCard`). `.shadow-elevated-static` = shadow only, không hover lift — dùng cho khối tĩnh không click được (vd Hero stat box).

## 3. Dark mode — đã hoạt động, mặc định là DARK

- Site mặc định `dark` (`theme.dark_default = 'true'` trong `site_settings`) — khác trước đây (mặc định light).
- Toggle button (🌙/☀️, `components/ThemeToggle.tsx`) ở header: click chuyển `data-theme` giữa `"dark"` và `"light"` (đặt tường minh cả 2 chiều, không chỉ xoá attribute), lưu `localStorage`.
- Script inline đầu `<head>` (`app/layout.tsx`) đọc `localStorage` **trước khi CSS load** → không bị nháy sai theme (FOUC) khi user đã chọn trước đó.
- `[data-theme="light"]` là override thủ công dành riêng cho `ThemeToggle` — không phải giá trị SSR mặc định (SSR mặc định đọc `theme.dark_default` từ DB, hiện là `true`).

## 4. Preset màu thay thế (`lib/settingsPresets.ts`, áp dụng qua `/admin/settings`)

Áp dụng qua Admin UI, không cần sửa code — mỗi preset chỉ đổi giá trị `theme.*` trong `site_settings` (build lại `theme_vars` runtime), không đổi bố cục.

### Preset "Signal" (mặc định — key DB: `red`) — amber accent
Giá trị = cột "Dark mặc định" ở bảng mục 2.

### Preset "Ledger" (key DB: `blue`) — dark terminal, electric-blue accent
```
--bg:#0A0F1A; --ink:#E6EEF7; --surface-dark:#05080F;
--red:#2E8BFF; --red-dark:#1D63C9;
--gray-bg:#111826; --gray-line:#22304A; --gray-mid:#7C8BA8;
--up:#22C55E; --down:#EF4444;
```

### Preset "Pulse" (key DB: `neon`) — dark terminal, violet-neon accent
```
--bg:#0C0A14; --ink:#F1EEFB; --surface-dark:#050307;
--red:#B14EFF; --red-dark:#8F2FE0;
--gray-bg:#171325; --gray-line:#2C2440; --gray-mid:#9089AC;
--up:#14E8A0; --down:#FF3D6E;
```

> Cả 3 preset đều dark-first (`theme.dark_default = 'true'`) — không còn preset light mặc định. Muốn xem bản light, dùng `ThemeToggle` (áp dụng `[data-theme="light"]` tĩnh trong `app/globals.css`, không đổi theo preset DB).

## 5. Khi build app thật (Next.js) — map token sang Tailwind

Khi bắt đầu `/build`, đưa các token này vào `tailwind.config.ts` (`theme.extend.colors`) thay vì để trong file HTML tĩnh:
```ts
// tailwind.config.ts (khi co app that)
colors: {
  bg: 'var(--bg)', ink: 'var(--ink)', 'surface-dark': 'var(--surface-dark)',
  brand: { DEFAULT: 'var(--red)', dark: 'var(--red-dark)' },
  up: 'var(--up)', down: 'var(--down)',
}
```
Giữ nguyên cơ chế CSS variables (không hardcode hex trong Tailwind config) để 3 preset ở mục 4 vẫn áp dụng được nguyên vẹn sau khi migrate sang Next.js.

## 6. Đổi màu/bố cục từ Admin UI (không cần sửa code)

Khi có app thật, mục 4/5 ở trên chỉ cần cho **lập trình viên**. Admin (không code) đổi màu/preset/bố cục trực tiếp qua `/admin/settings` — xem `docs/ADMIN_SETTINGS.md` (schema `site_settings`, API, render runtime qua CSS variables inject vào `<head>`).

## 7. Checklist khi đổi theme cho khách hàng khác (white-label sau này)

- [ ] Chỉ sửa khối `:root{}` + `[data-theme="dark"]{}` — không sửa file CSS rule nào khác
- [ ] Kiểm tra contrast text/bg đạt AA (dùng [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)) cho cả 2 theme
- [ ] `--up`/`--down` phải phân biệt rõ ràng kể cả với người mù màu đỏ-xanh (đỏ/xanh lá là cặp khó nhất — cân nhắc thêm icon ▲▼ cạnh số, không chỉ dựa vào màu)
- [ ] Test lại dark mode toggle sau khi đổi preset (đảm bảo `--surface-dark` không bị đổi theo theme)
