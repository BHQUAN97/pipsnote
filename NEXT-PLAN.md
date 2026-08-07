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

### Session này (Admin UX audit — Phase A + Phase B, đóng backlog #4 một phần)
Plan 3 phase (A/B/C) từ backlog #4 cũ. Đã xong A + B, C chưa làm.

1. **Phase A (fix nhanh, không cần migration)** — commit `1d1be95`:
   `/about` + `/instruction` thành trang thật (trước là dead anchor), verify theme toggle +
   admin logs bằng Playwright (không có bug thật, không cần fix), dashboard thêm nút refresh +
   "last updated" timestamp, Brokers list thêm filter theo status, trang 404/error/maintenance.
2. **Phase B (rich text editor cho posts)** — 2 commit, đã deploy qua CI/CD (health check
   `/api/health` pass):
   - `components/admin/RichTextEditor.tsx` — TipTap v3 (10 extension: Underline/Link/Image/
     TextAlign/Placeholder/Highlight/CharacterCount/TextStyle/Color/StarterKit), toolbar dùng
     `lucide-react` icon, tái dùng class `.article-content` có sẵn (không thêm dependency
     `@tailwindcss/typography`).
   - `lib/r2.ts` + `app/api/admin/upload/route.ts` — upload ảnh lên bucket R2 **riêng**
     `pipsnote-media` (tách khỏi bucket backup `pipsnote-backups`), giới hạn 10MB,
     jpeg/png/webp/gif.
   - `lib/sanitize.ts` — whitelist-based HTML sanitizer (regex, không dùng DOMPurify+jsdom),
     wire vào cả POST và PATCH `/api/admin/posts` **trước khi lưu DB** (vì
     `posts.content` render qua `dangerouslySetInnerHTML` không escape ở blog public — đây là
     mặt XSS thật, không phải phòng hờ).
   - Tags: dùng lại bảng `tags`/`post_tags` có sẵn từ `001_init` nhưng trước đó chưa có API/UI.
     `app/api/admin/tags/route.ts` (GET/POST, tự tạo tag mới nếu chưa tồn tại) +
     `lib/posts.ts` (`getPostTags`/`syncPostTags`) + `components/admin/TagInput.tsx` (chip
     input, autocomplete) wire vào `PostForm.tsx`.
   - Dọn code trùng: extract `slugify()` (trước đó copy-paste y hệt ở `PostForm.tsx` và
     `BrokerForm.tsx`) sang `lib/slugify.ts` dùng chung.
   - **Gap tự phát hiện + fix trong lúc deploy**: `.github/workflows/deploy.yml` chưa sync
     `R2_MEDIA_BUCKET`/`R2_MEDIA_PUBLIC_URL` xuống `.env` VPS (chỉ có 4 var của bucket backup) —
     đã thêm 2 dòng vào workflow. **Cần tự set 2 GitHub Secret này** (`R2_MEDIA_BUCKET`,
     `R2_MEDIA_PUBLIC_URL`) nếu chưa có, không thì nút upload ảnh trong editor sẽ báo lỗi "R2
     media bucket not configured" (không crash cả app, chỉ tính năng upload ảnh fail).
   - Verify: `npm run build`/`lint`/`type-check` PASS. **Chưa** verify tay qua Playwright (dev
     server cục bộ không lên được trong session này do 1 process Node cũ từ session trước treo
     ở port 3000 — đã kill, nhưng chưa retest UI thật; luồng upload ảnh qua R2 thật cũng chưa
     test tay vì thiếu credential ở máy dev).
3. **Phase C — done, đóng nốt backlog #4**: admin user management + sort_order/reorder.

### Session này (UX polish trước Phase C + Phase C: users CRUD, sort_order/reorder)
Plan file: `parallel-soaring-clover.md` (Part 0-3, toàn bộ đã hoàn tất). Chưa commit lúc bắt
đầu session — tất cả nằm trong 1 lần verify + commit cuối session này.

1. **Part 0 — Font tiếng Việt**: `app/layout.tsx` thêm subset `"vietnamese"` cho cả 3
   `next/font/google` (Space Grotesk/Archivo Black/IBM Plex Mono) — sửa lỗi dấu tiếng Việt fallback
   sang system font ở route `/vi`.
2. **Part 1 — Ảnh + tags thật trên public pages**: `PostCard.tsx`/`BrokerCard.tsx` render
   `featured_image`/`logo_url` qua `next/image` khi có, giữ placeholder cũ khi null.
   `app/[locale]/blog/[slug]/page.tsx` thêm hero image + tag chips (dùng `getPostTags()` có sẵn
   từ `lib/posts.ts`, không code lại).
3. **Part 2 — Admin mobile card layout**: `app/admin/posts/page.tsx` + `brokers/page.tsx` — bảng
   cũ (`overflow-x-auto`) giữ nguyên từ `sm:` trở lên, thêm card list riêng cho `<sm` dùng chung
   handler (`openDetail`/`handleDelete`/reorder) — hết cuộn ngang trên mobile.
4. **Part 3 — Phase C**:
   - Migration `008_content_ranking/` — thêm `sort_order` cho `posts`/`brokers` + backfill.
   - `lib/db.ts` — thêm `withTransaction()` helper (row lock `FOR UPDATE`, dùng bởi reorder).
   - `lib/adminUsers.ts` (mới) — `assertNotLastSuperadmin(userId)`: chặn xoá/hạ quyền/deactivate
     superadmin cuối cùng còn active; self-delete chặn riêng trong `deleteHandler`.
   - `app/api/admin/users/route.ts` + `[id]/route.ts` — CRUD đầy đủ, `bcryptjs` hash, không bao
     giờ trả `password_hash`, log `admin_audit_log` cho mọi mutation.
   - `lib/reorder.ts` (mới) — `reorderRow(tableName, id, direction)` dùng chung bởi
     `app/api/admin/posts/[id]/reorder/route.ts` + `brokers/[id]/reorder/route.ts` (transaction +
     row lock, tiebreak `sort_order DESC, updated_at DESC, id DESC` khớp thứ tự list mặc định).
   - UI: `components/admin/UserForm.tsx`, `app/admin/users/{page,new,[id]/edit}.tsx`,
     `app/admin/layout.tsx` thêm nav "Users" (chỉ superadmin), nút ▲▼ (44px) trên Posts/Brokers.
5. **Gap tự phát hiện + fix trong lúc verify Phase C**:
   - **Bug thật, đã fix**: `isFkRestrictError()` trong `app/api/admin/users/[id]/route.ts` chỉ
     check `err.code === 'ER_ROW_IS_REFERENCED_2'` (1451) — nhưng MySQL thực tế throw
     `ER_ROW_IS_REFERENCED` (1217, không kèm chi tiết bảng/constraint trong message) cho câu
     lệnh `DELETE` này, tuỳ ngữ cảnh câu query mà MySQL chọn 1 trong 2 code. Kết quả: xoá user là
     tác giả post có sẵn (`posts.author_id ... ON DELETE RESTRICT`) trả về 500 "Internal server
     error" thay vì 409 thân thiện. Đã fix: check cả 2 code
     (`ER_ROW_IS_REFERENCED || ER_ROW_IS_REFERENCED_2`). Đã verify bằng script Node gọi thẳng
     `mysql2` để xác nhận `err.code`/`errno` thật trước khi sửa, không đoán. Các chỗ khác dùng
     pattern tương tự (`isDuplicateEntryError` / `ER_DUP_ENTRY`, 6 route file) đã kiểm tra riêng —
     `ER_DUP_ENTRY` (1062) chỉ có 1 code, không bị lỗi tương tự, không cần sửa.
   - Môi trường: `eslint.config.js` thêm `.claude/**` vào `ignores` (lint quét nhầm thư mục
     session Claude); sửa `node_modules/pino` bị lỗi cài đặt (chặn dev server khởi động).
6. **Verify toàn bộ Part 0-3**: `npm run build`/`lint`/`type-check` PASS; `db-changelog.sh` chạy
   lại xác nhận idempotent (`PASS=0 SKIP=12 FAIL=0`, kể cả batch `008` mới). Playwright:
   ảnh/tag hiển thị đúng trên `/blog/[slug]` + card grid, tiếng Việt render đúng font ở `/vi`,
   admin Posts/Brokers ở 375px dùng card layout (hết cuộn ngang), tạo user mới qua
   `/admin/users/new` thành công, PATCH tự hạ quyền superadmin cuối cùng → chặn đúng message,
   xoá user là tác giả post → 409 đúng message (sau khi fix bug trên), ▲▼ reorder Posts/Brokers
   persist sau full page reload, nav active-state (`pathname.startsWith(href)`) highlight đúng
   route hiện tại — không có console error nào trong suốt quá trình test.

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
6. ~~**Market data ticker — số liệu tỷ giá/giá thị trường thật**~~ — **ĐÃ BUILD** (session này,
   qua plan đã duyệt `fluffy-juggling-valiant`). Multi-provider pipeline thay `TICKER_DATA`
   hardcode: 14 symbol cố định (forex ×7 qua Twelve Data + FCS fallback, crypto BTC/ETH qua
   CoinGecko, commodity XAU/XAG qua Gold-API.com, stock AAPL/TSLA/MSFT qua Alpaca), migration
   `db/changelog/009_market_data/` (`market_data_symbols` + `market_data_snapshots`), orchestrator
   `lib/marketData/refresh.ts` (1 provider lỗi chỉ bỏ qua symbol đó, giữ nguyên giá cũ trong DB —
   không làm trắng cả ticker), endpoint cron-only `POST /api/internal/market-data/refresh` (secret
   header, `lib/internalAuth.ts`, không dùng `requireAdmin`), cache-aside công khai
   `getMarketDataSnapshot()` (mirror `lib/settings.ts`, TTL 20 phút), admin `/admin/market-data`
   (superadmin, toggle `is_active` + reorder + stale badge), cron `scripts/refresh-market-data.sh`
   mỗi 15 phút.
   Verify: lint + build + migration PASS, mock E2E (`MARKET_DATA_MOCK=true`) refresh 14/14 symbol
   thành công, 401 khi secret sai/thiếu, homepage SSR render đúng dữ liệu.
   **Còn lại (không phải code)**: user tự đăng ký API key thật (Twelve Data, FCS API, Alpaca) rồi
   set `MARKET_DATA_MOCK=false` trước khi deploy production — chưa làm. Also chưa re-verify riêng
   3 kịch bản: cách ly lỗi 1 provider, admin-toggle propagate ngay ra ticker công khai, và thứ tự
   reorder trên UI đang chạy (logic mirror `brokers` đã test, nhưng chưa click tay lại lần này).
   **BUG PHÁT HIỆN SAU (session này, 2026-08-07)**: ticker không update tự động trên production —
   root cause là `scripts/crontab.example` (chứa cron `*/15 * * * *` gọi
   `/api/internal/market-data/refresh`) chỉ là file mẫu, chưa từng được cài tự động ở đâu
   (không có trong `setup-server.sh` cũ, không có trong `deploy.yml`/`deploy.sh`) → endpoint
   refresh nhiều khả năng chưa từng được gọi trên VPS → `market_data_snapshots` rỗng (migration
   `009` chỉ seed symbol, không seed snapshot) → ticker không có số. **Đã fix**: `setup-server.sh`
   giờ tự cài `/etc/cron.d/pipsnote` từ `scripts/crontab.example` (bước 5/6, idempotent). **Vẫn
   cần làm tay 1 lần** vì VPS hiện tại đã qua `setup-server.sh` bản cũ (không có bước cài cron):
   SSH vào VPS, chạy lại `bash scripts/setup-server.sh` (an toàn, các bước khác đều idempotent/no-op
   nếu đã có) hoặc copy tay `scripts/crontab.example` → `/etc/cron.d/pipsnote` + `chmod 644` +
   reload cron. Đồng thời kiểm tra lại GitHub Secret `MARKET_DATA_MOCK` (rất có thể vẫn là `true`
   theo commit `e2a3e4f`) — `TWELVEDATA_API_KEY`/`FCSAPI_API_KEY`/`ALPACA_API_KEY`/
   `ALPACA_API_SECRET` **chưa tồn tại trong GitHub Secrets** (`gh secret list` xác nhận, 2026-08-07)
   nên dù tắt mock, forex ×7 + stock ×3 vẫn sẽ fail (crypto qua CoinGecko và commodity qua
   Gold-API không cần key nên sẽ chạy được ngay).
   **Verify thực tế (session này)**: gọi thẳng `coinGeckoProvider.fetchQuotes()` và
   `goldApiProvider.fetchQuotes()` (qua `tsx`, không qua mock) → trả về giá live thật (BTC ~$64.8k,
   ETH ~$1.9k, XAU ~$4342, XAG ~$63.6) — xác nhận code provider hoạt động đúng với dữ liệu thị
   trường thực, không chỉ mock. **Fix bổ sung**: nhận ra `setup-server.sh` chỉ chạy 1 lần thủ công
   (không nằm trong luồng CI), nên fix cài cron ở đó không tự áp dụng cho VPS đã provision sẵn qua
   `git push` bình thường. Đã thêm bước cài cron **idempotent, best-effort** (dùng `sudo -n`, không
   fatal nếu thiếu quyền) vào `scripts/deploy.sh` (bước 6/8, chạy ở MỌI lần CI deploy) — nghĩa là
   lần deploy production tiếp theo qua `git push` sẽ tự đồng bộ cron mà không cần SSH tay, MIỄN LÀ
   user SSH trên VPS (`VPS_USER` trong secret) có passwordless sudo; nếu không, deploy sẽ log warn
   và vẫn cần làm tay như hướng dẫn ở trên. `MARKET_DATA_MOCK` + 4 provider key vẫn là việc cấu hình
   secret, không phải code — chưa đổi.
7. ~~**Bug: UI tiếng Việt bị vỡ layout so với bản tiếng Anh**~~ — **ĐÃ FIX** (session này).
   Root cause xác nhận bằng Playwright screenshot so sánh `/` (en) vs `/vi` ở 375px + 1280px:
   `h1, h2, h3 { line-height: 1.05 }` (`app/globals.css`) quá chật cho dấu tiếng Việt (đặc biệt
   dấu nặng dưới `ị`/`ọ`/`ạ` trong font Archivo Black cực đậm) — các dòng đè/chồng lên nhau ở
   Hero headline và section heading, KHÔNG xảy ra ở bản tiếng Anh (không có dấu). Đã test loại trừ
   giả thuyết font-fallback (thêm `vietnamese` subset cho Archivo Black, restart + xoá cache —
   không đổi gì, nên revert lại, không phải nguyên nhân). Fix: `line-height: 1.05` → `1.25` (1
   dòng CSS, áp dụng chung h1-h3 cả 2 locale — bản tiếng Anh vẫn đẹp, chỉ giãn dòng nhẹ hơn).
   Verify: `npm run lint` + `npm run build` PASS, Playwright chụp lại `/` + `/vi` ở 375px + 1280px
   xác nhận hết chồng dòng.
   - ~~**Gap phát hiện thêm khi test**: `/vi/blog` và `/vi/brokers` thiếu i18n key~~ — **ĐÃ FIX**
     (cùng session). Thêm namespace `blogList`/`brokersList` vào `messages/en.json`+`vi.json`
     (tái dùng `home.tradingPartners`/`home.insightsAnalysis` cho phần eyebrow trùng nghĩa).
     `app/[locale]/blog/page.tsx` + `brokers/page.tsx`: static `metadata` → `generateMetadata()` +
     `getTranslations()` (theo đúng pattern trang pháp lý). `blog/category/[slug]/page.tsx`: giữ
     nguyên `generateMetadata()` DB-driven, chỉ dịch 2 string tĩnh (`eyebrow`, `emptyMessage`)
     truyền vào `BlogListView`. Verify: `npm run lint` + `npm run build` PASS.

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
