# SECURITY_DETECTION.md — Phát hiện & chặn tấn công cho pipsnote

Bổ sung cơ chế **phát hiện tấn công + tự động chặn**, đi cùng với các phần đã có trong `spec (1).md` §16 (Fail2ban, Cloudflare Bot Fight Mode, rate limit Nginx, login lockout, audit log) — tài liệu này biến các mục checklist đó thành cấu hình/code cụ thể, theo mô hình **3 lớp phòng thủ** (defense in depth — không chỉ dựa vào 1 lớp).

```
Lớp 1: Cloudflare edge   → chặn trước khi chạm VPS (DDoS, bot, WAF)
Lớp 2: Nginx + Fail2ban  → chặn theo pattern trong access log (brute-force, scan)
Lớp 3: App-level (Redis) → chặn theo hành vi nghiệp vụ (login fail, rate limit/route)
```
Vì sao 3 lớp: Cloudflare không thấy được logic nghiệp vụ (vd "10 lần login sai của user X"), Fail2ban không thấy được session/user context, chỉ app mới biết chính xác "đây là tấn công nghiệp vụ". Ngược lại app không chặn được trước khi request tốn tài nguyên VPS — cần cả 3.

---

## Lớp 1 — Cloudflare (đã có trong spec §16.11, không lặp lại ở đây)
- Proxy ON + Bot Fight Mode + WAF managed rules (free tier đủ dùng giai đoạn đầu).
- Rate limiting rule: `POST /admin/login` ≤ 5 req/phút/IP → Block 1h (cấu hình trên Cloudflare dashboard, không phải code trong repo này).

## Lớp 2 — Nginx + Fail2ban (MỚI — file thật trong `security/fail2ban/`)

| File | Phát hiện |
|---|---|
| `security/fail2ban/filter.d/pipsnote-admin-login.conf` | Brute-force `/admin/login`: ≥10 lần 401/429 trong 10 phút → ban 1h |
| `security/fail2ban/filter.d/pipsnote-scan.conf` | Scan lỗ hổng phổ biến (`wp-admin`, `.env`, `.git/`, `phpmyadmin`...) hoặc 404 spam: ≥15 lần trong 5 phút → ban 24h |
| `security/fail2ban/jail.d/pipsnote.conf` | Jail config — copy vào `/etc/fail2ban/jail.d/`, filter vào `/etc/fail2ban/filter.d/` |

### Setup trên VPS
```bash
apt install fail2ban -y
cp security/fail2ban/filter.d/*.conf /etc/fail2ban/filter.d/
cp security/fail2ban/jail.d/pipsnote.conf /etc/fail2ban/jail.d/
systemctl enable --now fail2ban
fail2ban-client status pipsnote-admin-login   # verify jail dang chay
```

### ⚠️ Bắt buộc: khôi phục real client IP trước khi bật jail

VPS đứng sau Cloudflare proxy → Nginx access log mặc định ghi **IP của Cloudflare edge**, không phải IP thật của attacker. Nếu ban theo log này sẽ **ban nhầm Cloudflare** (sập toàn site). Phải cấu hình `shared-nginx` khôi phục real IP trước:

```nginx
# Them vao http{} block cua shared-nginx (ngoai repo nay, sua truc tiep tren VPS)
# Danh sach IP Cloudflare: https://www.cloudflare.com/ips/
set_real_ip_from 173.245.48.0/20;
set_real_ip_from 103.21.244.0/22;
# ... (toan bo dai IP Cloudflare, script tu dong sync co the dung o §16.2 spec)
real_ip_header CF-Connecting-IP;
```
Sau khi cấu hình đúng, `$remote_addr` trong access log = IP thật → fail2ban ban đúng người.

## Lớp 3 — App-level (Redis-based, MỚI — chưa có code app nên đây là chuẩn implement khi `/build`)

Bổ sung cụ thể cho checklist đã có sẵn ở spec §16.11 ("Login lockout sau 10 fail"): dùng Redis đếm sliding-window, tự động thêm IP vào blocked-set, middleware chặn NGAY từ đầu request (nhanh hơn nhiều so với chờ Fail2ban parse log).

### `lib/security/rateLimiter.ts` — sliding window đếm theo IP+route
```ts
import { redis } from '@/lib/redis';

export async function checkRateLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, windowSec);
  return count <= limit; // true = con duoc phep, false = vuot nguong
}
```

### `lib/security/loginGuard.ts` — dem login fail, auto-block khi qua nguong
```ts
import { redis } from '@/lib/redis';
import { persistLog } from '@/lib/logSink'; // dung chung voi LOGGING_STANDARD.md

const MAX_FAILS = 10;
const LOCK_WINDOW_SEC = 600;     // dem trong 10 phut
const BLOCK_TTL_SEC = 3600;      // block 1h — khop bantime cua fail2ban jail

export async function recordLoginFailure(ip: string, username: string, requestId: string) {
  const key = `login-fail:${ip}`;
  const fails = await redis.incr(key);
  if (fails === 1) await redis.expire(key, LOCK_WINDOW_SEC);

  if (fails >= MAX_FAILS) {
    // Chan ngay tai app-level — khong cho request tiep theo cua IP nay lot qua middleware
    await redis.set(`blocked_ips:${ip}`, '1', 'EX', BLOCK_TTL_SEC);

    await persistLog({
      level: 'error',
      module: 'security.login-guard',
      requestId,
      message: `IP ${ip} bi auto-block sau ${fails} lan dang nhap sai (username: ${username})`,
      meta: { ip, username, fails },
    });

    // Tich hop voi ALERT_WEBHOOK_URL da co san trong scripts/monitor-disk.sh (§16.10 spec)
    if (process.env.ALERT_WEBHOOK_URL) {
      await fetch(process.env.ALERT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `[pipsnote] Auto-blocked IP ${ip} — ${fails} login fails` }),
      }).catch(() => {}); // khong de alert fail lam sap flow chinh
    }
  }
}

export async function isIpBlocked(ip: string): Promise<boolean> {
  return (await redis.exists(`blocked_ips:${ip}`)) === 1;
}
```

### `middleware.ts` — chan o edge cua Next.js TRUOC khi vao route
```ts
import { NextRequest, NextResponse } from 'next/server';
import { isIpBlocked } from '@/lib/security/loginGuard';
import { checkRateLimit } from '@/lib/security/rateLimiter';

export async function middleware(req: NextRequest) {
  const ip = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for') ?? 'unknown';

  if (await isIpBlocked(ip)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  // Defense-in-depth: rate limit app-level rieng cho /go/* (chong click-fraud/scrape affiliate link)
  // bo sung them cho Nginx zone "go" da dinh nghia o spec §2.1 — khong thay the, chi bo tro
  if (req.nextUrl.pathname.startsWith('/go/')) {
    const ok = await checkRateLimit(`ratelimit:go:${ip}`, 20, 10); // 20 req / 10s / IP
    if (!ok) return new NextResponse('Too Many Requests', { status: 429 });
  }

  return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*', '/go/:path*', '/api/:path*'] };
```

### Wiring vào form login thật (`app/admin/login`)
Sau khi verify password sai → gọi `recordLoginFailure(ip, username, requestId)`. Sau khi login đúng → `redis.del('login-fail:'+ip)` để reset counter (tránh user thật gõ sai vài lần rồi đăng nhập đúng vẫn bị đếm dồn qua ngày sau).

## Liên kết với các phần đã scaffold trước

- Mọi block/detect ở lớp 3 ghi qua `persistLog()` (`docs/LOGGING_STANDARD.md`) → xem được ngay ở `/admin/logs` với `module=security.*`.
- Sự kiện brute-force nhắm vào tài khoản admin cụ thể → ghi thêm 1 dòng `admin_audit_log` (đã có sẵn ở spec §16.5) để phân biệt với log kỹ thuật thường.
- Alert dùng chung `ALERT_WEBHOOK_URL` đã định nghĩa trong `scripts/monitor-disk.sh` — 1 điểm cấu hình webhook duy nhất cho toàn bộ hệ thống cảnh báo (disk, security, uptime).

## Checklist bổ sung (nối vào §16.11 spec)

- [ ] Fail2ban 2 jail (`pipsnote-admin-login`, `pipsnote-scan`) đang chạy — `fail2ban-client status`
- [ ] Nginx đã cấu hình `set_real_ip_from`/`real_ip_header` cho dải IP Cloudflare — verify bằng `tail /var/log/nginx/pipsnote-access.log` thấy IP thật, không phải IP Cloudflare (bắt đầu `173.245.`, `103.21.`...)
- [ ] `middleware.ts` chặn `blocked_ips` trước mọi route nhạy cảm (`/admin/*`, `/go/*`, `/api/*`)
- [ ] Login fail reset counter sau khi login đúng (tránh khóa nhầm user thật)
- [ ] Test giả lập: 11 lần login sai liên tiếp → xác nhận IP bị 403 ở lần thứ 12, xuất hiện trong `/admin/logs`
