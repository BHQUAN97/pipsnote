# PIPSNOTE - Next Steps Plan

> Session tiếp theo bắt đầu từ đây. Port: **5601** (prod). Roadmap đầy đủ: `task.md` §0-9.

## ✅ DONE (tính đến session này)

### Core app (Session 1-5, đã ghi nhận trước đó)
Init project, design system 3 preset, auth thật (MySQL + bcrypt + JWT), admin settings UI,
component extraction từ `index.html`, Posts/Brokers CRUD + public pages, affiliate redirect
(`app/go/[slug]`), admin logs UI, Meilisearch (graceful-degradation, FULLTEXT fallback),
public pagination, double-UTF8 encoding fix, xoá credential mặc định khỏi `/admin/login`.
`npm run build`/`lint`/`type-check` đều PASS ở lần verify gần nhất.

### Admin dashboard (uncommitted trước session này)
- `app/admin/page.tsx` + `app/api/admin/dashboard/route.ts` — stat cards (posts by status,
  active brokers, error count 24h), `components/admin/TrendChart.tsx` (affiliate click trend
  30 ngày), top posts/brokers list.
- `components/admin/DetailDrawer.tsx`, `components/BlogListView.tsx` — thêm mới, đi kèm style
  refresh + mobile drawer nav cho `app/admin/layout.tsx`.
- `db/changelog/007_design_refresh/` — migration mới (theme signal update).
- Đã có screenshot verify: `admin-dashboard-desktop.png`, `admin-dashboard-mobile.png` (không
  commit — file ảnh debug, đã thêm `/*.png` vào `.gitignore`).

### Session N-1 (routing + SEO + legal pages + i18n sweep)
1. **`lib/routes.ts`** — config tập trung mọi path builder (`home`, `blog`, `blogCategory(slug)`,
   `post(slug)`, `brokers`, `broker(slug)`, `go(slug)`, `terms`, `privacyPolicy`, `contact`,
   `affiliateDisclosure`, `riskDisclosure`). Áp dụng vào `Footer.tsx`, `CategoryFilter.tsx`,
   `app/page.tsx`, `app/blog/[slug]/page.tsx`, `app/sitemap.ts` — grep xác nhận không còn
   hardcoded href cho các route này trong `app/`/`components/`.
2. **SEO category routing**: `/blog?cat=slug` → `/blog/category/[slug]` (path thật, tốt hơn cho
   Google Ads landing page + index riêng từng category). `lib/posts.ts` (mới) — extract
   `getPublishedPosts({categorySlug, limit, offset})` dùng chung bởi `app/blog/page.tsx` và
   route category mới. `app/blog/category/[slug]/page.tsx` — `notFound()` nếu slug không tồn
   tại (404 thật, không soft-404), `generateMetadata()` riêng theo `categories.description`.
   `app/blog/page.tsx?cat=` cũ → redirect 307 sang path mới (giữ tương thích link cũ/đã index).
3. **5 trang pháp lý** (xoá gap 404 từ footer, chặn GDPR/AdSense compliance):
   `app/terms`, `app/privacy-policy`, `app/contact`, `app/affiliate-disclosure`,
   `app/risk-disclosure` — mỗi file có comment đầu file đánh dấu **boilerplate, cần review
   pháp lý thật trước khi lên production** (chưa phải nội dung chốt).
4. **`app/sitemap.ts`** — thêm route category + 5 trang pháp lý, dùng `lib/routes.ts` cho mọi URL.
5. **i18n sweep**: sửa 1 message thật sự lộ ra `/admin/logs` UI
   (`lib/security/loginGuard.ts` — log auto-block IP, đổi sang tiếng Anh). Các hit tiếng Việt
   còn lại (`app/layout.tsx`, `lib/logSink.ts`, `lib/security/loginGuard.ts` khác) đều là code
   comment nội bộ — giữ nguyên theo đúng convention CLAUDE.md.
6. **Verify đầy đủ**: `npm run lint` + `npm run type-check` + `npm run build` PASS; Playwright
   mobile 375px + desktop — category nav, redirect link cũ, related-post category link, cả 5
   trang pháp lý, 404 thật cho slug sai — 0 console error.

### Session này (design system polish + dark/light verify + i18n end-user EN/VI)
Plan file: `sorted-booping-glacier.md` (đã hoàn tất toàn bộ 3 phase).

1. **Design system polish (Phase 1)**:
   - `tailwind.config.ts` — thêm `fontSize` scale đặt tên (`display/h1-h4/body-lg/md/sm/label`)
     và `borderRadius` scale (`sm/DEFAULT/lg/full`), derive từ giá trị đang dùng thật (không đổi
     visual), sweep các arbitrary value (`text-[26px]`...) sang class có tên.
   - `components/ui/Input.tsx` — wrapper chuẩn hoá border/focus-ring/radius, áp dụng vào admin
     login, `PostForm`, `BrokerForm`, `SearchBox`, `Newsletter` — xoá `border rounded` trơn
     không đồng bộ ở admin login.
   - Dark/light toggle — verify thật bằng Playwright (trước đó chỉ code, chưa test):
     `data-theme` đổi đúng, `--surface-dark` không đổi giữa 2 theme, không FOUC/hydration
     warning, test cả mobile 375px lẫn desktop. **Kết quả: hoạt động đúng, không có bug** — đóng
     backlog cũ #5 (phần dark mode).
2. **i18n end-user thật (Phase 2)** — khác hẳn "i18n sweep" session trước (chỉ sửa 1 dòng log
   nội bộ): dùng `next-intl`, scope **UI chrome only** (nav/nút/label/footer/legal boilerplate),
   **không đụng nội dung blog/broker trong MySQL**. Locale: **EN (default, không prefix) + VI
   (`/vi` prefix)**.
   - Scaffold `i18n/routing.ts` + `i18n/navigation.ts` + `i18n/request.ts`, `messages/en.json` +
     `messages/vi.json`, `next.config.ts` wrap `createNextIntlPlugin()`.
   - `proxy.ts` — compose logic bảo mật cũ (`isIpBlocked`/`checkRateLimit` cho `/api/**` +
     `/admin/**`) với `createMiddleware(routing)` của next-intl cho phần còn lại — đã verify
     không cái nào phá cái kia (rate-limit retest + locale routing đều pass).
   - Move toàn bộ route public (`page.tsx`, `blog/**`, `brokers/**`, `contact/`, 4 trang pháp lý
     còn lại) vào `app/[locale]/`. **Không di chuyển** `app/admin/**`, `app/api/**`,
     `app/go/[slug]/**`, `app/sitemap.ts`, `app/robots.ts` (giữ nguyên, không có locale prefix).
   - Root layout split: `app/layout.tsx` lấy `lang` động qua `getLocale()` (fallback `"en"` cho
     route ngoài `[locale]` như admin) — sửa bug lang-mismatch cũ (hardcode `lang="vi"` dù UI
     tiếng Anh). `app/[locale]/layout.tsx` mới wrap `NextIntlClientProvider`.
   - Dịch UI chrome + cả 5 trang pháp lý (nội dung boilerplate) sang tiếng Việt, dùng
     `useTranslations`/`getTranslations` theo đúng loại component (client/sync vs async server).
   - Language switcher trong `Header.tsx`, giữ nguyên path hiện tại khi đổi locale.
   - `app/sitemap.ts` + `generateMetadata()` (broker/blog/category detail) — thêm
     `alternates.languages` (hreflang `en`/`vi`) cho toàn bộ URL.
3. **Gap tự phát hiện khi verify**: `components/RiskDisclaimer.tsx` (hiển thị ở footer mọi
   trang + trang chi tiết broker/blog) bị bỏ sót hoàn toàn khỏi bước extract string ban đầu —
   hardcode tiếng Anh (và có câu bị lỗi ngữ pháp/thiếu từ). Đã fix: thêm namespace
   `riskDisclaimer` vào `messages/en.json` + `vi.json`, sửa component dùng `useTranslations`.
4. **Verify toàn diện (Phase 3, Playwright)**: EN/VI homepage (content + `<html lang>` đúng),
   language switcher giữ path, theme toggle không xung đột locale routing, admin routes không có
   locale prefix + `lang="en"` fallback đúng, rate-limit retest (11 fail → 403, block persist),
   redirect cũ `/blog?cat=` vẫn hoạt động sau khi route đã nằm trong `[locale]`, `sitemap.xml`
   có đủ hreflang alternates, mobile 375px + desktop cho toàn bộ 5 trang pháp lý (cả 2 locale) —
   **0 console error** ở mọi trang đã test. Đóng backlog cũ #5 (phần rate-limit retest).

**Lưu ý hành vi next-intl (không phải bug)**: `localePrefix: 'as-needed'` khiến next-intl set
cookie `NEXT_LOCALE` sau khi visit `/vi/...` — sau đó visit lại path EN không-prefix (vd `/`)
trong cùng session browser sẽ tự redirect sang `/vi` tương ứng. Đây là hành vi middleware đúng
theo thiết kế next-intl, không cần fix.

### Session này (dọn nốt i18n gap nhỏ từ Phase 3)
Commit `e3854aa` (i18n/design polish trước đó, trước session này chưa commit) +
commit fix gap sau đó. Đã đóng backlog cũ #6 toàn bộ 3 gap:
- 5 trang pháp lý + contact: `metadata` tĩnh → `generateMetadata()` dùng `getTranslations()`,
  `<title>` giờ đúng locale (verify bằng curl: `/vi/terms` → "Điều khoản sử dụng | PIPSNOTE",
  `/terms` → "Terms & Conditions | PIPSNOTE").
- `app/[locale]/blog/[slug]/page.tsx` heading "Related posts" → namespace `blogDetail` mới
  trong `messages/en.json`/`vi.json`, verify cả 2 locale bằng curl.
- `app/admin/login/page.tsx` — thêm `autoComplete="username"`/`"current-password"`.
- Verify: `npm run lint` + `npm run build` PASS.

---

## 🔜 Backlog (chưa làm, ưu tiên theo thứ tự đề xuất)

1. **Deploy thật (`task.md` §9)** — chưa bắt đầu:
   - Set GitHub Secrets theo `DEPLOY.md`, chạy `setup-server.sh` trên VPS lần đầu.
   - Deploy thủ công qua SSH trước khi bật CI tự động, xác nhận health-check pass.
   - Test `backup-mysql.sh` chạy tay + decrypt thử trước khi tin cron.
   - **Chú ý port**: `docker-compose.prod.yml` dùng `5601`, nhưng `DEPLOY.md`,
     `scripts/deploy.sh`, `scripts/quick-deploy.sh`, `scripts/vps-deploy.sh` vẫn hard-code
     `5600` cho health-check/nginx upstream — cần đối chiếu và đồng bộ về 1 số trước khi deploy
     thật (source of truth = `docker-compose.prod.yml`).
   - Sau deploy lần đầu: gọi `POST /api/admin/search/reindex` 1 lần để sync toàn bộ published
     posts hiện có vào Meilisearch (chưa có cơ chế reindex-on-deploy tự động).
2. **Legal pages — cần review pháp lý thật** trước khi coi là production-ready (hiện là
   boilerplate generic, đã đánh dấu comment trong từng file `app/[locale]/terms|privacy-policy|
   contact|affiliate-disclosure|risk-disclosure/page.tsx`).
3. **Security audit toàn diện** (`task.md` §0.2 + `spec (1).md` §16) — đối chiếu từng route với
   spec gốc, không chỉ smoke-test. Đã cố tình để riêng (không làm chung session routing/SEO).
4. **Admin UX audit** — dashboard + mobile drawer nav đã có, nhưng chưa audit toàn diện so với
   `spec (1).md` (đặc biệt UX các form dài trên mobile: `PostForm`, `BrokerForm`).
5. **Tài liệu hoá dự án** — user yêu cầu tổng hợp doc dự án + giải pháp thành file `.md` (mỗi
   file ≤200 dòng, có thể chia nhiều file) tách biệt/bổ sung cho `docs/` hiện có
   (`ADMIN_SETTINGS.md`, `DESIGN_SYSTEM.md`, `LOGGING_STANDARD.md`, `SECURITY_DETECTION.md`) —
   **chưa làm**, cần session riêng để viết nội dung đầy đủ.

**Quy ước code**: mỗi file doc ≤200 dòng, code nên giữ dưới ~500 dòng (component/route quá dài
→ tách nhỏ).

---

## 🔑 Environment Variables (dev, `.env.local` thật)

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=pipsnote_app
DB_NAME=pipsnote
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=<đã generate, xem file thật>
```
Gitignored — không commit, không cần re-tạo trừ khi bị mất. Chạy migration local cần:
```bash
ENV_FILE="$(pwd)/.env.local" bash scripts/db-changelog.sh
```

## 📝 Notes

- **Default login**: `admin` / `admin123` (đổi khi deploy production!)
- **Port**: 5601 (prod app), 3306 (MySQL local qua `shared-mysql`), 6379 (Redis local qua
  `shared-redis`)
- **Redis TTL**: `site_settings` cache 300s
- **Stack**: Next.js 16, React 19, Tailwind v4, MySQL 8, Redis 7, Pino, Zod, bcryptjs, jsonwebtoken

Session sau bắt đầu từ **Backlog #1 (deploy)** nếu ưu tiên lên production, hoặc **#6 (tài liệu
hoá)** nếu user muốn hoàn thiện doc trước. Không còn known issue nào chặn build/lint/test.
