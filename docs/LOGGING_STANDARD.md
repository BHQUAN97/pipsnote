# LOGGING_STANDARD.md — pipsnote

Quy chuẩn logging ứng dụng (app-level — khác với log hạ tầng Docker/Nginx đã mô tả ở spec §16.10 "Log tập trung"). Áp dụng khi bắt đầu code (`/build` hoặc `/spec`) — hiện tại PDHOAN mới có `index.html` nháp, chưa có code thật nên tài liệu này là **chuẩn để lập trình theo**, không phải code đã chạy.

Yêu cầu gốc: quy chuẩn log kiểu NLog (level + structured + nhiều sink), có try-catch đầy đủ ở từng route/controller log full message + stacktrace, và UI xem chi tiết log ở trang admin.

> **Phân biệt 2 loại log — không gộp chung:**
> - `system_logs` (tài liệu này) — log kỹ thuật: request lỗi, exception, stacktrace. Dành cho dev debug.
> - `admin_audit_log` (đã có sẵn trong spec §16.5) — log nghiệp vụ: ai đổi `broker_links.affiliate_url`, ai login, ai publish bài. Dành cho bảo mật/compliance.

---

## 1. Log levels (tương tự NLog: Trace/Debug/Info/Warn/Error/Fatal)

| Level | Khi dùng | Ghi vào DB (`system_logs`)? |
|---|---|---|
| `trace` | Chi tiết luồng xử lý (dev only, tắt ở production) | Không |
| `debug` | Debug thông tin (query params, cache hit/miss) | Không |
| `info` | Sự kiện bình thường (request thành công, job chạy xong) | Không (chỉ ra stdout → Docker log) |
| `warn` | Bất thường nhưng chưa gãy flow (rate limit gần chạm, retry) | Có |
| `error` | Exception bị catch, request trả 5xx | **Có, kèm full stacktrace** |
| `fatal` | Lỗi khiến process phải thoát (unhandled rejection ở top level) | **Có, kèm full stacktrace + alert ngay** |

`info` trở xuống chỉ in ra stdout (→ `docker logs` → journald, đúng §16.10). Từ `warn` trở lên mới ghi thêm vào bảng `system_logs` để admin UI query được — tránh phình bảng vì log info tần suất cao.

## 2. Format structured (JSON), không log string tự do

```ts
// Moi log line la 1 JSON object — de search/filter, khong parse string
{
  "timestamp": "2026-07-30T10:15:32.123Z",
  "level": "error",
  "module": "api.go.redirect",       // ten route/module phat sinh log
  "requestId": "01J...ULID",         // trace 1 request xuyen suot log
  "userId": "admin_01J...",          // null neu request public
  "message": "Affiliate redirect failed: broker not found",
  "meta": { "slug": "xm-broker", "ip_hash": "a1b2..." },
  "stack": "Error: broker not found\n    at GET (app/go/[slug]/route.ts:42:11)\n    ..."
}
```

## 3. Thư viện: Pino

Chọn **Pino** (không phải NLog vì đó là thư viện .NET — pipsnote dùng Node.js/Next.js). Pino là lựa chọn tương đương phổ biến nhất cho Node: log JSON structured, nhanh, hỗ trợ *child logger* (tương tự Mapped Diagnostic Context của NLog) để gắn `requestId` xuyên suốt 1 request.

```ts
// lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'trace',
  formatters: {
    level: (label) => ({ level: label }), // giu dang string "error" thay vi so
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: { module: undefined }, // se override boi child logger tung noi goi
});

// Tao child logger co requestId — dung o dau moi route handler
export function createRequestLogger(module: string, requestId: string, userId?: string) {
  return logger.child({ module, requestId, userId: userId ?? null });
}
```

```ts
// lib/logSink.ts — ghi warn/error/fatal vao DB de admin UI query
import { db } from '@/lib/db';

export async function persistLog(entry: {
  level: 'warn' | 'error' | 'fatal';
  module: string;
  requestId: string;
  userId?: string | null;
  message: string;
  meta?: Record<string, unknown>;
  stack?: string;
}) {
  // Fire-and-forget, khong bao gio throw tu logger — logging loi khong duoc lam sap request
  try {
    await db.query(
      `INSERT INTO system_logs (level, module, request_id, user_id, message, meta, stack)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [entry.level, entry.module, entry.requestId, entry.userId ?? null,
       entry.message, JSON.stringify(entry.meta ?? {}), entry.stack ?? null],
    );
  } catch (dbErr) {
    // Fallback: neu ghi DB that bai, it nhat con thay trong Docker log (stdout)
    logger.error({ err: dbErr }, 'persistLog: khong ghi duoc system_logs');
  }
}
```

## 4. Try-catch bắt buộc ở mọi route handler / API entry point

**Quy tắc: mọi `route.ts` (Next.js Route Handler) và mọi API endpoint đều PHẢI wrap qua `withApiHandler()` — không viết try-catch thủ công rời rạc từng nơi (dễ quên).**

```ts
// lib/withApiHandler.ts
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createRequestLogger } from './logger';
import { persistLog } from './logSink';

type Handler = (req: NextRequest, ctx: { requestId: string; log: ReturnType<typeof createRequestLogger> }) => Promise<NextResponse>;

export function withApiHandler(moduleName: string, handler: Handler) {
  return async (req: NextRequest, ...args: unknown[]) => {
    const requestId = req.headers.get('x-request-id') ?? randomUUID();
    const log = createRequestLogger(moduleName, requestId);

    try {
      log.info({ method: req.method, url: req.url }, 'request start');
      return await handler(req, { requestId, log });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      // Log day du: message + full stacktrace — KHONG duoc nuot loi am tham
      log.error({ err: error, stack: error.stack }, error.message);
      await persistLog({
        level: 'error',
        module: moduleName,
        requestId,
        message: error.message,
        stack: error.stack,
      });

      // Client CHI nhan message chung, KHONG BAO GIO tra stacktrace ra ngoai
      // (dung checklist bao mat §16.11: "Error handler khong leak stack trace")
      return NextResponse.json(
        { success: false, message: 'Internal server error', requestId },
        { status: 500 },
      );
    }
  };
}
```

```ts
// app/go/[slug]/route.ts — vi du 1 route dung wrapper
import { withApiHandler } from '@/lib/withApiHandler';

export const GET = withApiHandler('api.go.redirect', async (req, { log }) => {
  const slug = req.nextUrl.pathname.split('/').pop();
  log.debug({ slug }, 'resolving broker link');

  const broker = await findBrokerBySlug(slug);
  if (!broker) {
    // Loi nghiep vu (khong phai bug) -> throw de wrapper log+response thong nhat
    throw new Error(`broker not found: ${slug}`);
  }

  return NextResponse.redirect(broker.affiliateUrl);
});
```

Nếu dự án dùng thêm Express (theo lựa chọn tech stack thay thế ở §1.2 spec) thì áp dụng cùng nguyên tắc qua middleware `app.use(errorHandlerMiddleware)` đặt cuối cùng — bắt mọi lỗi chưa catch, log + trả response chuẩn, không để Express in stacktrace mặc định ra response.

## 5. Schema `system_logs`

Xem migration mẫu: `db/changelog/001_logging/001_create_system_logs.sql`.

```sql
CREATE TABLE system_logs (
  id          CHAR(26) PRIMARY KEY,           -- ULID
  level       ENUM('warn','error','fatal') NOT NULL,
  module      VARCHAR(100) NOT NULL,
  request_id  CHAR(36) NOT NULL,
  user_id     VARCHAR(50) NULL,
  message     TEXT NOT NULL,
  meta        JSON NULL,
  stack       TEXT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_level_created (level, created_at),
  INDEX idx_request_id (request_id),
  INDEX idx_module (module)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Retention:** cron xóa record > 30 ngày (thêm vào `scripts/crontab.example` khi có app thật: `DELETE FROM system_logs WHERE created_at < NOW() - INTERVAL 30 DAY`) — log chi tiết chỉ cần giữ ngắn hạn để debug, khác với backup DB (giữ dài hạn để restore).

## 6. Admin UI — `/admin/logs`

Thêm route vào cây thư mục §12 spec: `app/admin/logs/page.tsx` (list) + `app/admin/logs/[id]/page.tsx` hoặc modal chi tiết.

**Danh sách (table):**
| Cột | Ghi chú |
|---|---|
| Thời gian | `created_at`, format tương đối ("5 phút trước") + tooltip full timestamp |
| Level | Badge màu: `warn`=vàng, `error`=đỏ, `fatal`=đỏ đậm/nhấp nháy |
| Module | vd `api.go.redirect` |
| Message | Truncate 1 dòng, click để xem chi tiết |
| Request ID | Copy-to-clipboard, dùng để grep log liên quan |

**Filter:** level (multi-select), khoảng thời gian, module (dropdown), free-text search trên `message`.

**Chi tiết (click 1 row → modal/drawer):** hiện đầy đủ `message`, `meta` (JSON pretty-print), **`stack` full stacktrace** (monospace, scroll, nút copy), `user_id` nếu có.

**Phân trang:** cursor-based hoặc offset, mặc định 50 dòng/trang, sort mới nhất trước.

**Quyền truy cập:** chỉ `superadmin` (dữ liệu log có thể lộ thông tin nội bộ/stacktrace — không cho admin thường xem, theo tinh thần least-privilege đã áp dụng cho DB user ở §16.6).

**Tích hợp alert (tùy chọn, tái dùng `ALERT_WEBHOOK_URL` đã có trong `scripts/monitor-disk.sh`):** khi `persistLog()` ghi level `fatal`, gọi webhook ngay lập tức thay vì chờ cron — khớp với alert trigger đã liệt kê ở spec §16.10 ("5xx rate > 5% trong 5 phút").

## 7. Checklist khi implement (bổ sung vào §16.11 spec)

- [ ] Mọi `route.ts` / API handler dùng `withApiHandler()` — không có try-catch thủ công rời rạc
- [ ] Response lỗi cho client KHÔNG BAO GIỜ chứa `stack` hay message nội bộ chi tiết
- [ ] `system_logs` chỉ ghi `warn/error/fatal` — không ghi `info/debug` (tránh phình bảng)
- [ ] Cron xóa `system_logs` > 30 ngày
- [ ] `/admin/logs` chỉ `superadmin` truy cập được
- [ ] `fatal` log bắn alert ngay (webhook), không chờ cron
