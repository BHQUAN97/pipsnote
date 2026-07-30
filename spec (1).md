# PIPSNOTE — Forex & Crypto Affiliate Blog Platform
## Product Specification v1.4

> **Mục tiêu kinh doanh:** Trang trung gian (affiliate) về Forex/Crypto nhắm thị trường châu Âu/Mỹ. Thu nhập từ affiliate commission khi user click qua link đăng ký sàn giao dịch + Google Ads revenue. Ngôn ngữ chính: Tiếng Việt (có thể mở rộng EN sau).

---

## 1. TỔNG QUAN HỆ THỐNG

### 1.1 Loại dự án
- **Content + Affiliate Marketing Site** với real-time price widget
- Không phải SaaS, không cần user auth phía public
- Admin-only backend để quản lý nội dung
- Traffic mục tiêu: SEO organic + Google Ads → EU/US market

### 1.2 Tech Stack được chọn

| Layer | Công nghệ | Lý do |
|---|---|---|
| Frontend (Public) | **Next.js 14 (App Router)** | SSG/ISR cho SEO, fast LCP, image optimization built-in |
| Frontend (Admin) | **Next.js 14** (cùng repo, route `/admin`) | Solo dev — 1 repo dễ maintain |
| Backend API | **Node.js + Express** hoặc **Next.js Route Handlers** | Đơn giản, JS/TS unified |
| Database | **MySQL 8** | Quen tay, production-proven |
| Cache | **Redis** | Session, rate limit, price cache |
| Search | **Meilisearch** (self-host) | Full-text tiếng Việt, free tier, dễ Docker |
| File Storage | **Cloudflare R2** | S3-compatible, free egress, CDN tích hợp |
| Real-time Price | **Binance REST poll (15s) + SSE → browser** | Delay 30s chấp nhận được, đơn giản hơn WS, không cần config Nginx đặc biệt |
| Reverse Proxy | **Nginx** | SSL termination, rate limiting, static cache |
| Containerization | **Docker Compose** | Solo dev workflow |
| CI/CD | **GitHub Actions → VPS** | Push-to-deploy |
| Analytics | **Plausible** (self-host) hoặc **GA4** | Privacy-friendly, EU-compliant |

### 1.3 Tại sao không dùng WordPress
- WordPress chậm với traffic EU/US nếu không optimize kỹ
- Khó custom affiliate tracking logic
- Next.js + SSG cho Core Web Vitals tốt hơn → Google Ads Quality Score cao hơn
- Control tốt hơn với real-time price data

---

## 2. KIẾN TRÚC HỆ THỐNG

```
[Cloudflare CDN/DNS]
        ↓
[VPS Ubuntu 22.04]
        ↓
[Nginx - SSL, rate limit, cache headers]
        ↓
[Docker Network]
    ├── next-app (port 3000) — Public + Admin UI
    ├── api-server (port 4000) — REST API (nếu tách riêng)
    ├── mysql (port 3306, internal only)
    ├── redis (port 6379, internal only)
    ├── meilisearch (port 7700, internal only)
    └── plausible (port 8000) — Analytics
```

### 2.1 Nginx config key points

```nginx
# --- Global security ---
server_tokens off;                    # Ẩn Nginx version
client_max_body_size 10M;             # Chặn upload lớn (image tối đa)
client_body_timeout 15s;
client_header_timeout 15s;

# --- Rate limiting zones (định nghĩa 1 lần, dùng nhiều nơi) ---
limit_req_zone $binary_remote_addr zone=global:10m rate=30r/s;    # 30 req/s per IP
limit_req_zone $binary_remote_addr zone=admin_login:10m rate=5r/m; # 5 login/min per IP
limit_req_zone $binary_remote_addr zone=go:10m rate=10r/s;         # 10 click/s per IP

# --- Security headers (áp dụng toàn site) ---
add_header X-Frame-Options            "SAMEORIGIN" always;
add_header X-Content-Type-Options     "nosniff" always;
add_header Referrer-Policy            "strict-origin-when-cross-origin" always;
add_header Permissions-Policy         "geolocation=(), microphone=(), camera=()" always;
add_header Strict-Transport-Security  "max-age=31536000; includeSubDomains; preload" always;
# CSP đặt trong Next.js (dynamic) — tránh conflict với Cloudflare

# --- Chặn path scan phổ biến (wp-admin, .env, .git, phpMyAdmin...) ---
location ~ /\.(env|git|htaccess|svn) { deny all; return 404; }
location ~ ^/(wp-admin|wp-login|phpmyadmin|xmlrpc\.php) { deny all; return 404; }

# --- Static assets: cache mạnh ---
location ~* \.(js|css|png|jpg|ico|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# --- Public Next.js ---
location / {
    limit_req zone=global burst=60 nodelay;
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_valid 200 10m;
}

# --- Admin: rate limit chặt hơn + không cache ---
location /admin {
    limit_req zone=global burst=20 nodelay;
    proxy_pass http://localhost:3000;
    proxy_cache_bypass 1;
    proxy_no_cache 1;
    add_header Cache-Control "no-store" always;
}

# --- Admin login riêng: brute-force protection ---
location = /admin/login {
    limit_req zone=admin_login burst=3 nodelay;
    proxy_pass http://localhost:3000;
}
```

---

## 3. DATABASE SCHEMA

```sql
-- Bài viết blog
CREATE TABLE posts (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    slug        VARCHAR(200) UNIQUE NOT NULL,
    title       VARCHAR(500) NOT NULL,
    excerpt     TEXT,
    content     LONGTEXT,          -- HTML từ rich text editor
    thumbnail   VARCHAR(500),      -- Cloudflare R2 URL
    category_id INT,
    author_id   INT,
    status      ENUM('draft','published','archived') DEFAULT 'draft',
    is_featured TINYINT DEFAULT 0,
    view_count  INT DEFAULT 0,
    read_time   INT,               -- phút đọc (auto-calc)
    seo_title   VARCHAR(200),
    seo_desc    VARCHAR(300),
    seo_keywords VARCHAR(500),
    published_at DATETIME,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status_pub (status, published_at),
    INDEX idx_slug (slug)
);

-- Danh mục
CREATE TABLE categories (
    id      INT AUTO_INCREMENT PRIMARY KEY,
    name    VARCHAR(100),
    slug    VARCHAR(100) UNIQUE,
    parent_id INT DEFAULT NULL     -- Sub-category support
);

-- Sàn giao dịch / Broker / Exchange
CREATE TABLE brokers (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    slug            VARCHAR(200) UNIQUE,
    logo_url        VARCHAR(500),
    type            ENUM('forex','crypto','stock','all') DEFAULT 'forex',
    affiliate_url   TEXT NOT NULL,          -- Link affiliate tracking
    affiliate_code  VARCHAR(100),           -- Mã ref nếu cần append
    rating          DECIMAL(3,1),           -- Ví dụ: 4.5
    badge           VARCHAR(50),            -- 'Hot', 'Phổ biến', 'Mới', etc.
    min_deposit     VARCHAR(50),
    leverage        VARCHAR(50),
    spread_from     VARCHAR(50),
    regulation      VARCHAR(200),
    features        JSON,                   -- ['MT4','MT5','CopyTrade']
    pros            JSON,
    cons            JSON,
    is_featured     TINYINT DEFAULT 0,
    is_active       TINYINT DEFAULT 1,
    click_count     INT DEFAULT 0,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Coin/Chứng khoán được theo dõi
CREATE TABLE watchlist (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    symbol      VARCHAR(50) NOT NULL,      -- 'BTC', 'EURUSD', 'AAPL'
    name        VARCHAR(200),
    type        ENUM('crypto','forex','stock','commodity'),
    source      VARCHAR(50),               -- 'binance','alphavantage','manual'
    is_active   TINYINT DEFAULT 1,
    sort_order  INT DEFAULT 0
);

-- Theo dõi click affiliate
CREATE TABLE affiliate_clicks (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    broker_id   INT,
    post_id     BIGINT DEFAULT NULL,       -- Click từ bài viết nào
    page_path   VARCHAR(500),
    ip_hash     VARCHAR(64),               -- Hash để tránh lưu raw IP (GDPR)
    user_agent  TEXT,
    country     VARCHAR(5),               -- GeoIP 2-letter code
    referer     VARCHAR(500),
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_broker_date (broker_id, created_at),
    INDEX idx_country (country)
);

-- Page view tracking
CREATE TABLE page_views (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    path        VARCHAR(500),
    country     VARCHAR(5),
    referer     VARCHAR(500),
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_path_date (path, created_at)
);

-- Admin users
CREATE TABLE admin_users (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    email       VARCHAR(200) UNIQUE,
    password    VARCHAR(255),              -- bcrypt
    name        VARCHAR(200),
    role        ENUM('superadmin','editor') DEFAULT 'editor',
    last_login  DATETIME,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Newsletter subscribers
CREATE TABLE subscribers (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    email       VARCHAR(200) UNIQUE,
    status      ENUM('active','unsubscribed') DEFAULT 'active',
    source      VARCHAR(100),
    country     VARCHAR(5),
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. TRANG CÔNG KHAI (PUBLIC SITE)

### 4.1 Trang chủ `/`
**Sections:**
1. **Ticker bar** — Giá real-time (Forex + Crypto) chạy ngang, WebSocket
2. **Hero** — Headline, CTA đến broker list và blog
3. **Top Brokers** — 6 sàn nổi bật, affiliate link, sorted by `is_featured`
4. **Price Widget** — Bảng giá live (Crypto + Forex pairs được config)
5. **Bài viết nổi bật** — 6 posts `is_featured = 1`
6. **Danh mục phổ biến** — Grid category cards
7. **Newsletter signup**
8. **Comparison CTA** — Banner dẫn sang trang so sánh sàn

**Rendering:** `ISR` revalidate 60s cho broker/post, WebSocket cho price

### 4.2 Blog `/blog`
- Danh sách bài, filter theo category (query param `?cat=review-san`)
- Pagination (hoặc infinite scroll)
- Search tích hợp Meilisearch
- Sidebar: Top Brokers mini widget + Tags cloud

### 4.3 Bài viết chi tiết `/blog/[slug]`
- Full content HTML
- **Related posts** (cùng category)
- **Broker CTA box** trong bài viết (configured per-post hoặc global)
- Schema.org `Article` markup cho SEO
- Reading time, publish date, author

### 4.4 Broker Directory `/brokers`
- Danh sách tất cả broker
- Filter: loại sàn (forex/crypto), min deposit, regulation
- Bảng so sánh (checkbox → compare modal)

### 4.5 Broker Detail `/brokers/[slug]`
- Full review: pros/cons, specs, rating
- Affiliate CTA button (tracked)
- Review từ bài blog liên quan
- Schema.org `Review` markup

### 4.6 So sánh `/compare?a=ic-markets&b=xm`
- So sánh 2–3 sàn side by side
- URL shareable

### 4.7 Trang tĩnh
- `/about` — Giới thiệu, affiliate disclosure
- `/contact` — Form liên hệ
- `/privacy-policy`, `/terms`, `/risk-disclosure`
- `/sitemap.xml` — Auto-generate
- `/robots.txt`

---

## 5. PRICE WIDGET — TICKER BAR (DELAY ≤30s)

> **Quyết định:** Dùng SSE (Server-Sent Events) + Redis pub/sub thay vì WebSocket thuần.
> Delay 30s chấp nhận được → không cần WS upstream từ Binance.

### 5.1 Nguồn dữ liệu

| Loại | API | Free tier | Poll interval |
|---|---|---|---|
| Crypto | **Binance REST** `GET /api/v3/ticker/24hr` | Unlimited (weight 40/req) | 15s |
| Forex | **Exchangerate.host** hoặc **FreeCurrencyAPI** | 1500 req/month | 30s |
| Chứng khoán | **Alpha Vantage** | 500 req/day | 60s |

Binance REST weight limit: 1200/min. Poll 15s × symbols batch = an toàn.

### 5.2 Architecture

```
Binance REST (poll 15s)       Exchangerate.host (poll 30s)
        │                               │
        └──────────────┬────────────────┘
                       ▼
               Price Poller (singleton Node.js process)
               — chạy khi Next.js app start
                       │
               Redis SET "prices:latest" (TTL 60s)
               Redis PUBLISH "prices:update"
                       │
               GET /api/prices/stream  ← SSE endpoint
                       │
               Browser EventSource
                       │
               Ticker bar re-render (React state)
```

**Tại sao SSE thay vì WebSocket:**
- Ticker chỉ cần server → client (một chiều) — WS là overkill
- Browser tự reconnect khi mất kết nối (built-in)
- Nginx không cần upgrade protocol, config đơn giản hơn
- Hoạt động tốt qua HTTP/2

### 5.3 Price Poller — singleton khởi động cùng app

```typescript
// lib/prices/poller.ts
const CRYPTO_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT'];

async function fetchCryptoPrices(): Promise<PriceData[]> {
  // Binance public REST — không cần API key
  const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${
    JSON.stringify(CRYPTO_SYMBOLS)
  }`;
  const res = await fetch(url);
  const data = await res.json();
  return data.map((t: any) => ({
    symbol: t.symbol.replace('USDT', '/USDT'),
    price: parseFloat(t.lastPrice).toLocaleString('en-US', { maximumFractionDigits: 2 }),
    change: parseFloat(t.priceChangePercent),
    dir: parseFloat(t.priceChangePercent) >= 0 ? 'up' : 'down',
  }));
}

export async function startPricePoller() {
  const poll = async () => {
    try {
      const [crypto, forex] = await Promise.allSettled([
        fetchCryptoPrices(),
        fetchForexPrices(),
      ]);
      const prices = [
        ...(crypto.status === 'fulfilled' ? crypto.value : []),
        ...(forex.status === 'fulfilled'  ? forex.value  : []),
      ];
      if (prices.length > 0) {
        // Cache giá mới nhất — client mới connect lấy ngay, không phải đợi poll
        await redis.set('prices:latest', JSON.stringify(prices), 'EX', 60);
        // Fan-out đến tất cả SSE clients qua Redis pub/sub
        await redis.publish('prices:update', JSON.stringify(prices));
      }
    } catch (err) {
      console.error('[Poller]', err); // Không throw — poller phải sống tiếp
    }
  };

  await poll();                    // Chạy ngay lần đầu khi boot
  setInterval(poll, 15_000);      // Sau đó mỗi 15s
}
```

### 5.4 SSE Endpoint

```typescript
// app/api/prices/stream/route.ts
export const dynamic = 'force-dynamic'; // Không cache route này

export async function GET(req: NextRequest) {
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      // Gửi ngay cached price khi client connect → không phải đợi poll tiếp theo
      const cached = await redis.get('prices:latest');
      if (cached) send(JSON.parse(cached));

      // Subscribe Redis — mỗi SSE connection cần redis connection riêng
      const sub = redis.duplicate();
      await sub.subscribe('prices:update', (msg) => send(JSON.parse(msg)));

      req.signal.addEventListener('abort', () => {
        sub.unsubscribe();
        sub.quit();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache, no-transform',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no', // Nginx không buffer SSE response
    },
  });
}
```

### 5.5 Client — TickerBar Component

```tsx
// components/public/TickerBar/index.tsx — 'use client'
export function TickerBar() {
  const [prices, setPrices] = useState<Price[]>([]);

  useEffect(() => {
    const connect = () => {
      const es = new EventSource('/api/prices/stream');
      es.onmessage = (e) => setPrices(JSON.parse(e.data));
      es.onerror   = () => { es.close(); setTimeout(connect, 5_000); }; // auto-reconnect
      return es;
    };
    const es = connect();
    return () => es.close();
  }, []);

  if (prices.length === 0) return <TickerSkeleton />; // Tránh layout shift

  const items = [...prices, ...prices]; // Duplicate để CSS scroll loop
  return (
    <div className="ticker-strip" aria-hidden="true">
      <div className="ticker-track">
        {items.map((p, i) => (
          <span key={i} className="ticker-item">
            <span className="pair">{p.symbol}</span>
            <span className={p.dir}>
              {p.price} {p.dir === 'up' ? '▲' : '▼'}
              <small> {p.change > 0 ? '+' : ''}{p.change.toFixed(2)}%</small>
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
```

### 5.6 Nginx config cho SSE

```nginx
location /api/prices/stream {
    proxy_pass          http://localhost:3000;
    proxy_http_version  1.1;
    proxy_set_header    Connection '';   # Giữ keep-alive
    proxy_buffering     off;             # Bắt buộc — buffer sẽ làm SSE không stream
    proxy_cache         off;
    proxy_read_timeout  3600s;           # 1h timeout cho SSE connection dài
    chunked_transfer_encoding on;
}
```

### 5.7 Fallback khi API lỗi

- Nếu Binance lỗi → trả giá cached trong Redis (TTL 60s), user không thấy màn hình trống
- Nếu Redis lỗi → Poller tiếp tục poll, SSE clients sẽ reconnect và nhận data tiếp theo
- Nếu cả hai → TickerSkeleton hiển thị placeholder animation

### 5.8 Config symbols trong Admin

Admin quản lý bảng `watchlist` — thêm/bớt symbols, chọn nguồn, đặt thứ tự.
Poller đọc config từ DB khi khởi động (hoặc hot-reload qua Redis signal).

---

## 6. AFFILIATE LINK TRACKING — ZERO MISS CLICK

> **Vấn đề cốt lõi:** Client-side tracking (`fetch` rồi redirect) bị browser hủy request khi user navigate → miss 15–30% click trên mobile.
> **Giải pháp:** Server-side redirect — click được ghi trong chính request lifecycle, không phụ thuộc JS.

### 6.1 URL Pattern — Cloaked Link

Mọi affiliate link đều đi qua `/go/[slug]`, không bao giờ expose URL affiliate thật trong HTML:

```
/go/ic-markets   →  ghi DB  →  302 redirect  →  https://icmarkets.com/?ref=xxx
/go/xm           →  ghi DB  →  302 redirect  →  https://xm.com/register?ref=yyy
```

**Lợi ích kép:** không miss click + link cloaking (URL đẹp, ẩn affiliate param xấu).

### 6.2 Flow chi tiết

```
[User click <a href="/go/ic-markets">]
        │
        ▼  GET /go/ic-markets
[Next.js Route Handler]
        │
        ├─ 1. Lookup broker by slug (DB)
        ├─ 2. Bot check (User-Agent regex filter)
        ├─ 3. Dedup check (Redis SET NX — atomic, TTL 10 phút)
        ├─ 4. GeoIP lookup (MaxMind local DB, ~1ms)
        ├─ 5. INSERT affiliate_clicks  ← await — ghi xong mới redirect
        └─ 6. 302 Redirect → affiliate_url
```

### 6.3 Route Handler `/go/[slug]`

```typescript
// app/go/[slug]/route.ts
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const broker = await db.query(
    'SELECT id, affiliate_url, is_active FROM brokers WHERE slug = ? LIMIT 1',
    [params.slug]
  );

  // Fallback graceful — không để user thấy 404
  if (!broker || !broker.is_active) {
    return NextResponse.redirect('/brokers');
  }

  const ip      = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  const ipHash  = sha256(ip + process.env.IP_SALT!);  // GDPR: không lưu raw IP
  const ua      = req.headers.get('user-agent') ?? '';
  const referer = req.headers.get('referer') ?? '';
  const country = getGeoFromIP(ip);                    // MaxMind local DB
  const sourcePath = referer ? new URL(referer).pathname : 'direct';

  // Bot → redirect nhưng không ghi vào analytics
  if (isBot(ua)) {
    return NextResponse.redirect(broker.affiliate_url, { status: 302 });
  }

  // Dedup atomic (SET NX) — 1 ip_hash/broker không đếm 2 lần trong 10 phút
  const dupKey = `click:${ipHash}:${broker.id}`;
  const isNew  = await redis.set(dupKey, '1', 'NX', 'EX', 600);
  if (!isNew) {
    return NextResponse.redirect(broker.affiliate_url, { status: 302 });
  }

  // Ghi click — PHẢI await trước khi redirect, không được fire-and-forget
  await db.query(
    `INSERT INTO affiliate_clicks (broker_id, page_path, ip_hash, country, user_agent, referer)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [broker.id, sourcePath, ipHash, country, ua.slice(0, 500), referer.slice(0, 500)]
  );

  // click_count counter — best-effort, không block redirect
  db.query('UPDATE brokers SET click_count = click_count + 1 WHERE id = ?', [broker.id])
    .catch(() => {});

  return NextResponse.redirect(broker.affiliate_url, {
    status: 302,
    headers: {
      'Cache-Control': 'no-store',   // Cloudflare/Nginx không cache /go/*
      'X-Robots-Tag':  'noindex',    // Google không index redirect URL
    },
  });
}
```

### 6.4 AffiliateButton Component

```tsx
// components/public/AffiliateButton.tsx
// rel="sponsored" bắt buộc theo Google Webmaster Guidelines cho affiliate link
export function AffiliateButton({ broker }: { broker: Broker }) {
  return (
    <a
      href={`/go/${broker.slug}`}
      target="_blank"
      rel="nofollow noopener sponsored"
      className="broker-cta"
    >
      Mở tài khoản →
    </a>
  );
}
```

### 6.5 Bot Filter & Dedup Guard

```typescript
// lib/click-guard.ts
const BOT_PATTERNS = /bot|crawl|spider|slurp|mediapartners|googlebot/i;
export const isBot = (ua: string) => BOT_PATTERNS.test(ua);

// SET NX là atomic — không race condition dù nhiều request cùng lúc
export async function tryMarkClick(ipHash: string, brokerId: number): Promise<boolean> {
  const result = await redis.set(`click:${ipHash}:${brokerId}`, '1', 'NX', 'EX', 600);
  return result === 'OK'; // true = click mới hợp lệ
}
```

### 6.6 Nginx — bắt buộc bypass cache cho `/go/*`

```nginx
# /go/* KHÔNG được cache ở bất kỳ layer nào — mỗi request phải hit server để ghi DB
location /go/ {
    proxy_pass          http://localhost:3000;
    proxy_no_cache      1;
    proxy_cache_bypass  1;
    add_header Cache-Control "no-store, no-cache" always;
}
```

Cloudflare Cache Rule bổ sung: `/go/*` → **Cache: Bypass** (bắt buộc nếu dùng Cloudflare proxy).

### 6.7 GDPR Compliance

| Yêu cầu | Giải pháp |
|---|---|
| Không lưu raw IP | `SHA-256(ip + salt)` — không thể reverse |
| Country tracking | MaxMind GeoIP2 Lite — self-host, miễn phí |
| Cookie consent | Banner bắt buộc cho EU visitor trước khi track |
| Affiliate disclosure | Text prominent trên mọi trang có `/go/` link |
| Data retention | Xóa `affiliate_clicks` sau 12 tháng (cron job) |

### 6.8 Schema hỗ trợ multi-link / broker đổi URL

```sql
-- Hỗ trợ nhiều link/broker (khác campaign, khác vùng địa lý)
-- Khi broker đổi URL → UPDATE 1 row, không cần redeploy
CREATE TABLE broker_links (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    broker_id     INT NOT NULL,
    label         VARCHAR(100),          -- 'default', 'campaign-eu', 'banner-sidebar'
    affiliate_url TEXT NOT NULL,
    is_default    TINYINT DEFAULT 0,
    click_count   INT DEFAULT 0,
    is_active     TINYINT DEFAULT 1,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_broker_default (broker_id, is_default)
);
```

Route `/go/[slug]` ưu tiên `broker_links WHERE is_default = 1 AND is_active = 1`, fallback về `brokers.affiliate_url`.

---

## 7. ADMIN PANEL `/admin`

### 7.1 Auth
- Email + Password (bcrypt)
- JWT session (httpOnly cookie, 24h expire)
- Rate limit login: 5 attempts/15min
- Không có public registration

### 7.2 Dashboard `/admin`
**Widgets:**
- Tổng view hôm nay / 7 ngày / 30 ngày
- Top 5 trang được xem nhiều nhất
- Top 5 broker được click nhiều nhất
- Click theo quốc gia (map hoặc table)
- Biểu đồ traffic 30 ngày (line chart)
- Traffic sources (organic/ads/direct/referral)

### 7.3 Quản lý bài viết `/admin/posts`
- Danh sách với filter: status, category, date
- **Rich Text Editor:** `TipTap` (headless, React) hoặc `Quill`
  - Tại sao TipTap: extension-based, dễ add custom block cho Broker CTA
  - Support: heading, bold/italic, image upload (→ R2), table, code block, embed
  - **Custom block:** "Broker CTA" — chọn broker từ dropdown, render thành affiliate button trong bài
- SEO fields: title, meta description, focus keyword, OG image
- Auto-generate slug từ title (có thể edit tay)
- Preview trước khi publish
- Schedule publish (tương lai)
- Duplicate bài

### 7.4 Quản lý Broker/Sàn `/admin/brokers`
- CRUD broker
- Upload logo → R2
- Set affiliate URL + tracking param
- Toggle featured / active
- Xem số click của từng broker

### 7.5 Quản lý Coin/Symbol `/admin/watchlist`
- Thêm/bớt symbols hiển thị trong ticker và price widget
- Chọn nguồn dữ liệu (binance/forex/manual)
- Set thứ tự hiển thị (drag & drop)

### 7.6 Traffic Analytics `/admin/analytics`
**Tab 1: Traffic tổng quan**
- Page views theo ngày (bar chart)
- Unique visitors
- Top pages
- Traffic by country

**Tab 2: Affiliate Performance**
- Click theo broker (bar chart)
- Click timeline
- Click by country
- Click từ bài viết nào (post → broker funnel)
- CTR (clicks / views) per broker

**Tab 3: Content Performance**
- Top bài viết theo view
- Bài viết có conversion cao nhất (view → click affiliate)
- Search keywords (nếu có Meilisearch query log)

### 7.7 Subscribers `/admin/subscribers`
- Danh sách email subscribers
- Export CSV
- Xóa / unsubscribe

### 7.8 Cài đặt `/admin/settings`
- Site name, tagline, logo
- Google Analytics ID, Search Console verify code
- Default affiliate disclaimer text
- Social links
- Ad slots config (Google Ads Publisher ID, slot IDs)

---

## 8. SEO — CHIẾN LƯỢC CHO EU/US TRAFFIC

> **Bối cảnh:** Forex/Crypto là **YMYL (Your Money Your Life)** — Google xếp vào nhóm nội dung ảnh hưởng đến tài chính/sức khỏe → ranking cực khó với site mới. Phải build **E-E-A-T signals** (Experience, Expertise, Authoritativeness, Trustworthiness) song song với technical SEO.

### 8.1 Technical SEO Checklist

| Item | Chi tiết | Ưu tiên |
|---|---|---|
| `generateMetadata()` mọi route | Title unique, description 150–160 chars, canonical | Cao |
| Schema.org JSON-LD | Article, Review, BreadcrumbList, FAQPage, Organization | Cao |
| Open Graph + Twitter Card | OG image 1200×630 auto-generate per post | Cao |
| Canonical URL | Fix duplicate content, chọn URL chính | Cao |
| Sitemap.xml động | Split theo type: sitemap-posts, sitemap-brokers | Cao |
| robots.txt | Cho phép crawl `/blog`, `/brokers`, disallow `/admin`, `/go/*`, `/api` | Cao |
| Hreflang | Nếu có multi-lang (VI + EN) | Trung bình |
| `next/image` WebP | Auto responsive srcset | Cao |
| Font preload + `display=swap` | Chặn FOIT | Cao |
| IndexNow API | Ping Bing/Yandex khi publish | Thấp |

### 8.2 Core Web Vitals — Target 2026

Google năm 2024 đổi FID → **INP (Interaction to Next Paint)**. Target hiện tại:

| Metric | Good | Needs work | Poor |
|---|---|---|---|
| LCP | < 2.5s | 2.5–4s | > 4s |
| CLS | < 0.1 | 0.1–0.25 | > 0.25 |
| **INP** | < 200ms | 200–500ms | > 500ms |
| TTFB | < 800ms | 800–1800ms | > 1800ms |

**Chiến lược đạt target:**

```typescript
// next.config.js — optimization essentials
module.exports = {
  images: {
    formats: ['image/avif', 'image/webp'],   // AVIF < WebP < JPEG
    deviceSizes: [640, 828, 1200, 1920],
    minimumCacheTTL: 31536000,
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns'],   // Tree-shake mạnh
  },
  compress: true,
  poweredByHeader: false,
};
```

```tsx
// app/(public)/blog/[slug]/page.tsx — SSG cho blog post
export const revalidate = 3600;  // ISR 1h — cân bằng freshness vs cache hit

// Preload critical resources
export default function Post() {
  return (
    <>
      {/* Hero image LCP element — priority + fetchPriority */}
      <Image
        src={post.thumbnail}
        priority
        fetchPriority="high"
        width={1200} height={630}
        alt={post.title}
      />
      {/* Non-critical: lazy load */}
      <Image src={post.body_img} loading="lazy" ... />
    </>
  );
}
```

**Tránh CLS:**
- Mọi `<Image>` PHẢI có `width` + `height` explicit
- Ticker bar: reserve height ngay cả khi loading (skeleton — xem §5.5)
- Ads slot: đặt `min-height` cố định trước khi Ad load

**Tránh INP kém:**
- Không attach heavy JS listener trên `document`
- Debounce search input 300ms
- Use `useDeferredValue` cho filter list dài
- Ads script `async` — không block main thread

### 8.3 Schema.org JSON-LD

Đặt trong `layout.tsx` (Organization) và mỗi page type (Article/Review/FAQ).

```tsx
// components/seo/ArticleSchema.tsx
export function ArticleSchema({ post, author }: Props) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    image: [post.thumbnail],
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: {
      '@type': 'Person',
      name: author.name,
      url: `https://pipsnote.com/author/${author.slug}`,
      // E-E-A-T: expose credential
      jobTitle: author.title,
      sameAs: author.social_links,      // LinkedIn, X profile
    },
    publisher: {
      '@type': 'Organization',
      name: 'PIPSNOTE',
      logo: { '@type': 'ImageObject', url: 'https://pipsnote.com/logo.png' },
    },
    mainEntityOfPage: `https://pipsnote.com/blog/${post.slug}`,
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
```

**Broker Review — Schema `Review` với rating:**
```tsx
// components/seo/BrokerReviewSchema.tsx
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Review',
  itemReviewed: {
    '@type': 'FinancialService',    // Chính xác cho broker
    name: broker.name,
    url: broker.website,
  },
  reviewRating: {
    '@type': 'Rating',
    ratingValue: broker.rating,     // 4.5
    bestRating: 5,
  },
  author: { '@type': 'Organization', name: 'PIPSNOTE' },
  reviewBody: broker.summary,
  datePublished: broker.reviewed_at,
};
```

**FAQ Schema — có thể chiếm featured snippet:**
```tsx
const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(f => ({
    '@type': 'Question',
    name: f.question,
    acceptedAnswer: { '@type': 'Answer', text: f.answer },
  })),
};
```

**Breadcrumb Schema** — hiện trong Google SERP:
```tsx
const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: 'https://pipsnote.com' },
    { '@type': 'ListItem', position: 2, name: 'Blog',      item: 'https://pipsnote.com/blog' },
    { '@type': 'ListItem', position: 3, name: post.title },
  ],
};
```

### 8.4 E-E-A-T Signals — Bắt buộc cho YMYL

Google có Search Rater Guidelines dày ~180 trang. Với finance topic, thiếu E-E-A-T = không bao giờ rank top 10 cho keyword cạnh tranh.

**Author page `/author/[slug]` bắt buộc:**
```
- Ảnh thật
- Bio + credentials ("5 năm giao dịch forex", "CFA Level II candidate")
- Link LinkedIn, X profile
- Danh sách bài đã viết
- Link tới social nếu có content khác
```

**Bổ sung schema `admin_users`:**
```sql
ALTER TABLE admin_users ADD COLUMN slug         VARCHAR(100) UNIQUE;
ALTER TABLE admin_users ADD COLUMN bio          TEXT;
ALTER TABLE admin_users ADD COLUMN title        VARCHAR(200);   -- "Forex Analyst"
ALTER TABLE admin_users ADD COLUMN avatar_url   VARCHAR(500);
ALTER TABLE admin_users ADD COLUMN linkedin     VARCHAR(500);
ALTER TABLE admin_users ADD COLUMN twitter      VARCHAR(500);
ALTER TABLE admin_users ADD COLUMN credentials  JSON;           -- ["CFA L2","5y experience"]
```

**Editorial policy page `/editorial-policy`:**
- Quy trình fact-check
- Nguồn dữ liệu (Reuters, Bloomberg, official broker)
- Cam kết không phóng đại
- Cách xử lý affiliate disclosure

**Trang phải có:**
- `/about` — profile công ty/cá nhân, năm thành lập
- `/contact` — email + physical address (bắt buộc cho trust)
- `/editorial-policy` — quy trình biên tập
- `/methodology` — cách đánh giá broker (rating scale)
- `/affiliate-disclosure` — công khai model kinh doanh
- `/risk-disclosure` — cảnh báo rủi ro

**Trong mỗi bài blog:**
- Publish date + **updated date** (Google prefer content fresh)
- Author bio box cuối bài
- References/citations (link ra `.gov`, `.edu`, official broker sites)
- Last review date cho evergreen content

### 8.5 Content Architecture — Pillar + Cluster

```
Pillar page: /forex-la-gi (5000+ words, comprehensive)
    ↓ internal link
├── /blog/luot-song-forex-la-gi  (cluster)
├── /blog/don-bay-margin-hieu-nhu-the-nao  (cluster)
├── /blog/cach-chon-broker-forex  (cluster) → link tới /brokers
└── /blog/tam-ly-trader  (cluster)
```

**Trong DB:** thêm bảng `post_topics` để track cluster relationships:
```sql
CREATE TABLE post_topics (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    topic_slug   VARCHAR(200),         -- 'forex-basics', 'risk-management'
    pillar_post_id BIGINT,             -- Post pillar chính
    is_pillar    TINYINT DEFAULT 0
);
CREATE TABLE post_topic_map (
    post_id  BIGINT,
    topic_id INT,
    PRIMARY KEY (post_id, topic_id)
);
```

Component `<RelatedPillar>` tự động render trong bài cluster → link về pillar.

### 8.6 Programmatic SEO — Broker Comparison Pages

Sinh tự động 100+ URL kiểu `/compare/ic-markets-vs-xm` từ combinations. Đây là mỏ vàng SEO.

```tsx
// app/(public)/compare/[pair]/page.tsx
// pair = "ic-markets-vs-xm"

export async function generateStaticParams() {
  const brokers = await db.query('SELECT slug FROM brokers WHERE is_active = 1');
  const pairs: { pair: string }[] = [];
  for (let i = 0; i < brokers.length; i++) {
    for (let j = i + 1; j < brokers.length; j++) {
      pairs.push({ pair: `${brokers[i].slug}-vs-${brokers[j].slug}` });
    }
  }
  return pairs;  // 20 brokers → 190 pages
}

// Metadata dynamic per pair
export async function generateMetadata({ params }): Promise<Metadata> {
  const [a, b] = params.pair.split('-vs-');
  return {
    title: `${a.toUpperCase()} vs ${b.toUpperCase()}: So sánh chi tiết 2026 | PIPSNOTE`,
    description: `So sánh phí, đòn bẩy, spread, quy định giữa ${a} và ${b}. Đánh giá khách quan giúp bạn chọn broker phù hợp.`,
    alternates: { canonical: `https://pipsnote.com/compare/${params.pair}` },
  };
}
```

**Chú ý:** phải đảm bảo mỗi page có unique content (kéo data thật từ DB, không template rỗng) — nếu không sẽ bị coi là **doorway page** và bị Google phạt.

### 8.7 Internal Linking Strategy

Tự động thêm link khi mention broker trong bài viết:

```typescript
// lib/content/auto-link.ts
// Post-process HTML sau khi sanitize
export async function autoLinkBrokers(html: string): Promise<string> {
  const brokers = await db.query('SELECT name, slug FROM brokers WHERE is_active = 1');
  let result = html;
  for (const b of brokers) {
    // Chỉ replace lần đầu tiên tên xuất hiện, không phải link overkill
    const regex = new RegExp(`\\b(${escapeRegex(b.name)})\\b(?![^<]*</a>)`, 'i');
    result = result.replace(
      regex,
      `<a href="/brokers/${b.slug}" title="Đánh giá ${b.name}">$1</a>`
    );
  }
  return result;
}
```

Chạy khi render, không lưu vào DB (dễ maintain khi đổi broker slug).

### 8.8 Sitemap Strategy

```typescript
// app/sitemap.ts — Next.js native sitemap
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, brokers, categories] = await Promise.all([
    db.query('SELECT slug, updated_at FROM posts WHERE status = "published"'),
    db.query('SELECT slug, updated_at FROM brokers WHERE is_active = 1'),
    db.query('SELECT slug FROM categories'),
  ]);

  const staticPages = [
    { url: 'https://pipsnote.com',        changeFrequency: 'daily',   priority: 1.0 },
    { url: 'https://pipsnote.com/blog',   changeFrequency: 'daily',   priority: 0.9 },
    { url: 'https://pipsnote.com/brokers', changeFrequency: 'weekly', priority: 0.9 },
  ];

  const postUrls = posts.map(p => ({
    url: `https://pipsnote.com/blog/${p.slug}`,
    lastModified: p.updated_at,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const brokerUrls = brokers.map(b => ({
    url: `https://pipsnote.com/brokers/${b.slug}`,
    lastModified: b.updated_at,
    priority: 0.8,
  }));

  return [...staticPages, ...postUrls, ...brokerUrls];
}
```

Nếu sitemap > 50k URLs → split thành `sitemap-posts.xml`, `sitemap-brokers.xml` + sitemap index.

**IndexNow — ping Bing/Yandex khi publish:**
```typescript
// Sau khi publish post/broker
async function pingIndexNow(url: string) {
  await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      host: 'pipsnote.com',
      key:  process.env.INDEXNOW_KEY,
      urlList: [url],
    }),
  });
}
```

**Google Search Console:** verify qua DNS TXT record, submit sitemap thủ công 1 lần.

### 8.9 Image SEO

```tsx
// Mọi <Image> đều phải có meaningful alt
<Image
  src={post.thumbnail}
  alt={`Biểu đồ EUR/USD tháng ${month} - ${post.title}`}  // KHÔNG "image" hay tên file
  width={1200} height={630}
/>

// Filename R2 cũng SEO-friendly (thay vì UUID)
// uploads/eur-usd-technical-analysis-2026-07.webp
```

### 8.10 International SEO (nếu mở rộng EN)

```tsx
// app/[lang]/(public)/... — route grouping theo lang
export const metadata = {
  alternates: {
    canonical: 'https://pipsnote.com/vi/blog/forex-la-gi',
    languages: {
      'vi': 'https://pipsnote.com/vi/blog/forex-la-gi',
      'en': 'https://pipsnote.com/en/blog/what-is-forex',
      'x-default': 'https://pipsnote.com/en/blog/what-is-forex',
    },
  },
};
```

Sitemap phải include `<xhtml:link rel="alternate" hreflang="...">` cho mỗi URL.

---

## 9. GOOGLE ADS — COMPLIANCE & CONVERSION TRACKING

> ⚠️ **CẢNH BÁO POLICY QUAN TRỌNG (2026):**
> Google Ads chính thức yêu cầu **affiliates của forex/CFD cũng phải có certification riêng** — không được miễn dù chỉ là site review/comparison. Cert yêu cầu có **financial services license** trong mỗi country target. Solo dev không có license → **không thể chạy Google Ads trực tiếp promote broker CFD/Forex**.
>
> Từ tháng 6/2026, application certification chuyển vào trong Google Ads UI (Admin → Policy → Account).

### 9.1 Chiến lược thực tế cho solo dev

| Approach | Feasible? | Note |
|---|---|---|
| Chạy Ads promote trực tiếp broker CFD/Forex | ❌ | Cần license — bỏ qua |
| Chạy Ads promote crypto exchange (Binance, Bybit) | ⚠️ Hạn chế | Cần cert crypto exchange (có nhiều nước cấm) |
| Chạy Ads cho **content education** (bài blog, không CTA broker) | ✅ | Approach an toàn nhất — build brand + traffic |
| Chạy Ads cho **so sánh broker** (không direct promote 1 sàn) | ⚠️ | Vẫn bị Google review — có thể approve/reject tùy case |
| Google **AdSense (display)** trên site | ✅ | Site kiếm tiền qua ad hiển thị — không cần cert Financial Services |
| **SEO organic** (long-term) | ✅ | Không policy risk, nhưng chậm |

**Đề xuất chiến lược 3-lớp:**
1. **SEO organic** làm foundation (6–12 tháng ROI)
2. **Ads cho educational content** (blog "Forex là gì", "Cách quản lý vốn") → build audience → chuyển vào funnel affiliate qua remarketing/newsletter
3. **AdSense** trên site như revenue phụ (khi có 10k+ pv/tháng)

### 9.2 Landing Pages cho Ads (`/lp/[campaign]`)

Không dẫn Ads về homepage. Tạo landing page riêng cho mỗi campaign, tối ưu Quality Score.

```
app/(public)/lp/[campaign]/page.tsx

Campaign examples:
/lp/forex-beginners-guide       ← Ad "Học forex từ đầu"
/lp/best-brokers-comparison     ← Ad "So sánh top broker 2026"
/lp/free-trading-tools          ← Ad "Công cụ giao dịch miễn phí"
```

**Yêu cầu bắt buộc cho LP:**
- **Match** với ad copy (Google check semantic match)
- **1 CTA chính** — không distract
- **Risk disclosure** visible above the fold (nếu mention broker)
- **LCP < 2s** (Quality Score booster mạnh)
- **Mobile-first** — 60%+ Google Ads traffic là mobile
- Không **exit intent popup** (Google penalize)
- Không **auto-play video with sound**
- Không **excess ads/affiliate CTA** — 1 primary action

**Template LP tối giản:**
```tsx
// app/(public)/lp/[campaign]/page.tsx
export default function LandingPage({ params }: Props) {
  return (
    <main>
      {/* Above the fold — LCP element */}
      <section className="hero">
        <h1>{campaign.headline}</h1>
        <p>{campaign.subheadline}</p>
        <Image src={campaign.hero_img} priority fetchPriority="high" ... />
        <a href={campaign.cta_url} className="btn-primary">{campaign.cta_text}</a>
      </section>

      {/* Risk disclosure — bắt buộc cho financial */}
      <RiskDisclosure />

      {/* Social proof — số user, testimonial */}
      <TrustSignals />

      {/* Content chính — khớp với ad intent */}
      <MainContent html={campaign.body} />

      {/* Secondary CTA */}
      <CTASection />

      {/* Footer minimal */}
    </main>
  );
}
```

**Schema DB `campaigns`:**
```sql
CREATE TABLE campaigns (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    slug          VARCHAR(200) UNIQUE,
    headline      VARCHAR(300),
    subheadline   VARCHAR(500),
    hero_img_url  VARCHAR(500),
    body          LONGTEXT,
    cta_text      VARCHAR(100),
    cta_url       VARCHAR(500),        -- Thường /go/[broker] hoặc /register
    is_active     TINYINT DEFAULT 1,
    -- Tracking
    utm_source    VARCHAR(100),
    utm_medium    VARCHAR(100),
    utm_campaign  VARCHAR(200),
    -- SEO
    seo_title     VARCHAR(200),
    seo_desc      VARCHAR(300),
    noindex       TINYINT DEFAULT 1,   -- LP thường noindex để không duplicate content với /blog
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 9.3 Quality Score Optimization

Google chấm điểm 1–10 dựa vào:
- **Expected CTR** — dựa vào ad copy relevance với keyword
- **Ad relevance** — keyword match với ad text
- **Landing page experience** — CWV + relevance + trust

**Technical checklist tăng Quality Score:**
- [ ] Keyword trong H1, title, meta description LP
- [ ] LCP < 2.5s (test qua PageSpeed Insights)
- [ ] Mobile responsive 100% (LP mobile-first)
- [ ] HTTPS + valid cert
- [ ] Không blocked resources (JS/CSS load OK)
- [ ] Navigation dễ (breadcrumb, back button)
- [ ] Contact info visible
- [ ] Privacy policy link trong footer
- [ ] Cookie consent hoạt động (Consent Mode v2)

### 9.4 Consent Mode v2 — Bắt buộc cho EU/UK

> Từ **6/3/2024**, Google enforce: không có Consent Mode v2 → không tracking được EEA/UK users. Từ 15/6/2026, `ad_storage` là authority duy nhất cho advertising data.

**Kiến trúc:**
```
User visit
   ↓
Consent Mode default: TẤT CẢ = 'denied' (bắt buộc cho EU)
   ↓
CMP banner xuất hiện
   ↓
User accept/deny từng category
   ↓
CMP update Consent Mode state
   ↓
Google Tag (GA4/Ads) đọc state qua gcs param → adjust behavior
```

**Chọn CMP (Consent Management Platform):**

| CMP | Cost | Google-certified | Note |
|---|---|---|---|
| **Cookiebot** | Free ≤ 100 subpages, sau đó ~€10/tháng | ✅ | Popular EU |
| **CookieYes** | Free ≤ 25k page view/tháng | ✅ | Rẻ hơn Cookiebot |
| **Klaro** (self-host) | Free | ❌ Không official cert | OK cho small site nếu tự implement Consent Mode v2 signals |
| **Custom** (self-build) | Free | ❌ | Rủi ro compliance — không nên |

**Đề xuất:** CookieYes free tier — đủ cho giai đoạn đầu.

**Implementation trong Next.js:**

```tsx
// app/layout.tsx — LOAD TRƯỚC GA/Ads scripts
<Script id="consent-default" strategy="beforeInteractive">{`
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}

  // Default: DENIED (bắt buộc cho EU trước khi banner hiện)
  gtag('consent', 'default', {
    'ad_storage':         'denied',
    'ad_user_data':       'denied',
    'ad_personalization': 'denied',
    'analytics_storage':  'denied',
    'wait_for_update':    500,           // Đợi CMP update trong 500ms
    'region': ['EEA','GB']               // Apply cho EU/UK only
  });

  // Default cho US/khác: granted (không bắt buộc)
  gtag('consent', 'default', {
    'ad_storage':         'granted',
    'ad_user_data':       'granted',
    'ad_personalization': 'granted',
    'analytics_storage':  'granted',
  });
`}</Script>

{/* CMP script sau — sẽ update consent state khi user click */}
<Script src="https://cdn-cookieyes.com/client_data/YOUR_ID/script.js" strategy="afterInteractive" />

{/* GA4 sau consent default */}
<Script src="https://www.googletagmanager.com/gtag/js?id=G-XXX" strategy="afterInteractive" />
```

**Khi user accept trên CMP:**
```javascript
// CMP tự động gọi:
gtag('consent', 'update', {
  'ad_storage':         'granted',
  'ad_user_data':       'granted',
  'ad_personalization': 'granted',
  'analytics_storage':  'granted',
});
```

**Test Consent Mode:**
- Chrome DevTools → Network tab → filter `collect?v=2`
- Check param `gcs` trong request → `G100` = all denied, `G111` = all granted
- Chrome extension "Tag Assistant Companion"

### 9.5 Google Tag Manager Setup

Dùng GTM để không phải deploy code mỗi khi đổi tracking:

```html
<!-- app/layout.tsx <head> -->
<Script id="gtm" strategy="beforeInteractive">{`
  (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','GTM-XXXXXXX');
`}</Script>
```

**GTM cấu hình:**
- Tag: GA4 Configuration
- Tag: Google Ads Conversion Tracking
- Tag: Google Ads Remarketing
- Trigger: All Pages (fire after consent granted)
- Variable: Consent State (đọc `gcs` param)

### 9.6 Conversion Tracking — Enhanced Conversions

**Định nghĩa conversion event:**
```typescript
// components/public/AffiliateButton.tsx
// Fire event trước khi navigate (window.open đảm bảo event kịp gửi)
'use client';
export function AffiliateButton({ broker }: Props) {
  const handleClick = () => {
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'affiliate_click', {
        broker_name:  broker.name,
        broker_id:    broker.id,
        value:        broker.expected_commission,   // Enhanced conversion — value biết được
        currency:     'USD',
      });
    }
    // Không cần preventDefault — link vẫn hoạt động
  };

  return (
    <a href={`/go/${broker.slug}`}
       target="_blank"
       rel="nofollow noopener sponsored"
       onClick={handleClick}>
      Mở tài khoản →
    </a>
  );
}
```

**Newsletter signup conversion:**
```typescript
// Trong form submit handler
window.gtag?.('event', 'sign_up', {
  method: 'newsletter',
  value:  5,     // Ước lượng LTV của 1 email subscriber
  currency: 'USD',
});
```

**Enhanced Conversions (đề xuất):**
Google 2026 push mạnh Enhanced Conversions — hash user data (email, name) gửi Google để match với logged-in Google account → tăng conversion attribution 20–30%.

```typescript
// Khi user submit newsletter form
async function submitNewsletter(email: string) {
  await api.subscribe({ email });

  // Enhanced conversion payload
  const hashedEmail = await sha256(email.trim().toLowerCase());
  window.gtag?.('event', 'sign_up', {
    'user_data': { 'sha256_email_address': hashedEmail },
    value: 5, currency: 'USD',
  });
}
```

**Note:** Enhanced Conversions cần user consent (`ad_user_data: granted`) → không fire cho denied EU users.

### 9.7 Google AdSense (Display Ads trên site)

**Yêu cầu để được approve:**
- Site có tối thiểu 20–30 bài chất lượng
- Traffic organic (không mua)
- Privacy Policy + Contact + About page
- Không policy violation (adult, weapon, misleading...)
- Content original (không copy-paste)

**Setup:**
```html
<!-- Sau khi được approve, add vào <head> -->
<script async
  src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXX"
  crossorigin="anonymous"></script>

<!-- ads.txt tại root -->
google.com, pub-XXXXXXX, DIRECT, f08c47fec0942fa0
```

**Ad slot component (không CLS):**
```tsx
export function AdSlot({ slotId, format = 'auto' }: Props) {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {}
  }, []);

  return (
    <div style={{ minHeight: 250 }} aria-label="advertisement">   {/* Reserve height — chống CLS */}
      <ins className="adsbygoogle"
           style={{ display: 'block' }}
           data-ad-client="ca-pub-XXXXX"
           data-ad-slot={slotId}
           data-ad-format={format}
           data-full-width-responsive="true" />
    </div>
  );
}
```

**Vị trí ads (theo Google recommendation):**
- Sau đoạn intro (paragraph 1–2) trong bài blog
- Giữa content — mỗi 800–1000 words
- Sidebar sticky (desktop)
- Bottom of article
- **KHÔNG đặt cạnh affiliate button** (Google có thể xem là "misleading placement")
- **KHÔNG đặt trong navigation, header, footer nhỏ**
- Tối đa 3 ads unit/page — nhiều hơn giảm UX + policy risk

### 9.8 Remarketing / Audience

Sau khi có Consent Mode v2, có thể build audience trong Google Ads:
- **All visitors** — 30 days
- **Blog readers** — engaged 2+ pages
- **Affiliate clickers** — đã click `/go/*` (custom event)
- **Newsletter subscribers** — high-intent audience

Chạy Display Ads remarketing → nhắc lại thương hiệu.

### 9.9 Google Search Console Setup

- Verify qua DNS TXT record (không phải file HTML — dễ mất khi redeploy)
- Submit sitemap: `https://pipsnote.com/sitemap.xml`
- Monitor:
  - Coverage errors (404, redirect chain, blocked by robots.txt)
  - Core Web Vitals (mobile + desktop)
  - Search queries (keyword nào rank tốt)
  - Manual actions (nếu có penalty)
- Setup email alert khi có manual action hoặc security issue

### 9.10 Ads.txt + Sellers.json

```
# public/ads.txt
google.com, pub-XXXXXXX, DIRECT, f08c47fec0942fa0
```

Nếu chạy Google Ad Manager hoặc dùng multiple ad networks, thêm mỗi dòng.

### 9.11 Regional Compliance

| Region | Yêu cầu bổ sung |
|---|---|
| **EU/EEA** | Consent Mode v2 mandatory, GDPR, cookie banner, ImprintOfDataProtection |
| **UK** | Consent Mode v2, UK GDPR, ICO cookie guidance |
| **California** | CCPA "Do Not Sell" link, IAB CCPA Framework |
| **Brazil** | LGPD compliance |
| **Global crypto** | Age gate 18+ (một số country) |

CMP như CookieYes tự động detect region và show đúng banner.

---

## 10. INFRASTRUCTURE & DEPLOYMENT

### 10.1 Yêu cầu VPS tối thiểu
```
RAM: 4GB (Next.js build ~1.5GB + MySQL + Redis + Plausible)
CPU: 2 vCPU
Storage: 40GB SSD
OS: Ubuntu 22.04 LTS
Khuyến nghị: Hetzner CX22 (~€5/tháng) hoặc Vultr $24/month
```

### 10.2 Docker Compose layout

**Nguyên tắc:** chỉ Nginx expose ra internet. MySQL/Redis/Meilisearch dùng network `internal: true` — không thể truy cập từ ngoài dù VPS bị lộ port.

```yaml
# docker-compose.yml (skeleton)
services:
  next-app:
    build: .
    env_file: .env.production          # Không commit — chmod 600
    networks: [frontend, backend]
    depends_on: [mysql, redis]
    restart: unless-stopped
    # KHÔNG có `ports:` — chỉ Nginx truy cập được

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certbot/conf:/etc/letsencrypt:ro
    ports:
      - "80:80"
      - "443:443"
    networks: [frontend]
    restart: unless-stopped

  mysql:
    image: mysql:8.0
    env_file: .env.production
    volumes:
      - mysql_data:/var/lib/mysql
    networks: [backend]                # KHÔNG có ports — internal only
    restart: unless-stopped
    command: --default-authentication-plugin=caching_sha2_password

  redis:
    image: redis:7-alpine
    command: >
      redis-server
      --requirepass ${REDIS_PASSWORD}
      --maxmemory 512mb
      --maxmemory-policy allkeys-lru
    networks: [backend]                # Internal only
    restart: unless-stopped

  meilisearch:
    image: getmeili/meilisearch:v1.6
    environment:
      MEILI_MASTER_KEY: ${MEILI_MASTER_KEY}
      MEILI_ENV: production
    networks: [backend]                # Internal only

  plausible:
    image: ghcr.io/plausible/community-edition:v2
    networks: [frontend, backend]

networks:
  frontend:                            # Nginx ↔ next-app ↔ plausible
    driver: bridge
  backend:                             # next-app ↔ DB/Redis/Meili — không có internet
    driver: bridge
    internal: true                     # Chặn outbound cả trong subnet này

volumes:
  mysql_data:
```

**Kiểm tra sau khi deploy:**
```bash
# Từ ngoài VPS, thử: KHÔNG được connect
nmap -p 3306,6379,7700 your-server-ip
# Kết quả mong đợi: filtered/closed
```

### 10.3 SSL với Let's Encrypt
```bash
# Certbot auto-renew qua Docker
docker run --rm \
  -v ./certbot/conf:/etc/letsencrypt \
  certbot/certbot certonly --webroot \
  -w /var/www/certbot -d yourdomain.com
```

### 10.4 CI/CD GitHub Actions
```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]
jobs:
  deploy:
    steps:
      - SSH vào VPS
      - git pull
      - docker compose build next-app
      - docker compose up -d --no-deps next-app
      # Zero-downtime: old container tiếp tục serve trong khi build
```

### 10.5 Backup strategy
- MySQL: `mysqldump` daily → upload R2 (7-day retention)
- R2 uploads: built-in versioning
- VPS snapshot: weekly (Hetzner/Vultr built-in)

---

## 11. PERFORMANCE CHO TRAFFIC LỚN

### 11.1 Bottlenecks và giải pháp

| Bottleneck | Giải pháp |
|---|---|
| Blog pages TTFB | SSG + Cloudflare CDN cache |
| DB read spike | Redis cache cho homepage queries (TTL 60s) |
| Image bandwidth | Cloudflare R2 + next/image → CDN edge |
| Price SSE connections | Redis pub/sub fan-out: 1 poller → N SSE clients, không poll upstream N lần |
| MySQL slow queries | Index đúng + query cache + read replica (khi cần) |

### 11.2 Cloudflare setup (miễn phí)
```
Cloudflare Free Plan đủ cho giai đoạn đầu:
- DDoS protection
- Cache HTML tĩnh ở edge (Cache Rules)
- Bot protection
- WAF cơ bản
- SSL auto (flexible → full strict)
```

**Cache Rules quan trọng:**
```
/blog/* → Cache Everything, TTL 1h (purge on publish)
/brokers/* → Cache Everything, TTL 30min
/admin/* → Bypass cache
/api/* → Bypass cache
```

### 11.3 Scaling path
```
Giai đoạn 1 (0–50k pv/tháng): Single VPS + Cloudflare
Giai đoạn 2 (50k–500k pv/tháng): 
    + Tăng VPS RAM/CPU
    + MySQL read replica
    + Redis cluster
Giai đoạn 3 (500k+ pv/tháng):
    + Load balancer (Nginx upstream)
    + Separate DB server
    + Consider managed MySQL (PlanetScale)
```

---

## 12. FILE/FOLDER STRUCTURE

```
pipsnote/
├── apps/
│   └── web/                    # Next.js app
│       ├── app/
│       │   ├── (public)/       # Route group - public pages
│       │   │   ├── page.tsx    # Trang chủ
│       │   │   ├── blog/
│       │   │   │   ├── page.tsx
│       │   │   │   └── [slug]/page.tsx
│       │   │   ├── brokers/
│       │   │   │   ├── page.tsx
│       │   │   │   └── [slug]/page.tsx
│       │   │   └── compare/page.tsx
│       │   ├── admin/          # Admin routes (protected)
│       │   │   ├── layout.tsx  # Auth check HOC
│       │   │   ├── page.tsx    # Dashboard
│       │   │   ├── posts/
│       │   │   ├── brokers/
│       │   │   ├── analytics/
│       │   │   └── settings/
│       │   ├── go/
│       │   │   └── [slug]/route.ts   # Affiliate redirect + tracking
│       │   ├── api/
│       │   │   ├── prices/
│       │   │   │   └── stream/route.ts  # SSE endpoint
│       │   │   ├── auth/
│       │   │   └── admin/            # Admin API routes
│       │   └── layout.tsx
│       ├── components/
│       │   ├── public/
│       │   │   ├── TickerBar/
│       │   │   ├── BrokerCard/
│       │   │   ├── PriceWidget/
│       │   │   ├── PostCard/
│       │   │   └── AffiliateButton/  # Tracked CTA
│       │   ├── admin/
│       │   │   ├── RichEditor/       # TipTap wrapper
│       │   │   ├── Charts/
│       │   │   └── DataTable/
│       │   └── ui/                   # Shared components
│       ├── lib/
│       │   ├── db.ts                 # MySQL connection (mysql2)
│       │   ├── redis.ts
│       │   ├── geoip.ts              # MaxMind GeoIP2 Lite lookup
│       │   ├── r2.ts                 # Cloudflare R2 upload
│       │   ├── click-guard.ts        # Bot filter + Redis dedup
│       │   └── prices/
│       │       ├── poller.ts         # Singleton price poller (REST poll → Redis pub/sub)
│       │       └── types.ts          # PriceData interface
│       └── public/
│           ├── ads.txt
│           └── robots.txt
├── docker/
│   ├── nginx/
│   │   └── nginx.conf
│   └── mysql/
│       └── init.sql
├── docker-compose.yml
├── docker-compose.prod.yml
└── .github/workflows/deploy.yml
```

---

## 13. PHÂN TÍCH RỦI RO & GIẢI PHÁP

| Rủi ro | Khả năng | Giải pháp |
|---|---|---|
| **Google Ads yêu cầu Financial Certification cho affiliate CFD/Forex** | **Cực cao — solo dev không có license** | Không chạy Ads trực tiếp promote broker. Ads chỉ cho content education + AdSense display + SEO organic là chính (§9.1) |
| **Consent Mode v2 không setup → mất tracking EU** | Cao | CookieYes free tier + implement default state trước GA/Ads load (§9.4) |
| YMYL content khó rank vì thiếu E-E-A-T | Cao (site mới) | Author bios, editorial policy, updated dates, citations (§8.4) |
| Free price API bị rate limit | Trung bình | Cache Redis + fallback provider |
| GDPR violation (EU traffic) | Trung bình | Cookie consent, IP hashing, Privacy Policy đúng |
| Affiliate link bị Google penalize | Thấp nếu chuẩn | `rel="nofollow noopener sponsored"` (§6.4) |
| VPS downtime | Thấp | Cloudflare caching giúp serve cached pages khi origin down |
| **Admin credential bị leak** | Trung bình | 2FA bắt buộc + audit log + alert đổi affiliate_url (§16.5) |
| **`broker_links.affiliate_url` bị đổi lén** | Cao (giá trị cao) | Audit log + email alert mỗi lần UPDATE (§16.5) |
| **DDoS / Bot scraping** | Cao (public site) | Cloudflare Bot Fight Mode + Nginx rate limit + Cloudflare IP only (§16.2) |
| **XSS qua rich text editor** | Trung bình | DOMPurify sanitize + CSP (§16.4) |
| **SQL injection** | Thấp nếu code đúng | Parameterized queries + Zod + least privilege DB user (§16.4, §16.6) |
| **VPS IP bị lộ → bypass Cloudflare** | Trung bình | Nginx chỉ chấp nhận Cloudflare IP ranges (§16.2) |
| Programmatic SEO bị coi là doorway pages | Trung bình | Đảm bảo mỗi `/compare/*` có unique data thật, không template rỗng (§8.6) |

---

## 14. ROADMAP TRIỂN KHAI

### Phase 1 — MVP (4–6 tuần)
- [ ] Setup VPS hardening: SSH key-only, UFW, Fail2ban (§16.2)
- [ ] Setup Docker Compose + Nginx + SSL + security headers (§2.1, §16.3)
- [ ] Cloudflare Proxy + Nginx allow Cloudflare IP only (§16.2)
- [ ] Database schema + seed data + least privilege DB user (§16.6)
- [ ] Public: Homepage, Blog list, Blog detail (SSG/ISR)
- [ ] Broker cards + affiliate tracking
- [ ] Admin: Auth (bcrypt cost 12) + Post editor (TipTap + DOMPurify) + Broker CRUD
- [ ] Admin: 2FA (TOTP) + login lockout + audit log (§16.5)
- [ ] Price ticker (Binance REST poll → SSE → TickerBar)
- [ ] `/go/[slug]` route — server-side affiliate redirect + click tracking
- [ ] SEO cơ bản: `generateMetadata()`, sitemap, robots.txt, Schema.org Article/Organization (§8.1, §8.3)
- [ ] Cookie consent (CookieYes) + Consent Mode v2 default state (§9.4)
- [ ] Author pages + E-E-A-T pages: About, Contact, Editorial Policy, Risk Disclosure (§8.4)
- [ ] Security checklist §16.11 pass 100% trước go-live

### Phase 2 — Growth (tuần 7–10)
- [ ] Analytics dashboard (traffic + affiliate clicks)
- [ ] Comparison page `/compare` — programmatic SEO (§8.6)
- [ ] Broker detail page + Schema Review markup
- [ ] Newsletter signup + export
- [ ] Landing pages `/lp/[campaign]` cho Google Ads (§9.2)
- [ ] Google Search Console verify + submit sitemap
- [ ] GTM setup + GA4 + Google Ads conversion tracking (§9.5, §9.6)
- [ ] Enhanced Conversions cho affiliate_click event
- [ ] Mở rộng price poller: thêm Forex pairs + đổi symbol qua Admin watchlist
- [ ] `broker_links` multi-link management trong Admin

### Phase 3 — Optimize (tuần 11–14)
- [ ] Meilisearch full-text search
- [ ] Related posts + pillar/cluster linking (§8.5)
- [ ] Programmatic SEO: `/compare/[broker-a]-vs-[broker-b]` (§8.6)
- [ ] Auto internal linking broker mentions (§8.7)
- [ ] IndexNow ping khi publish (§8.8)
- [ ] Google AdSense apply + integrate ad slots (§9.7)
- [ ] Retargeting audiences setup (§9.8)
- [ ] Core Web Vitals audit + fix (target LCP < 2s, INP < 200ms)
- [ ] E-E-A-T audit: kiểm tra author bio, publish/updated date, citations
- [ ] Schema.org validation qua Google Rich Results Test

---

## 16. SECURITY — DEFENSE IN DEPTH

> **Nguyên tắc:** Không tin bất kỳ layer nào. Một layer bị vỡ, các layer khác vẫn phải chặn được. Chuẩn bị cho scenario **VPS IP bị lộ** và **admin credential bị leak**.

### 16.1 Threat Model

| Actor | Motivation | Attack surface |
|---|---|---|
| Automated scanners (bot) | Bulk exploit `/wp-admin`, `/.env`, `/.git` | Public HTTP |
| Competitor / affiliate hijacker | Đổi affiliate ref code để cướp commission | Admin panel, DB |
| SEO black-hat | Inject spam link vào bài blog | XSS trong rich text editor |
| Script kiddie / DDoS | Downtime, ransom | Origin IP nếu Cloudflare bypass |
| Data thief | Email subscribers list → spam/phishing | DB dump, admin panel |

**Kịch bản tệ nhất:** admin credential leak → attacker sửa `broker_links.affiliate_url` → toàn bộ commission chảy sang ref code khác. **Không hề để lại dấu vết trên frontend.** Đây là lý do audit log + 2FA là bắt buộc.

---

### 16.2 Layer 1 — Infrastructure & Network

#### SSH hardening (làm ngay khi có VPS)
```bash
# /etc/ssh/sshd_config
Port 2222                              # Đổi port default (giảm 90% brute-force bot)
PermitRootLogin no
PasswordAuthentication no              # Chỉ SSH key
PubkeyAuthentication yes
MaxAuthTries 3
LoginGraceTime 30
AllowUsers deploy                      # User riêng, không dùng root

# Sau khi sửa
sudo systemctl restart sshd
```

#### Firewall (UFW)
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 2222/tcp                # SSH (port đã đổi)
sudo ufw allow 80/tcp                  # HTTP (redirect → 443)
sudo ufw allow 443/tcp                 # HTTPS
sudo ufw enable

# KHÔNG mở: 3306 (MySQL), 6379 (Redis), 3000 (Next.js), 7700 (Meilisearch)
```

#### Fail2ban — chặn brute-force SSH + admin login
```ini
# /etc/fail2ban/jail.local
[sshd]
enabled  = true
port     = 2222
maxretry = 3
bantime  = 3600

[nginx-admin-login]
enabled  = true
filter   = nginx-admin-login           # Custom filter — match log 401/429 trên /admin/login
logpath  = /var/log/nginx/access.log
maxretry = 5
bantime  = 86400                       # Ban 24h
```

#### Cloudflare Proxy — ẩn origin IP
```
1. DNS A record: proxy = ON (icon cam)
2. SSL/TLS mode: Full (Strict) — verify origin cert
3. Firewall Rules:
   - Block: cf.threat_score > 30
   - Challenge: known bot IPs
4. Bot Fight Mode: ON (free tier)
```

**Sau khi setup Cloudflare, chặn direct IP access ở Nginx:**
```nginx
# Chỉ chấp nhận request đến qua Cloudflare
# (Cloudflare IP ranges — update định kỳ)
allow 173.245.48.0/20;
allow 103.21.244.0/22;
# ... danh sách đầy đủ tại https://www.cloudflare.com/ips-v4
deny all;
```
→ Attacker biết origin IP cũng không request trực tiếp được.

#### Docker network isolation
Xem §10.2 — MySQL/Redis/Meilisearch trong network `internal: true`, không có route ra internet.

---

### 16.3 Layer 2 — Nginx (Application Gateway)

Xem §2.1 đã có: security headers, rate limiting, chặn path scan, hide version.

**Bổ sung cho `/admin`:**
```nginx
# IP whitelist cho admin (optional — nếu bạn có static IP hoặc VPN)
location /admin {
    # allow YOUR_HOME_IP;
    # allow YOUR_OFFICE_IP;
    # deny all;
    # ... phần còn lại như §2.1
}
```

**ModSecurity WAF (optional):**
- Nếu Cloudflare WAF không đủ, có thể chạy ModSecurity với OWASP Core Rule Set trên Nginx
- Không bắt buộc cho MVP — Cloudflare Bot Fight Mode + rate limit đã đủ

---

### 16.4 Layer 3 — Application (Next.js / Node)

#### Input validation — Zod cho mọi API route
```typescript
// lib/validate.ts
import { z } from 'zod';

export const createPostSchema = z.object({
  title:      z.string().min(3).max(500),
  slug:       z.string().regex(/^[a-z0-9-]+$/).max(200),
  content:    z.string().max(200_000),        // Giới hạn size để tránh DoS
  category_id: z.number().int().positive(),
  status:     z.enum(['draft', 'published']),
});

// Trong route handler
const body = await req.json();
const parsed = createPostSchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  // KHÔNG trả về chi tiết Zod error trong production — leak schema
}
```

#### XSS — Sanitize HTML từ rich text editor
```typescript
// lib/sanitize.ts
// TipTap output là HTML → BẮT BUỘC sanitize trước khi INSERT DB
import DOMPurify from 'isomorphic-dompurify';

export function sanitizePostContent(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p','h1','h2','h3','strong','em','u','a','ul','ol','li',
      'img','blockquote','code','pre','table','thead','tbody','tr','td','th',
      'br','hr','span','div'
    ],
    ALLOWED_ATTR: ['href','src','alt','title','class','target','rel'],
    ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i,       // Chặn javascript:, data:
    ADD_ATTR: ['target'],
    FORBID_TAGS: ['script','style','iframe','object','embed','form'],
  });
}

// Khi save post
const cleanContent = sanitizePostContent(rawHtml);
await db.query('INSERT INTO posts (content, ...) VALUES (?, ...)', [cleanContent, ...]);
```

**Khi render:** Next.js `dangerouslySetInnerHTML` chỉ dùng với content đã sanitize từ DB. **Không bao giờ** render HTML từ user input chưa sanitize.

#### SQL Injection — Parameterized queries only
```typescript
// ❌ SAI — Concatenate string
const posts = await db.query(`SELECT * FROM posts WHERE slug = '${slug}'`);

// ✅ ĐÚNG — Placeholder (mysql2 auto-escape)
const posts = await db.query('SELECT * FROM posts WHERE slug = ?', [slug]);
```

**ESLint rule** để enforce:
```json
// .eslintrc — chặn template literal trong db.query
"no-restricted-syntax": [
  "error",
  {
    "selector": "CallExpression[callee.property.name='query'] > TemplateLiteral",
    "message": "Không dùng template literal trong db.query — dùng placeholder"
  }
]
```

#### CSRF Protection cho Admin
```typescript
// Next.js Route Handler — dùng double-submit cookie pattern
// hoặc SameSite=Strict cookie (đủ với Chrome/Edge/Safari mới)

// lib/session.ts
export const sessionCookieOptions = {
  httpOnly: true,
  secure:   true,                    // HTTPS only
  sameSite: 'strict' as const,       // Chặn CSRF cross-site
  path:     '/',
  maxAge:   60 * 60 * 8,             // 8h — không dùng "remember me" cho admin
};

// Với POST/PUT/DELETE admin, verify Origin header
export function verifyOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  const host   = req.headers.get('host');
  if (!origin) return false;
  return new URL(origin).host === host;
}
```

#### Content Security Policy (CSP)
```typescript
// next.config.js hoặc middleware.ts
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://pagead2.googlesyndication.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https: blob:",
  "connect-src 'self' https://api.binance.com wss://stream.binance.com:9443",
  "frame-ancestors 'none'",           // Chặn clickjacking
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

response.headers.set('Content-Security-Policy', csp);
```

#### Rate Limiting per Route (Redis-based)
```typescript
// lib/rate-limit.ts
export async function rateLimit(
  key: string,
  limit: number,
  windowSec: number
): Promise<boolean> {
  const now  = Math.floor(Date.now() / 1000);
  const slot = Math.floor(now / windowSec);
  const redisKey = `rl:${key}:${slot}`;
  const count = await redis.incr(redisKey);
  if (count === 1) await redis.expire(redisKey, windowSec);
  return count <= limit;
}

// Áp dụng trong route
const ok = await rateLimit(`newsletter:${ipHash}`, 3, 3600);
if (!ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
```

**Rate limit đề xuất per route:**
| Route | Limit |
|---|---|
| `POST /api/newsletter` | 3/h per IP |
| `POST /api/contact` | 5/h per IP |
| `POST /api/admin/login` | 5/15min per IP (Nginx đã có) + lockout account sau 10 fail |
| `GET /go/[slug]` | 10/s per IP (Nginx) |
| `POST /api/admin/*` (đã login) | 60/min per user |

#### Error Handling — Không leak stack trace
```typescript
// app/error.tsx và tất cả route handler
try {
  // ...
} catch (err) {
  console.error('[Internal]', err);   // Log server-side đủ
  // Trả về generic message
  return NextResponse.json(
    { error: 'Internal server error', reqId: crypto.randomUUID() },
    { status: 500 }
  );
}

// next.config.js
module.exports = {
  productionBrowserSourceMaps: false,  // Không leak source code
  poweredByHeader: false,              // Ẩn "X-Powered-By: Next.js"
};
```

---

### 16.5 Layer 4 — Admin Panel (High-Value Target)

#### Password Storage
```typescript
import bcrypt from 'bcrypt';

// Cost 12 = ~250ms hash time trên CPU 2020+ — an toàn cho 2026
const hash = await bcrypt.hash(password, 12);
await db.query('UPDATE admin_users SET password = ? WHERE id = ?', [hash, id]);

// Verify
const match = await bcrypt.compare(inputPassword, storedHash);
```

**Password policy:** min 12 chars, có chữ hoa/thường/số/ký tự đặc biệt. Check qua zxcvbn (score >= 3).

#### 2FA (TOTP — Google Authenticator) — Bắt buộc cho superadmin
```typescript
// npm i speakeasy qrcode
import speakeasy from 'speakeasy';

// Khi enable 2FA
const secret = speakeasy.generateSecret({ name: 'PIPSNOTE Admin' });
await db.query('UPDATE admin_users SET totp_secret = ? WHERE id = ?', [secret.base32, id]);

// Verify khi login
const valid = speakeasy.totp.verify({
  secret: user.totp_secret,
  encoding: 'base32',
  token: userInputCode,
  window: 1,                          // Cho phép 30s trước/sau
});
```

**Schema bổ sung `admin_users`:**
```sql
ALTER TABLE admin_users ADD COLUMN totp_secret VARCHAR(255) DEFAULT NULL;
ALTER TABLE admin_users ADD COLUMN totp_enabled TINYINT DEFAULT 0;
ALTER TABLE admin_users ADD COLUMN failed_login_count INT DEFAULT 0;
ALTER TABLE admin_users ADD COLUMN locked_until DATETIME DEFAULT NULL;
```

#### Login Lockout — chống brute-force credential stuffing
```typescript
// Sau 10 lần fail → lock account 30 phút
if (user.failed_login_count >= 10 && user.locked_until > new Date()) {
  return { error: 'Account locked. Try again later.' };
}

if (!passwordMatch) {
  await db.query(
    `UPDATE admin_users
       SET failed_login_count = failed_login_count + 1,
           locked_until = CASE WHEN failed_login_count >= 9
                              THEN DATE_ADD(NOW(), INTERVAL 30 MINUTE)
                              ELSE locked_until END
     WHERE id = ?`,
    [user.id]
  );
  // Response time constant — chống timing attack phân biệt user tồn tại/không
}
```

#### Session Security
- JWT trong httpOnly cookie (không localStorage — XSS đọc được)
- `sameSite: 'strict'`, `secure: true`
- Session timeout 8h (không "remember me")
- Rotate JWT secret định kỳ (invalidate all sessions)
- Server-side session revocation qua Redis blocklist (khi user logout hoặc admin bị compromised)

#### Audit Log — bắt buộc cho mọi thao tác admin
```sql
CREATE TABLE admin_audit_log (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    admin_id    INT NOT NULL,
    action      VARCHAR(50),          -- 'login', 'post.create', 'broker.update', 'broker_link.update'
    entity_type VARCHAR(50),          -- 'post', 'broker', 'broker_link'
    entity_id   BIGINT,
    changes     JSON,                 -- {before: {...}, after: {...}}
    ip_hash     VARCHAR(64),
    user_agent  TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_admin_date (admin_id, created_at),
    INDEX idx_action (action)
);
```

**Log những gì:** login/logout, mọi thay đổi trên `broker_links.affiliate_url`, publish post, xóa dữ liệu, đổi settings. Xem admin log qua `/admin/audit`.

**Alert email tự động khi:** login từ country lạ, đổi `affiliate_url`, xóa nhiều rows cùng lúc, disable 2FA.

---

### 16.6 Layer 5 — Database

#### Least Privilege — user riêng cho app, KHÔNG dùng root
```sql
-- User cho app: chỉ SELECT/INSERT/UPDATE/DELETE — KHÔNG DROP, ALTER, GRANT
CREATE USER 'pipsnote_app'@'%' IDENTIFIED BY 'STRONG_RANDOM_PASSWORD';
GRANT SELECT, INSERT, UPDATE, DELETE ON pipsnote.* TO 'pipsnote_app'@'%';

-- User cho backup: chỉ SELECT
CREATE USER 'pipsnote_backup'@'%' IDENTIFIED BY 'ANOTHER_STRONG_PWD';
GRANT SELECT, LOCK TABLES ON pipsnote.* TO 'pipsnote_backup'@'%';

-- User cho migration (chỉ dùng khi deploy schema change, không dùng runtime)
CREATE USER 'pipsnote_migrate'@'localhost' IDENTIFIED BY 'YET_ANOTHER_PWD';
GRANT ALL ON pipsnote.* TO 'pipsnote_migrate'@'localhost';

FLUSH PRIVILEGES;
```

Kể cả SQL injection thành công, attacker cũng không DROP TABLE được.

#### Không expose port
Xem §10.2 — MySQL trong Docker network `internal: true`, không bao giờ bind `0.0.0.0:3306`.

#### Encryption at rest (VPS-level)
- Hetzner/Vultr: enable disk encryption khi tạo VPS
- Docker volume mysql_data nằm trên encrypted disk
- Backup mã hóa trước khi upload R2 (xem §16.9)

#### Sensitive column encryption
Trường cần mã hóa (nếu có): API key của broker, TOTP secret. Dùng AES-256-GCM với key từ env var:
```typescript
// lib/crypto.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'); // 32 bytes

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decrypt(encoded: string): string {
  const buf = Buffer.from(encoded, 'base64');
  const iv  = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}
```

---

### 16.7 File Upload Security

Image từ TipTap editor → Cloudflare R2. **Không lưu vào VPS filesystem.**

```typescript
// app/api/admin/upload/route.ts
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024;   // 5MB

export async function POST(req: NextRequest) {
  await requireAdmin(req);            // Auth check trước

  const formData = await req.formData();
  const file = formData.get('file') as File;

  // 1. Validate MIME thật — không tin file.type từ client
  const buf = Buffer.from(await file.arrayBuffer());
  const detectedMime = await detectMimeFromBytes(buf);  // file-type package
  if (!ALLOWED_MIME.includes(detectedMime)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
  }

  // 2. Size check
  if (buf.length > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large' }, { status: 400 });
  }

  // 3. Rename với random UUID — KHÔNG giữ tên gốc (path traversal, XSS trong tên)
  const ext = detectedMime.split('/')[1];
  const key = `uploads/${crypto.randomUUID()}.${ext}`;

  // 4. Re-encode qua Sharp — strip EXIF metadata, chống polyglot file
  const clean = await sharp(buf)
    .rotate()                          // Auto-rotate theo EXIF rồi strip
    .toFormat(ext as any, { quality: 85 })
    .toBuffer();

  // 5. Upload R2 với Content-Type explicit
  await r2.putObject({
    Bucket: 'pipsnote-uploads',
    Key: key,
    Body: clean,
    ContentType: detectedMime,
    CacheControl: 'public, max-age=31536000',
  });

  return NextResponse.json({ url: `https://cdn.pipsnote.com/${key}` });
}
```

**Serve từ subdomain khác domain chính (`cdn.pipsnote.com`)** → cookie session không attach vào file requests → giảm tấn công cookie theft qua uploaded content.

---

### 16.8 Secrets Management

#### .env production — KHÔNG BAO GIỜ commit git
```bash
# .gitignore
.env
.env.production
.env.local

# Trên VPS
chmod 600 .env.production
chown deploy:deploy .env.production
```

#### Secret rotation checklist
| Secret | Rotate frequency | Note |
|---|---|---|
| `JWT_SECRET` | 90 ngày | Invalidate mọi session — user phải login lại |
| `IP_SALT` | Không rotate | Rotate = mất khả năng dedup click cũ |
| `ENCRYPTION_KEY` | 180 ngày | Cần re-encrypt data (background job) |
| MySQL app password | 90 ngày | Update `.env` + restart app |
| `MEILI_MASTER_KEY` | 180 ngày | |
| Broker affiliate ref | Khi cần | Update qua Admin, có audit log |

#### GitHub Actions secrets
Deploy dùng SSH key trong GitHub Secrets, không hardcode. Rotate SSH deploy key 6 tháng.

---

### 16.9 Backup Security

```bash
#!/bin/bash
# scripts/backup.sh — chạy daily qua cron

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/tmp/pipsnote_${DATE}.sql.gz.enc"

# 1. Dump + compress + encrypt trong 1 pipe (không ghi plain SQL ra disk)
mysqldump --single-transaction --routines \
  -u pipsnote_backup -p"$BACKUP_PASSWORD" pipsnote \
  | gzip \
  | openssl enc -aes-256-cbc -salt -pbkdf2 \
      -pass "pass:$BACKUP_ENC_KEY" \
      -out "$BACKUP_FILE"

# 2. Upload R2
aws s3 cp "$BACKUP_FILE" "s3://pipsnote-backups/db/" \
  --endpoint-url "$R2_ENDPOINT"

# 3. Cleanup local
shred -u "$BACKUP_FILE"                 # Wipe securely, không chỉ rm

# 4. Retention: giữ 7 daily + 4 weekly + 3 monthly
# (Cloudflare R2 lifecycle rule)
```

**Restore test:** monthly — không test = không có backup.

---

### 16.10 Monitoring & Incident Response

#### Log tập trung
```
Nginx access/error   → /var/log/nginx/
App logs             → stdout → docker logs → journald
Fail2ban             → /var/log/fail2ban.log
Audit log            → MySQL admin_audit_log
```

Optional: ship qua Loki/Grafana hoặc Papertrail nếu muốn dashboard.

#### Alert triggers (email/Telegram bot)
- SSH login thành công (mỗi lần)
- Fail2ban ban new IP
- Admin login thất bại > 5 trong 10 phút
- `broker_links.affiliate_url` bị đổi
- 5xx rate > 5% trong 5 phút
- MySQL disk usage > 80%
- SSL cert < 14 ngày expire

#### Dependency Security
```bash
# CI/CD chạy mỗi push
npm audit --audit-level=high            # Fail build nếu có high/critical
```
Thêm Dependabot trong GitHub → auto PR update package có vulnerability.

#### Incident Response Playbook
| Sự cố | Bước 1 | Bước 2 | Bước 3 |
|---|---|---|---|
| Nghi admin credential leak | Revoke tất cả session (rotate JWT secret) | Force password reset + enable 2FA | Xem audit log 30 ngày → rollback thay đổi bất thường |
| DDoS | Bật Cloudflare "Under Attack Mode" | Tăng rate limit Nginx | Check origin log tìm pattern |
| SQL injection alert (WAF) | Isolate: down `next-app` container | Review log tìm query lạ | Patch + redeploy |
| Broker affiliate_url bị đổi trái phép | Rollback từ audit log | Revoke admin đã đổi | Đổi mật khẩu + 2FA |

---

### 16.11 Security Checklist trước khi go-live

**Infrastructure**
- [ ] SSH key-only, port khác 22, root disabled
- [ ] UFW firewall enabled (chỉ 80/443/SSH port)
- [ ] Fail2ban chạy
- [ ] Cloudflare Proxy ON + Bot Fight Mode
- [ ] Nginx chỉ chấp nhận Cloudflare IP ranges
- [ ] Disk encryption enabled trên VPS

**Application**
- [ ] Mọi API route có Zod validation
- [ ] Rich text content sanitize qua DOMPurify
- [ ] Mọi DB query dùng placeholder
- [ ] CSP header enabled
- [ ] Rate limiting cho public endpoints
- [ ] Error handler không leak stack trace
- [ ] `poweredByHeader: false`

**Admin**
- [ ] Password bcrypt cost ≥ 12
- [ ] 2FA enabled cho superadmin
- [ ] Login lockout sau 10 fail
- [ ] Audit log hoạt động
- [ ] Alert email cho hành động quan trọng
- [ ] Session httpOnly + sameSite=strict

**Database**
- [ ] App user least privilege
- [ ] MySQL không expose port ra ngoài
- [ ] Backup encrypted + tested restore
- [ ] Sensitive columns encrypted

**Ops**
- [ ] `.env.production` chmod 600, không commit
- [ ] `npm audit` clean
- [ ] SSL A+ rating (test qua ssllabs.com)
- [ ] Security headers A+ (test qua securityheaders.com)
- [ ] Restore backup thử được

---

## 18. GO-TO-MARKET — CHIẾN LƯỢC 3 KÊNH SONG SONG

> **Quyết định:** chạy đồng thời **SEO organic + Google Ads (education) + AdSense display**. 3 kênh bù trừ nhau về timeline ROI và policy risk.

### 18.1 Phân bổ effort theo timeline

```
Tháng 1–3   ████████████████████░░░░░░░░░  SEO nền tảng (80%)
            ██░░░░░░░░░░░░░░░░░░░░░░░░░░░  Content education seed (10%)
            ██░░░░░░░░░░░░░░░░░░░░░░░░░░░  Infra + tracking (10%)

Tháng 4–6   ████████████░░░░░░░░░░░░░░░░░  SEO tiếp tục (50%)
            ████████░░░░░░░░░░░░░░░░░░░░░  Google Ads education (30%)
            ████░░░░░░░░░░░░░░░░░░░░░░░░░  Apply AdSense + optimize (20%)

Tháng 7–12  ████████░░░░░░░░░░░░░░░░░░░░░  SEO scale (30%)
            ████████████░░░░░░░░░░░░░░░░░  Google Ads scale winning campaign (40%)
            ██████░░░░░░░░░░░░░░░░░░░░░░░  AdSense optimize (20%)
            ██░░░░░░░░░░░░░░░░░░░░░░░░░░░  Newsletter/remarketing (10%)
```

### 18.2 Kênh 1 — SEO Organic (Long-term Foundation)

**Vai trò:** nền tảng traffic bền vững, không phụ thuộc paid.

**Content plan tháng 1–3:**
- 2 pillar pages (5000+ words): "Forex là gì", "Cách chọn broker forex"
- 20 cluster posts (1500–2500 words) link về pillar
- 10 broker review pages (chi tiết mỗi sàn)
- 20 comparison pages `/compare/[a]-vs-[b]` (programmatic)

**KPIs:**

| Tháng | Indexed pages | Organic traffic | Top-10 keywords |
|---|---|---|---|
| 3 | 30–50 | 500–2k pv/tháng | 5–10 (long-tail) |
| 6 | 80–120 | 5k–15k pv/tháng | 20–40 |
| 12 | 200+ | 30k–100k pv/tháng | 100+ |

**Tracking trong Admin:**
```sql
-- Bảng track SEO performance
CREATE TABLE seo_metrics (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    date         DATE,
    page_path    VARCHAR(500),
    impressions  INT,          -- Từ Google Search Console API
    clicks       INT,
    position     DECIMAL(4,1), -- Avg position
    ctr          DECIMAL(5,4),
    INDEX idx_date_path (date, page_path)
);
```
Optional: pull data từ **Google Search Console API** hàng ngày → dashboard trend.

### 18.3 Kênh 2 — Google Ads Education Content

**Vai trò:** chạy nhanh, có traffic ngay, build audience cho remarketing.

**KHÔNG chạy Ads promote broker trực tiếp.** Chỉ chạy Ads dẫn về:
- Bài educational (guide, tutorial)
- Landing page comparison (`/lp/best-brokers-2026`) — chỉ so sánh, không "sign up now"
- Newsletter signup page (`/lp/free-forex-guide` — free ebook trao đổi email)

**Ad campaign strategy:**

| Campaign | Keyword intent | Landing page | Budget/day (test) |
|---|---|---|---|
| Forex Basics | "forex là gì", "học forex" | `/lp/forex-101` | $5 |
| Broker Comparison | "best forex broker 2026" | `/lp/broker-comparison` | $10 |
| Free Guide | "free forex ebook" | `/lp/free-guide` (email gate) | $5 |
| Retargeting | Audience: past visitors | `/lp/join-newsletter` | $3 |

**Funnel:**
```
Ad click → Landing page (educational, no broker CTA hard-sell)
   ↓
Newsletter signup (soft conversion) → hash email → send tới Enhanced Conversions
   ↓
Email sequence 7 ngày (educational content)
   ↓
Email 8+: giới thiệu broker → link /go/[broker]
   ↓
Affiliate commission
```

**Tại sao email làm middle-layer:**
- Google Ads → landing page: không có broker CTA → **an toàn policy**
- Email → broker link: không phải paid ad → **không cần cert**

**Schema DB bổ sung để track funnel:**
```sql
CREATE TABLE campaign_conversions (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    campaign_slug VARCHAR(200),
    event_type    ENUM('pageview','newsletter_signup','affiliate_click'),
    utm_source    VARCHAR(100),
    utm_medium    VARCHAR(100),
    utm_campaign  VARCHAR(200),
    subscriber_id BIGINT DEFAULT NULL,   -- Link tới bảng subscribers
    ip_hash       VARCHAR(64),
    country       VARCHAR(5),
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_campaign_date (campaign_slug, created_at),
    INDEX idx_subscriber (subscriber_id)
);

-- Bổ sung cột vào subscribers để track source
ALTER TABLE subscribers ADD COLUMN acquisition_campaign VARCHAR(200);
ALTER TABLE subscribers ADD COLUMN acquisition_cost     DECIMAL(10,4);  -- Ước tính CAC
ALTER TABLE subscribers ADD COLUMN first_click_at       DATETIME;
ALTER TABLE subscribers ADD COLUMN first_go_click_at    DATETIME;       -- Lần đầu click affiliate
```

**KPIs Ads education:**

| Metric | Target M3 | Target M6 |
|---|---|---|
| CPC | < $0.50 | < $0.30 |
| Landing page CVR (newsletter) | > 5% | > 10% |
| CAC per subscriber | < $2 | < $1 |
| Email → affiliate click rate | > 8% | > 15% |
| ROAS (revenue/ad spend) | Break-even OK | > 2x |

### 18.4 Kênh 3 — Google AdSense (Passive Revenue)

**Vai trò:** monetize traffic organic mà không cần user click affiliate.

**Timeline apply:**
- **Tháng 3–4:** đạt 30+ posts, 500+ organic pv/tháng → apply AdSense
- **Tháng 4–5:** approve → deploy ad slots
- **Tháng 6+:** optimize placement, block low-CPM ads

**Ad placement strategy** (đã có §9.7):
- Post-intro (sau paragraph 1)
- Mid-content (mỗi 800 words)
- Sidebar sticky desktop
- Bottom of article

**Không đặt:**
- Cạnh affiliate CTA (policy)
- Trong navigation
- Auto-refresh
- Sticky footer mobile (impact CWV)

**KPIs AdSense:**

| Metric | Realistic (VN traffic) | Realistic (EU/US traffic) |
|---|---|---|
| CPM finance niche | $2–5 | $10–30 |
| Ad viewability | > 60% | > 60% |
| Revenue per 1000 pv | $1–3 | $5–15 |

**Chú ý:** finance/forex niche có CPM cao vì advertiser bid mạnh. Đây là lý do niche này đắt giá cho AdSense.

### 18.5 Kết hợp 3 kênh — Compounding Effect

```
Organic traffic (SEO)     ─┐
                            ├─→  Landing pages
Paid traffic (Ads Edu)    ─┘         │
                                     ▼
                              Newsletter signup
                                     │
                                     ▼
                        Email nurture (7–14 ngày)
                                     │
                    ┌────────────────┴────────────────┐
                    ▼                                 ▼
              Affiliate click                  Return to site
             (revenue chính)                (AdSense revenue phụ)
```

**Revenue streams tối đa:**
1. Affiliate commission (per signup + revenue share)
2. AdSense display (per impression + click)
3. Newsletter sponsorship (khi list > 5k email)
4. Sponsored posts (khi có authority)

### 18.6 Metrics Dashboard bổ sung `/admin/analytics`

**Tab 4: Channel Performance**
- Traffic breakdown: Organic vs Paid vs Direct vs Referral
- Revenue breakdown: Affiliate vs AdSense
- CAC per channel
- ROI per campaign (Ads spend vs conversion)

**Tab 5: Funnel Analysis**
- Landing page → newsletter conversion
- Newsletter → affiliate click conversion
- Time from first visit → first affiliate click (median)
- Top-converting content

**Query mẫu — funnel per campaign:**
```sql
SELECT
    campaign_slug,
    COUNT(DISTINCT CASE WHEN event_type = 'pageview' THEN ip_hash END) AS visitors,
    COUNT(DISTINCT CASE WHEN event_type = 'newsletter_signup' THEN subscriber_id END) AS signups,
    COUNT(DISTINCT CASE WHEN event_type = 'affiliate_click' THEN ip_hash END) AS aff_clicks,
    ROUND(
        COUNT(DISTINCT CASE WHEN event_type = 'newsletter_signup' THEN subscriber_id END) * 100.0 /
        NULLIF(COUNT(DISTINCT CASE WHEN event_type = 'pageview' THEN ip_hash END), 0),
        2
    ) AS signup_rate_pct
FROM campaign_conversions
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY campaign_slug
ORDER BY visitors DESC;
```

### 18.7 Newsletter Infrastructure

Kênh Ads phụ thuộc email nurture → cần setup nghiêm túc:

**Option 1: Self-host Listmonk** (free, Docker)
```yaml
# Thêm vào docker-compose
listmonk:
  image: listmonk/listmonk:latest
  networks: [backend]
  environment:
    - LISTMONK_db__host=mysql   # Dùng chung DB
```

**Option 2: SaaS**
- **Resend** — 3k email/tháng free, API dev-friendly
- **Buttondown** — $9/tháng cho 1k subs
- **Beehiiv** — free tier + built-in monetization

**Đề xuất:** Resend cho MVP (dễ integrate), migrate sang Listmonk khi list > 10k để save cost.

**SMTP config cho transactional (không dùng cho marketing):**
- **Resend** hoặc **Amazon SES** ($0.10/1k email)
- KHÔNG dùng Gmail SMTP (rate limit + spam risk)

### 18.8 Roadmap Phase Bổ Sung

**Phase 4 — Monetization Scale (tuần 15–20)**
- [ ] Newsletter platform setup (Resend + Listmonk sau)
- [ ] Email sequence 7 bước cho new subscriber
- [ ] Landing page A/B testing framework
- [ ] AdSense apply + integrate (§9.7)
- [ ] Retargeting audiences (§9.8)
- [ ] Channel Performance dashboard (§18.6)

**Phase 5 — Optimize (tháng 6+)**
- [ ] Scale winning ad campaigns (>2x ROAS)
- [ ] Sponsored post opportunities
- [ ] Multi-language expansion (EN)
- [ ] Explore YouTube channel (video SEO)

### 18.9 Cost Estimate — 3 Kênh (Monthly)

| Item | Cost |
|---|---|
| Infrastructure (từ §17) | ~€8/tháng |
| Google Ads budget (test → scale) | $150–500/tháng M1–6, $500–2000/tháng M6+ |
| Resend email (3k free → 50k email $20) | $0–$20/tháng |
| Cookiebot upgrade (nếu > 25k pv) | €0–€12/tháng |
| Optional: SEMrush/Ahrefs cho keyword research | $0 (free tools) hoặc $100/tháng |
| **Tổng Phase 1–3 (bootstrap)** | **~$50–200/tháng** |
| **Tổng Phase 4+ (scaling)** | **~$300–2200/tháng** |

**Break-even estimate:**
- 1 affiliate signup forex broker = $50–500 commission (revshare có thể $1000+/lifetime)
- Cần 1–5 signups/tháng để cover Phase 1 cost
- Cần 10–30 signups/tháng để cover Phase 4 scaling

---

## 19. COST ESTIMATE (MONTHLY)

| Item | Cost |
|---|---|
| VPS (Hetzner CX22) | ~€4.5/tháng |
| Domain | ~$15/năm (~$1.25/tháng) |
| Cloudflare Free | $0 |
| Cloudflare R2 (10GB storage + egress) | ~$0–$1.5 |
| MaxMind GeoIP2 Lite | $0 (free) |
| Binance REST API | $0 (free) |
| Meilisearch (self-host) | $0 (included trong VPS) |
| CookieYes CMP (Consent Mode v2) | $0 (free ≤ 25k pv/tháng) |
| Google Search Console | $0 |
| Google Analytics 4 | $0 |
| **Tổng infrastructure** | **~€6–8/tháng** |

---

## 20. PAYLOAD & RESPONSE SECURITY

> **Mục tiêu:** mọi data exchange qua HTTP đều được validate, sanitize, và có cơ chế chống tamper. Layer này bổ sung cho TLS — vì TLS chỉ bảo vệ transport, không bảo vệ nội dung nếu endpoint bị abuse.

### 20.1 Phân loại endpoint và mức bảo vệ

| Endpoint group | Dữ liệu nhạy cảm | Biện pháp |
|---|---|---|
| `GET /api/prices/stream` | Không | Rate limit, no-cache header |
| `GET /go/[slug]` | Không | Rate limit, bot filter, no-cache |
| `POST /api/newsletter` | Email | HTTPS + Zod + rate limit |
| `POST /api/contact` | Email, message | HTTPS + Zod + rate limit + honeypot |
| `POST /api/admin/login` | Credential | HTTPS + bcrypt + rate limit + lockout |
| `POST /api/admin/*` | Content, config | HTTPS + JWT + CSRF origin check + Zod |
| `GET /api/admin/analytics` | Traffic data | JWT + role check |
| `POST /api/admin/upload` | File binary | JWT + MIME check + size limit |

### 20.2 Response Envelope — chuẩn thống nhất toàn app

Mọi API response đều theo một shape — FE không bao giờ parse ad-hoc.

```typescript
// lib/api/response.ts

export type ApiStatus = 'ok' | 'error' | 'validation_error';

export interface ApiResponse<T = null> {
  status:    ApiStatus;
  data:      T | null;
  error?:    string;           // Message an toàn cho client (không leak internal)
  errors?:   Record<string, string[]>;  // Field-level errors cho form
  reqId:     string;           // UUID — dùng để trace log server-side
  ts:        number;           // Unix timestamp — client có thể verify freshness
}

// Factory functions — không new object thủ công ở mỗi route
export const ApiRes = {
  ok<T>(data: T): ApiResponse<T> {
    return { status: 'ok', data, reqId: crypto.randomUUID(), ts: Date.now() };
  },

  error(message: string, statusCode = 500): { body: ApiResponse; statusCode: number } {
    return {
      body: { status: 'error', data: null, error: message, reqId: crypto.randomUUID(), ts: Date.now() },
      statusCode,
    };
  },

  validationError(errors: Record<string, string[]>): { body: ApiResponse; statusCode: 400 } {
    return {
      body: { status: 'validation_error', data: null, errors, reqId: crypto.randomUUID(), ts: Date.now() },
      statusCode: 400,
    };
  },
};

// Helper để wrap NextResponse
export function jsonOk<T>(data: T) {
  return NextResponse.json(ApiRes.ok(data));
}

export function jsonError(message: string, status = 500) {
  const { body, statusCode } = ApiRes.error(message, status);
  return NextResponse.json(body, { status: statusCode });
}

export function jsonValidationError(errors: Record<string, string[]>) {
  const { body, statusCode } = ApiRes.validationError(errors);
  return NextResponse.json(body, { status: statusCode });
}
```

**Sử dụng trong route:**
```typescript
// app/api/admin/posts/route.ts
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createPostSchema.safeParse(body);
    if (!parsed.success) {
      return jsonValidationError(parsed.error.flatten().fieldErrors);
    }
    const post = await PostRepository.create(parsed.data);
    return jsonOk(post);
  } catch (err) {
    logger.error('posts.create', err);
    return jsonError('Internal server error');
    // KHÔNG return err.message — có thể chứa DB schema, path, ...
  }
}
```

**Client luôn parse theo shape chuẩn:**
```typescript
// lib/api/client.ts
export async function apiRequest<T>(
  url: string,
  options?: RequestInit
): Promise<{ data: T | null; error: string | null }> {
  const res = await fetch(url, options);
  const json: ApiResponse<T> = await res.json();

  if (json.status !== 'ok') {
    return { data: null, error: json.error ?? 'Unknown error' };
  }
  return { data: json.data, error: null };
}
```

### 20.3 Response Field Filtering — không trả dư field

Admin user model trong DB có `password`, `totp_secret`. Không bao giờ trả thẳng DB row ra response.

```typescript
// lib/dto/user.dto.ts — Data Transfer Object
export interface AdminUserPublicDTO {
  id:    number;
  email: string;
  name:  string;
  role:  string;
}

// Mapper — convert DB row → safe DTO
export function toAdminUserDTO(row: AdminUserRow): AdminUserPublicDTO {
  return { id: row.id, email: row.email, name: row.name, role: row.role };
  // password, totp_secret, failed_login_count KHÔNG có mặt
}
```

**Nguyên tắc chung:** mỗi entity có ít nhất 1 DTO file trong `lib/dto/`. Route handler chỉ trả DTO, không trả DB row.

### 20.4 Request Signature — chống replay attack cho admin mutation

Admin `POST/PUT/DELETE` thêm HMAC signature trong header. Server verify trước khi xử lý.

```typescript
// lib/api/signature.ts
const SECRET = process.env.REQUEST_SIGNING_SECRET!;  // 32-byte random

// Client (admin UI) ký mỗi request
export async function signRequest(body: object): Promise<{ signature: string; ts: number }> {
  const ts = Date.now();
  const payload = `${ts}.${JSON.stringify(body)}`;
  const sig = await hmacSha256(payload, SECRET);
  return { signature: sig, ts };
}

// Server verify
export function verifyRequestSignature(
  body: object,
  signature: string,
  ts: number
): boolean {
  // 1. Replay window: không chấp nhận request cũ hơn 5 phút
  if (Math.abs(Date.now() - ts) > 5 * 60 * 1000) return false;

  // 2. Verify HMAC
  const payload = `${ts}.${JSON.stringify(body)}`;
  const expected = hmacSha256Sync(payload, SECRET);
  return timingSafeEqual(signature, expected);  // Timing-safe compare
}
```

```typescript
// Middleware cho admin mutation routes
export function withSignatureVerification(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const sig = req.headers.get('x-signature');
    const ts  = parseInt(req.headers.get('x-timestamp') ?? '0');
    const body = await req.clone().json();  // clone để handler vẫn đọc được

    if (!sig || !verifyRequestSignature(body, sig, ts)) {
      return jsonError('Invalid request signature', 401);
    }
    return handler(req);
  };
}
```

Áp dụng cho routes quan trọng: `broker_links.update`, `settings.update`, `users.delete`.

### 20.5 Response Integrity Header

Server thêm hash của response body trong header. Client verify nếu muốn chắc chắn response chưa bị tamper (relevant khi có CDN cache layer).

```typescript
// middleware.ts — áp dụng cho /api/*
export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Thêm vào response handler sau khi có body
  // (Next.js 14 chưa có middleware body access — implement qua custom header từ route handler)
  return res;
}

// Trong route handler — thêm ETag + content hash
export function jsonOkWithIntegrity<T>(data: T) {
  const body = JSON.stringify(ApiRes.ok(data));
  const hash = createHash('sha256').update(body).digest('base64url');

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'ETag': `"${hash}"`,
      'X-Content-Hash': hash,  // Client có thể verify
    },
  });
}
```

### 20.6 Sensitive Data Masking trong Log

```typescript
// lib/logger.ts
const MASKED_FIELDS = ['password', 'token', 'secret', 'totp', 'credit_card', 'email'];

function maskSensitive(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => {
      if (MASKED_FIELDS.some(f => k.toLowerCase().includes(f))) {
        return [k, '***REDACTED***'];
      }
      if (typeof v === 'object' && v !== null) {
        return [k, maskSensitive(v as Record<string, unknown>)];
      }
      return [k, v];
    })
  );
}

export const logger = {
  info:  (event: string, data?: object) =>
    console.info(JSON.stringify({ level: 'info', event, data: data ? maskSensitive(data) : undefined, ts: Date.now() })),
  error: (event: string, err: unknown) =>
    console.error(JSON.stringify({ level: 'error', event, message: err instanceof Error ? err.message : String(err), ts: Date.now() })),
  // Stack trace chỉ log server-side, KHÔNG bao giờ trả ra response
};
```

---

## 21. CODING STANDARDS — OOP / SOLID / MAINTAINABLE

> **Triết lý:** Solo dev = bảo trì 1 mình. Code phải đọc được sau 6 tháng không nhìn. Mọi thứ global (style, i18n, config) đặt 1 chỗ — thay ở đó là thay đổi toàn app.

### 21.1 Project Architecture — Clean Layers

```
src/
├── app/                    # Next.js routes — chỉ chứa thin handlers
│   ├── (public)/
│   ├── admin/
│   └── api/
│
├── domain/                 # Business logic — không import Next.js, không import DB driver
│   ├── post/
│   │   ├── Post.ts          # Entity class
│   │   ├── PostRepository.interface.ts
│   │   └── PostService.ts   # Use cases
│   ├── broker/
│   ├── click/
│   └── price/
│
├── infrastructure/         # Implementations — DB, Redis, R2, Email
│   ├── db/
│   │   ├── MysqlPostRepository.ts   # Implements PostRepository.interface
│   │   └── connection.ts
│   ├── cache/
│   │   └── RedisClient.ts
│   ├── storage/
│   │   └── R2StorageService.ts
│   └── email/
│       └── ResendEmailService.ts
│
├── lib/                    # Cross-cutting utilities
│   ├── api/
│   │   ├── response.ts      # §20.2 — ApiRes factory
│   │   ├── client.ts        # FE API client
│   │   └── signature.ts     # §20.4
│   ├── validation/          # §21.3 — Zod schemas
│   ├── security/            # §21.4 — sanitize, path guard, sql guard
│   ├── dto/                 # §20.3 — DTOs
│   └── logger.ts            # §20.6
│
├── components/              # UI components
│   ├── ui/                  # Primitives — Button, Input, Badge
│   ├── public/              # Public-facing
│   └── admin/               # Admin-only
│
├── config/                  # §21.2 — Global constants
│   ├── constants.ts
│   ├── routes.ts
│   └── i18n.ts
│
└── styles/                  # §21.5 — Design tokens
    ├── tokens.css
    └── globals.css
```

**Nguyên tắc phân tầng:**
- `app/` → gọi `domain/` (Service), không gọi thẳng `infrastructure/`
- `domain/` → không biết DB, Redis, hay HTTP
- `infrastructure/` → implement interface từ `domain/`
- `lib/` → dùng ở mọi nơi, không phụ thuộc domain logic

### 21.2 Global Config — Thay 1 chỗ, đổi toàn app

```typescript
// config/constants.ts
export const APP_CONFIG = {
  name:        'PIPSNOTE',
  tagline:     'Kiến thức Forex & Crypto cho trader Việt',
  domain:      'https://pipsnote.com',
  supportEmail: 'support@pipsnote.com',

  // Pagination
  postsPerPage:   12,
  brokersPerPage: 20,

  // Rate limits (mirror với Nginx — để có thể enforce ở app layer nữa)
  rateLimits: {
    newsletter:  { max: 3,  windowSec: 3600 },
    contact:     { max: 5,  windowSec: 3600 },
    adminLogin:  { max: 5,  windowSec: 900  },
    affiliateGo: { max: 10, windowSec: 60   },
  },

  // Click tracking
  clickDedupWindowSec: 600,   // 10 phút

  // Price polling
  cryptoPollIntervalMs: 15_000,
  forexPollIntervalMs:  30_000,

  // Upload
  maxUploadBytes: 5 * 1024 * 1024,  // 5MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const,

  // Session
  sessionMaxAgeSec: 8 * 60 * 60,    // 8h

  // Affiliate dedup
  affiliateDedupTtl: 600,

  // Pagination SEO
  maxSitemapUrls: 50_000,
} as const;

// config/routes.ts — Tất cả URL/path đặt đây, không hardcode string trong component
export const ROUTES = {
  home:          '/',
  blog:          '/blog',
  blogPost:      (slug: string) => `/blog/${slug}`,
  brokers:       '/brokers',
  brokerDetail:  (slug: string) => `/brokers/${slug}`,
  compare:       (pair: string) => `/compare/${pair}`,
  affiliateGo:   (slug: string) => `/go/${slug}`,
  lp:            (campaign: string) => `/lp/${campaign}`,

  admin: {
    dashboard:   '/admin',
    posts:       '/admin/posts',
    postEdit:    (id: number) => `/admin/posts/${id}`,
    brokers:     '/admin/brokers',
    analytics:   '/admin/analytics',
    audit:       '/admin/audit',
    settings:    '/admin/settings',
  },

  api: {
    priceStream: '/api/prices/stream',
    newsletter:  '/api/newsletter',
    contact:     '/api/contact',
    adminLogin:  '/api/admin/login',
    adminPosts:  '/api/admin/posts',
    upload:      '/api/admin/upload',
  },
} as const;

// config/i18n.ts — Mọi string hiển thị user đặt đây
// Thêm EN sau chỉ cần thêm key vào đây
export const UI_TEXT = {
  vi: {
    nav: {
      home:      'Trang chủ',
      blog:      'Blog',
      brokers:   'Sàn giao dịch',
      compare:   'So sánh',
    },
    broker: {
      openAccount:  'Mở tài khoản',
      minDeposit:   'Nạp tối thiểu',
      leverage:     'Đòn bẩy',
      spread:       'Spread từ',
      regulation:   'Quy định',
    },
    cta: {
      readMore:     'Đọc thêm',
      viewAll:      'Xem tất cả',
      subscribe:    'Đăng ký nhận bài',
      compare:      'So sánh sàn',
    },
    error: {
      generic:      'Đã có lỗi xảy ra. Vui lòng thử lại.',
      notFound:     'Không tìm thấy trang này.',
      networkError: 'Lỗi kết nối. Kiểm tra lại mạng.',
    },
    meta: {
      siteName: 'PIPSNOTE',
      defaultTitle: 'PIPSNOTE — Kiến thức Forex & Crypto',
    },
    disclaimer: {
      affiliate: 'Trang này chứa liên kết affiliate. Chúng tôi có thể nhận hoa hồng khi bạn đăng ký qua các liên kết này.',
      risk:      'Giao dịch forex và CFD có rủi ro cao. Bạn có thể mất toàn bộ vốn đầu tư.',
    },
  },
} as const;

export type Lang = keyof typeof UI_TEXT;
export const DEFAULT_LANG: Lang = 'vi';

// Hook dùng trong component
export function useText(lang: Lang = DEFAULT_LANG) {
  return UI_TEXT[lang];
}
```

### 21.3 Validation Layer — Zod Schemas tập trung

```typescript
// lib/validation/schemas.ts
import { z } from 'zod';

// --- Primitives tái dụng ---
const SlugSchema = z.string()
  .min(3).max(200)
  .regex(/^[a-z0-9-]+$/, 'Slug chỉ được chứa chữ thường, số và dấu gạch ngang');

const UrlSchema = z.string()
  .url()
  .max(2000)
  .refine(u => ['https:'].includes(new URL(u).protocol), 'Chỉ chấp nhận HTTPS URL');

const HtmlContentSchema = z.string()
  .max(500_000)
  .transform(html => sanitizeHtml(html));   // Auto-sanitize khi parse

const EmailSchema = z.string().email().max(254).toLowerCase().trim();

// --- Post schemas ---
export const CreatePostSchema = z.object({
  title:       z.string().min(3).max(500).trim(),
  slug:        SlugSchema,
  excerpt:     z.string().max(500).trim().optional(),
  content:     HtmlContentSchema,
  category_id: z.number().int().positive(),
  thumbnail:   UrlSchema.optional(),
  status:      z.enum(['draft', 'published']),
  is_featured: z.boolean().default(false),
  seo_title:   z.string().max(200).trim().optional(),
  seo_desc:    z.string().max(300).trim().optional(),
  seo_keywords: z.string().max(500).trim().optional(),
});

export const UpdatePostSchema = CreatePostSchema.partial().extend({
  id: z.number().int().positive(),
});

// --- Broker schemas ---
export const CreateBrokerSchema = z.object({
  name:          z.string().min(1).max(200).trim(),
  slug:          SlugSchema,
  type:          z.enum(['forex', 'crypto', 'stock', 'all']),
  affiliate_url: UrlSchema,
  rating:        z.number().min(0).max(5).multipleOf(0.1).optional(),
  min_deposit:   z.string().max(50).optional(),
  leverage:      z.string().max(50).optional(),
  is_featured:   z.boolean().default(false),
  is_active:     z.boolean().default(true),
});

// --- Public form schemas ---
export const NewsletterSchema = z.object({
  email:     EmailSchema,
  honeypot:  z.literal('').optional(), // Bot trap — phải rỗng
});

export const ContactSchema = z.object({
  name:     z.string().min(2).max(100).trim(),
  email:    EmailSchema,
  message:  z.string().min(10).max(2000).trim(),
  honeypot: z.literal('').optional(),
});

// --- Auth schemas ---
export const LoginSchema = z.object({
  email:    EmailSchema,
  password: z.string().min(1).max(200),
  totp:     z.string().length(6).regex(/^\d+$/).optional(),
});

// --- Util: format Zod errors thành field-level map ---
export function formatZodErrors(error: z.ZodError): Record<string, string[]> {
  return error.flatten().fieldErrors as Record<string, string[]>;
}
```

### 21.4 Security Guards — Tập trung, tái sử dụng

```typescript
// lib/security/guards.ts

import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';
import path from 'path';
import { z } from 'zod';

const window = new JSDOM('').window;
const purify = DOMPurify(window);

// ─── 1. XSS Guard ──────────────────────────────────────────────────────────

const ALLOWED_TAGS = [
  'p','h1','h2','h3','h4','strong','em','u','s','a','ul','ol','li',
  'img','blockquote','code','pre','table','thead','tbody','tr','td','th',
  'br','hr','span','div','figure','figcaption',
];

const ALLOWED_ATTR = ['href','src','alt','title','class','target','rel','width','height'];

export function sanitizeHtml(dirty: string): string {
  return purify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i,  // Chặn javascript:, data:, vbscript:
    FORBID_TAGS:  ['script','style','iframe','object','embed','form','input','button'],
    FORBID_ATTR:  ['onerror','onload','onclick','onmouseover'],  // Event handlers
    FORCE_BODY:   true,
    RETURN_TRUSTED_TYPE: false,
  });
}

// Sanitize plain text — strip mọi HTML
export function sanitizeText(input: string): string {
  return purify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

// ─── 2. Path Traversal Guard ────────────────────────────────────────────────

const UPLOAD_BASE = '/mnt/uploads';  // Thư mục upload hợp lệ

export function guardFilePath(filename: string): string {
  // Chuẩn hóa, resolve absolute path
  const resolved = path.resolve(UPLOAD_BASE, path.basename(filename));

  // Không được thoát ra ngoài UPLOAD_BASE
  if (!resolved.startsWith(UPLOAD_BASE + path.sep)) {
    throw new SecurityError('PATH_TRAVERSAL', `Invalid file path: ${filename}`);
  }
  return resolved;
}

// Validate slug/param trong URL — chặn path injection
export function guardSlug(slug: string): string {
  const cleaned = slug.replace(/[^a-z0-9-]/g, '');
  if (cleaned !== slug) {
    throw new SecurityError('INVALID_SLUG', `Slug contains invalid characters: ${slug}`);
  }
  if (cleaned.length < 1 || cleaned.length > 200) {
    throw new SecurityError('INVALID_SLUG', 'Slug length out of bounds');
  }
  return cleaned;
}

// ─── 3. SQL Injection Guard ─────────────────────────────────────────────────
// Primary defense: mysql2 parameterized queries (§16.4)
// Secondary: runtime type check để phát hiện misuse sớm

export function assertSafeQueryParam(value: unknown, fieldName: string): void {
  // Số: OK
  if (typeof value === 'number' && Number.isFinite(value)) return;
  // String: check có pattern nguy hiểm không
  if (typeof value === 'string') {
    const SQL_INJECTION_PATTERNS = /('|--|;|\/\*|\*\/|xp_|UNION|SELECT|INSERT|UPDATE|DELETE|DROP|EXEC|CAST|CONVERT)/i;
    if (SQL_INJECTION_PATTERNS.test(value)) {
      // Log để alert — attacker đang probe
      logger.error('sql_injection_attempt', { field: fieldName, value: value.slice(0, 100) });
      throw new SecurityError('SQL_INJECTION', `Suspicious value in field: ${fieldName}`);
    }
    return;
  }
  throw new SecurityError('INVALID_PARAM_TYPE', `Field ${fieldName} must be string or number`);
}

// ─── 4. Custom Error Class ──────────────────────────────────────────────────

export class SecurityError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'SecurityError';
  }
}

// ─── 5. Honeypot Check ─────────────────────────────────────────────────────
// Bot thường fill all fields — honeypot field phải trống

export function checkHoneypot(value: string | undefined): void {
  if (value !== undefined && value !== '') {
    throw new SecurityError('BOT_DETECTED', 'Honeypot field was filled');
  }
}
```

### 21.5 Design Tokens — Global Style, thay 1 chỗ đổi toàn bộ

```css
/* styles/tokens.css — import 1 lần trong globals.css */

:root {
  /* ─── Brand Colors ─────────────────────────── */
  --color-primary:        #0ea5e9;   /* Sky blue — main CTA */
  --color-primary-dark:   #0284c7;
  --color-primary-light:  #e0f2fe;
  --color-accent:         #f59e0b;   /* Amber — badge, highlight */
  --color-danger:         #ef4444;
  --color-success:        #22c55e;
  --color-warning:        #f97316;

  /* ─── Semantic Colors ──────────────────────── */
  --color-bg:             #ffffff;
  --color-bg-secondary:   #f8fafc;
  --color-bg-card:        #ffffff;
  --color-border:         #e2e8f0;
  --color-border-strong:  #cbd5e1;
  --color-text:           #0f172a;
  --color-text-secondary: #475569;
  --color-text-muted:     #94a3b8;
  --color-text-inverse:   #ffffff;

  /* ─── Price tick colors ────────────────────── */
  --color-price-up:       #22c55e;
  --color-price-down:     #ef4444;

  /* ─── Typography ───────────────────────────── */
  --font-sans:  'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono:  'JetBrains Mono', 'Fira Code', monospace;

  --text-xs:    0.75rem;    /* 12px */
  --text-sm:    0.875rem;   /* 14px — minimum mobile */
  --text-base:  1rem;       /* 16px */
  --text-lg:    1.125rem;   /* 18px */
  --text-xl:    1.25rem;    /* 20px */
  --text-2xl:   1.5rem;     /* 24px */
  --text-3xl:   1.875rem;   /* 30px */
  --text-4xl:   2.25rem;    /* 36px */

  --font-normal: 400;
  --font-medium: 500;
  --font-semi:   600;
  --font-bold:   700;

  --leading-tight:  1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;

  /* ─── Spacing scale ────────────────────────── */
  --space-1:  0.25rem;  /* 4px */
  --space-2:  0.5rem;   /* 8px */
  --space-3:  0.75rem;  /* 12px */
  --space-4:  1rem;     /* 16px */
  --space-5:  1.25rem;  /* 20px */
  --space-6:  1.5rem;   /* 24px */
  --space-8:  2rem;     /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */

  /* ─── Border radius ────────────────────────── */
  --radius-sm:  0.25rem;
  --radius-md:  0.5rem;
  --radius-lg:  0.75rem;
  --radius-xl:  1rem;
  --radius-full: 9999px;

  /* ─── Shadows ──────────────────────────────── */
  --shadow-sm:  0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md:  0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg:  0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);

  /* ─── Transitions ──────────────────────────── */
  --transition-fast:   150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow:   400ms ease;

  /* ─── Layout ───────────────────────────────── */
  --container-sm:   640px;
  --container-md:   768px;
  --container-lg:  1024px;
  --container-xl:  1280px;
  --container-2xl: 1440px;

  /* ─── Z-index layers ───────────────────────── */
  --z-base:    0;
  --z-raised:  10;
  --z-dropdown:100;
  --z-sticky:  200;
  --z-overlay: 300;
  --z-modal:   400;
  --z-toast:   500;

  /* ─── Touch targets (mobile a11y) ─────────── */
  --touch-min: 44px;   /* Minimum 44x44px — §userPreferences */
}

/* Dark mode — dùng CSS vars nên đổi token là xong */
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg:             #0f172a;
    --color-bg-secondary:   #1e293b;
    --color-bg-card:        #1e293b;
    --color-border:         #334155;
    --color-text:           #f1f5f9;
    --color-text-secondary: #94a3b8;
    --color-text-muted:     #475569;
  }
}
```

### 21.6 UI Component Primitives — Tái sử dụng, style từ token

```tsx
// components/ui/Button.tsx
import { ROUTES } from '@/config/routes';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize    = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  ButtonVariant;
  size?:     ButtonSize;
  loading?:  boolean;
  icon?:     React.ReactNode;
}

// Variant styles — đổi ở đây là đổi toàn app
const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:   'bg-[--color-primary] text-[--color-text-inverse] hover:bg-[--color-primary-dark]',
  secondary: 'bg-transparent border border-[--color-border] text-[--color-text] hover:bg-[--color-bg-secondary]',
  danger:    'bg-[--color-danger] text-white hover:opacity-90',
  ghost:     'bg-transparent text-[--color-text-secondary] hover:text-[--color-text]',
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm:  'h-8 px-3 text-[--text-sm]',
  md:  'h-11 px-5 text-[--text-base]',       // h-11 = 44px — touch target
  lg:  'h-12 px-6 text-[--text-lg]',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center gap-2',
        'rounded-[--radius-md] font-[--font-medium]',
        'transition-[background,opacity] duration-[--transition-fast]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        className,
      ].join(' ')}
    >
      {loading ? <Spinner size="sm" /> : icon}
      {children}
    </button>
  );
}

// components/ui/Input.tsx
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label:    string;
  error?:   string;
  hint?:    string;
}

export function Input({ label, error, hint, id, className = '', ...props }: InputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-[--space-1] w-full">
      {/* Label TRÊN input — mobile requirement */}
      <label htmlFor={inputId} className="text-[--text-sm] font-[--font-medium] text-[--color-text]">
        {label}
        {props.required && <span className="text-[--color-danger] ml-1">*</span>}
      </label>
      <input
        {...props}
        id={inputId}
        className={[
          'w-full h-11 px-3',                       // h-11 = 44px touch target
          'rounded-[--radius-md] border',
          'text-[--text-base] text-[--color-text] bg-[--color-bg]',
          'transition-colors duration-[--transition-fast]',
          'focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-transparent',
          error
            ? 'border-[--color-danger] focus:ring-[--color-danger]'
            : 'border-[--color-border]',
          className,
        ].join(' ')}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
      />
      {error && (
        <span id={`${inputId}-error`} className="text-[--text-xs] text-[--color-danger]">
          {error}
        </span>
      )}
      {hint && !error && (
        <span id={`${inputId}-hint`} className="text-[--text-xs] text-[--color-text-muted]">
          {hint}
        </span>
      )}
    </div>
  );
}

// components/ui/Card.tsx — dùng ở khắp nơi (BrokerCard, PostCard)
interface CardProps {
  children:  React.ReactNode;
  className?: string;
  as?:       React.ElementType;
  hover?:    boolean;
}

export function Card({ children, className = '', as: Tag = 'div', hover = false }: CardProps) {
  return (
    <Tag
      className={[
        'bg-[--color-bg-card]',
        'border border-[--color-border]',
        'rounded-[--radius-lg]',
        'shadow-[--shadow-sm]',
        hover ? 'transition-shadow duration-[--transition-normal] hover:shadow-[--shadow-md] cursor-pointer' : '',
        className,
      ].join(' ')}
    >
      {children}
    </Tag>
  );
}

// components/ui/Badge.tsx
type BadgeVariant = 'default' | 'success' | 'danger' | 'warning' | 'accent';

const BADGE_VARIANTS: Record<BadgeVariant, string> = {
  default: 'bg-[--color-bg-secondary] text-[--color-text-secondary]',
  success: 'bg-green-100 text-green-800',
  danger:  'bg-red-100 text-red-800',
  warning: 'bg-amber-100 text-amber-800',
  accent:  'bg-[--color-primary-light] text-[--color-primary-dark]',
};

export function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: BadgeVariant }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-[--radius-full] text-[--text-xs] font-[--font-medium] ${BADGE_VARIANTS[variant]}`}>
      {children}
    </span>
  );
}
```

### 21.7 Repository Pattern — Domain Layer

```typescript
// domain/post/PostRepository.interface.ts
export interface IPostRepository {
  findBySlug(slug: string): Promise<Post | null>;
  findMany(options: PostQueryOptions): Promise<{ items: Post[]; total: number }>;
  findFeatured(limit: number): Promise<Post[]>;
  create(data: CreatePostInput): Promise<Post>;
  update(id: number, data: UpdatePostInput): Promise<Post>;
  delete(id: number): Promise<void>;
  incrementViewCount(id: number): Promise<void>;
}

// infrastructure/db/MysqlPostRepository.ts — implements interface
export class MysqlPostRepository implements IPostRepository {
  constructor(private readonly db: DatabaseConnection) {}

  async findBySlug(slug: string): Promise<Post | null> {
    // guardSlug ở đây — đảm bảo slug sạch trước khi query
    const safeSlug = guardSlug(slug);
    const [rows] = await this.db.query(
      `SELECT * FROM posts WHERE slug = ? AND status = 'published' LIMIT 1`,
      [safeSlug]    // Parameterized — không bao giờ string concat
    );
    return rows[0] ? this.mapRowToPost(rows[0]) : null;
  }

  async findMany({ page = 1, limit = 12, categoryId, search }: PostQueryOptions) {
    const offset = (page - 1) * limit;
    const conditions: string[] = ["status = 'published'"];
    const params: unknown[]    = [];

    if (categoryId) {
      conditions.push('category_id = ?');
      params.push(categoryId);
    }
    if (search) {
      // Full-text search qua Meilisearch — không LIKE query trực tiếp
      const searchResults = await meilisearch.search('posts', search);
      conditions.push(`id IN (${searchResults.ids.join(',')})`);
      // Không inject search string vào SQL
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows]  = await this.db.query(`SELECT * FROM posts ${where} LIMIT ? OFFSET ?`, [...params, limit, offset]);
    const [[{ total }]] = await this.db.query(`SELECT COUNT(*) as total FROM posts ${where}`, params);

    return { items: rows.map(this.mapRowToPost), total };
  }

  // Mapper: DB row → domain entity (không leak DB field names ra ngoài)
  private mapRowToPost(row: PostRow): Post {
    return {
      id:          row.id,
      slug:        row.slug,
      title:       row.title,
      excerpt:     row.excerpt ?? '',
      content:     row.content,
      thumbnail:   row.thumbnail ?? null,
      viewCount:   row.view_count,
      publishedAt: new Date(row.published_at),
      updatedAt:   new Date(row.updated_at),
      author:      null,    // Load riêng khi cần (lazy)
    };
  }
}

// domain/post/PostService.ts — business logic, không biết DB
export class PostService {
  constructor(
    private readonly postRepo: IPostRepository,  // Inject interface, không implementation
    private readonly auditLog: IAuditLogService,
  ) {}

  async getPost(slug: string): Promise<Post> {
    const post = await this.postRepo.findBySlug(slug);
    if (!post) throw new NotFoundError('Post', slug);

    // Business rule: tăng view count (fire and forget)
    this.postRepo.incrementViewCount(post.id).catch(() => {});

    return post;
  }

  async createPost(data: CreatePostInput, adminId: number): Promise<Post> {
    // Business validation ngoài Zod (cross-field, DB-level)
    const existing = await this.postRepo.findBySlug(data.slug);
    if (existing) throw new ConflictError('Slug này đã được sử dụng');

    const post = await this.postRepo.create(data);

    // Audit log mọi create
    await this.auditLog.log({
      adminId,
      action:     'post.create',
      entityType: 'post',
      entityId:   post.id,
      changes:    { after: { title: post.title, slug: post.slug } },
    });

    return post;
  }
}
```

### 21.8 Middleware Stack — Compose theo thứ tự

```typescript
// lib/api/middleware.ts — compose pattern, không lồng nhau

type Handler = (req: NextRequest, ctx?: unknown) => Promise<NextResponse>;
type Middleware = (handler: Handler) => Handler;

// Compose: withAuth(withRateLimit(withValidation(handler)))
// Đọc từ trong ra ngoài — middleware ngoài chạy trước
export function compose(...middlewares: Middleware[]): (handler: Handler) => Handler {
  return (handler: Handler) =>
    middlewares.reduceRight((acc, mw) => mw(acc), handler);
}

// Middleware: xác thực JWT
export function withAuth(handler: Handler): Handler {
  return async (req: NextRequest) => {
    const token = req.cookies.get('session')?.value;
    if (!token) return jsonError('Unauthorized', 401);

    const payload = verifyJwt(token);
    if (!payload) return jsonError('Session expired', 401);

    // Inject vào header để handler đọc được (NextRequest immutable)
    const headers = new Headers(req.headers);
    headers.set('x-admin-id',   String(payload.id));
    headers.set('x-admin-role', payload.role);
    return handler(new NextRequest(req, { headers }));
  };
}

// Middleware: rate limit
export function withRateLimit(config: { max: number; windowSec: number }): Middleware {
  return (handler: Handler) => async (req: NextRequest) => {
    const ip     = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
    const ipHash = sha256(ip + process.env.IP_SALT!);
    const key    = `rl:${req.nextUrl.pathname}:${ipHash}`;
    const ok     = await rateLimit(key, config.max, config.windowSec);
    if (!ok) return jsonError('Too many requests', 429);
    return handler(req);
  };
}

// Middleware: validate body với Zod schema
export function withBody<T>(schema: z.ZodSchema<T>): Middleware {
  return (handler: Handler) => async (req: NextRequest) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonError('Invalid JSON body', 400);
    }

    const result = schema.safeParse(body);
    if (!result.success) {
      return jsonValidationError(formatZodErrors(result.error));
    }

    // Inject parsed+sanitized body vào header (workaround cho NextRequest immutable)
    const headers = new Headers(req.headers);
    headers.set('x-parsed-body', JSON.stringify(result.data));
    return handler(new NextRequest(req, { headers }));
  };
}

// Middleware: CSRF origin check
export function withOriginCheck(handler: Handler): Handler {
  return async (req: NextRequest) => {
    const origin = req.headers.get('origin');
    const host   = req.headers.get('host');
    if (!origin || new URL(origin).host !== host) {
      return jsonError('Forbidden', 403);
    }
    return handler(req);
  };
}

// ─── Usage trong route handler ───────────────────────────────────────────
// Rất rõ ràng — đọc biết ngay: rate limit → auth → origin check → body validate → handler
const handler = compose(
  withRateLimit(APP_CONFIG.rateLimits.adminLogin),
  withAuth,
  withOriginCheck,
  withBody(UpdateBrokerLinkSchema),
)(updateBrokerLinkHandler);
```

### 21.9 Error Classes — Typed errors, không throw string

```typescript
// lib/errors.ts

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, identifier: string) {
    super('NOT_FOUND', `${entity} not found: ${identifier}`, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class ValidationError extends AppError {
  constructor(
    public readonly fields: Record<string, string[]>,
  ) {
    super('VALIDATION_ERROR', 'Validation failed', 400);
  }
}

// Global error handler trong route — không duplicate try/catch ở mọi nơi
export function withErrorHandling(handler: Handler): Handler {
  return async (req: NextRequest) => {
    try {
      return await handler(req);
    } catch (err) {
      if (err instanceof SecurityError) {
        logger.error('security_error', err);
        return jsonError('Forbidden', 403);
      }
      if (err instanceof NotFoundError)    return jsonError(err.message, 404);
      if (err instanceof ConflictError)    return jsonError(err.message, 409);
      if (err instanceof UnauthorizedError) return jsonError(err.message, 401);
      if (err instanceof ValidationError)  return jsonValidationError(err.fields);
      if (err instanceof AppError) {
        logger.error(err.code, err);
        return jsonError(err.message, err.statusCode);
      }
      // Unknown error — không leak message
      logger.error('unhandled_error', err);
      return jsonError('Internal server error', 500);
    }
  };
}
```

### 21.10 Dependency Injection — wiring tất cả lại

```typescript
// lib/container.ts — DI Container đơn giản, không cần framework
import { DatabaseConnection }      from '@/infrastructure/db/connection';
import { MysqlPostRepository }     from '@/infrastructure/db/MysqlPostRepository';
import { MysqlBrokerRepository }   from '@/infrastructure/db/MysqlBrokerRepository';
import { RedisClient }             from '@/infrastructure/cache/RedisClient';
import { R2StorageService }        from '@/infrastructure/storage/R2StorageService';
import { PostService }             from '@/domain/post/PostService';
import { BrokerService }           from '@/domain/broker/BrokerService';
import { ClickTrackingService }    from '@/domain/click/ClickTrackingService';
import { AuditLogService }         from '@/domain/audit/AuditLogService';

// Lazy singleton — chỉ khởi tạo 1 lần khi dùng
let _db:    DatabaseConnection | null = null;
let _redis: RedisClient | null        = null;

export function getDb() {
  if (!_db) _db = new DatabaseConnection(process.env.DATABASE_URL!);
  return _db;
}

export function getRedis() {
  if (!_redis) _redis = new RedisClient(process.env.REDIS_URL!);
  return _redis;
}

// Services — inject dependencies rõ ràng
export function getPostService() {
  return new PostService(
    new MysqlPostRepository(getDb()),
    new AuditLogService(getDb()),
  );
}

export function getBrokerService() {
  return new BrokerService(
    new MysqlBrokerRepository(getDb()),
    new AuditLogService(getDb()),
    getRedis(),
  );
}

export function getClickTrackingService() {
  return new ClickTrackingService(
    getDb(),
    getRedis(),
  );
}
```

**Dùng trong route handler:**
```typescript
// app/api/admin/posts/route.ts — thin handler, toàn bộ logic ở service
export const POST = withErrorHandling(
  compose(
    withRateLimit(APP_CONFIG.rateLimits.adminLogin),
    withAuth,
    withOriginCheck,
    withBody(CreatePostSchema),
  )(async (req: NextRequest) => {
    const adminId  = parseInt(req.headers.get('x-admin-id')!);
    const postData = JSON.parse(req.headers.get('x-parsed-body')!);

    const service = getPostService();           // DI
    const post    = await service.createPost(postData, adminId);

    return jsonOk(toPostDTO(post));             // DTO — không trả raw DB row
  })
);
```

---
*spec.md v1.4 — PIPSNOTE Platform*
*Changelog:*
- *v1.4: Section 20 (Response Envelope, DTO, HMAC request signing, response integrity, log masking). Section 21 (Clean Architecture, global config/i18n/routes, CSS design tokens, UI Primitives, Zod schemas tập trung, Security Guards XSS/Path/SQLi, Repository Pattern, DI Container, Middleware compose, typed Error classes). Clarify "GG" = Google organic — không cần Financial cert.*
- *v1.3: Rewrite Section 8 (SEO — YMYL/E-E-A-T/Schema.org/programmatic SEO/CWV 2026 INP). Rewrite Section 9 (Ads compliance 2026, Consent Mode v2, GTM, Enhanced Conversions, AdSense). Section 18 (3-channel GTM). Update §13 risk.*
- *v1.2: Section 16 SECURITY (defense in depth). Nginx §2.1 security headers. Docker network isolation §10.2.*
- *v1.1: Section 5 (SSE ticker). Section 6 (affiliate zero-miss-click).*
- *v1.0: Initial spec.*
