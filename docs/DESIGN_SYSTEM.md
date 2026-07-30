# DESIGN_SYSTEM.md — pipsnote

Hệ thống màu/token cho `index.html` (bản nháp hiện tại) — mục tiêu: giao diện phù hợp khách hàng ngành tài chính/tiền ảo (hiện đại, đáng tin cậy), đồng thời **đổi màu/bố cục chỉ bằng sửa 1 khối CSS variables**, không đụng vào HTML/layout.

## 1. Vì sao chọn phong cách hiện tại (editorial Bloomberg/FT-style)

Đối tượng chính là trader/nhà đầu tư Forex/Crypto (EU/US) — nhóm này quen thuộc và tin tưởng phong cách "financial news/terminal": nền trắng/đen tương phản cao, font mono cho số liệu (đáng tin, dễ đọc con số), accent đỏ cho tính khẩn cấp/thị trường. Đây cũng là hướng đúng để đạt E-E-A-T cho content YMYL (đã ghi ở spec §8.4/§13) — trông "chuyên nghiệp tài chính" thay vì "startup màu mè" giúp tăng độ tin cậy.

## 2. Token hiện tại (đã có sẵn trong `index.html :root`)

| Token | Vai trò | Light (mặc định) | Dark (`[data-theme="dark"]`) |
|---|---|---|---|
| `--bg` | Nền chính trang | `#FFFFFF` | `#0B0C0E` |
| `--ink` | **Chỉ dùng cho màu chữ/text**, không dùng làm nền khối tối | `#0A0A0A` | `#F2F1ED` |
| `--surface-dark` | Khối LUÔN tối (ticker strip, badge, news-box, hover fill) — độc lập với theme sáng/tối | `#0A0A0A` | `#0A0A0A` (không đổi) |
| `--red` / `--red-dark` | Accent chính (CTA, active state) | `#E10600` / `#B00500` | `#FF4438` / `#E10600` |
| `--gray-bg` | Nền phụ (section xen kẽ, thumbnail placeholder) | `#F5F4F1` | `#16181C` |
| `--gray-line` | Border/divider | `#E4E2DC` | `#2A2D33` |
| `--gray-mid` | Text phụ/mô tả | `#6E6C66` | `#8B8D93` |
| `--up` | Giá tăng (ticker, stat card) — **dùng thống nhất 1 nơi**, không hardcode `#39d353` rải rác | `#1a9e46` | `#39D353` |
| `--down` | Giá giảm | `#E10600` | `#FF4438` |

**Quy tắc quan trọng:** `--ink` chỉ set màu **chữ**. Bất kỳ chỗ nào cần 1 khối nền luôn-tối (ticker, badge, news-box, hover fill nút outline) phải dùng `--surface-dark`, KHÔNG dùng `--ink` — vì `--ink` đảo màu theo theme (sáng↔tối) còn `--surface-dark` thì không. Đã áp dụng đúng quy tắc này trong `index.html` (2026-07-30).

## 3. Dark mode — đã hoạt động

- Toggle button (🌙/☀️) ở header, click đổi `data-theme="dark"` trên `<html>`, lưu `localStorage`.
- Script inline đầu `<head>` đọc `localStorage` + `prefers-color-scheme` **trước khi CSS load** → không bị nháy trắng (FOUC) khi user đã chọn dark trước đó.
- Muốn tắt dark mode (nếu không cần): xóa nút `#themeToggle` + block script cuối file, giữ nguyên `:root`/`[data-theme="dark"]` không ảnh hưởng gì (chỉ áp dụng khi có attribute).

## 4. Preset màu thay thế — copy-paste để đổi "vibe" toàn site

Chỉ cần thay nguyên khối `:root{...}` trong `index.html`, KHÔNG cần sửa bất kỳ CSS rule nào khác (vì mọi nơi đã tham chiếu qua token).

### Preset A — "Fintech Trust Blue" (chuyên nghiệp, ít khẩn cấp hơn đỏ, hợp broker/so sánh sản phẩm tài chính)
```css
:root{
  --bg:#FFFFFF; --ink:#0A0E17; --surface-dark:#0A0E17;
  --red:#1657FF; --red-dark:#0D3FC7;   /* dung lam accent chinh, ten bien giu nguyen de khong sua rule khac */
  --gray-bg:#F3F5F9; --gray-line:#E1E5EC; --gray-mid:#616B7A;
  --up:#1a9e46; --down:#D93025;
}
[data-theme="dark"]{
  --bg:#0A0E17; --ink:#EAEDF3; --gray-bg:#131826; --gray-line:#232A3B; --gray-mid:#8992A3;
  --red:#4C82FF; --red-dark:#1657FF; --up:#39D353; --down:#FF5B4C;
}
```

### Preset B — "Crypto Neon Dark-first" (uu tien dark mode mac dinh, hop trader crypto tre)
```css
:root{
  --bg:#0D0F14; --ink:#EDEFF3; --surface-dark:#000000;
  --red:#00E5A0; --red-dark:#00B37F;   /* accent xanh neon thay do — "growth" thay vi "urgent" */
  --gray-bg:#161922; --gray-line:#262B38; --gray-mid:#8A90A3;
  --up:#00E5A0; --down:#FF3B5C;
}
/* Site nay mac dinh la dark — muon co ban "light" thi lam nguoc lai qua [data-theme="light"] */
```
> Lưu ý Preset B: nếu chọn dark-first, đổi mặc định `document.documentElement` không set `data-theme` = dark, và làm ngược lại — tạo `[data-theme="light"]` override thay vì `[data-theme="dark"]`.

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
