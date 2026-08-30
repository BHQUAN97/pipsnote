import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { checkRateLimit } from './lib/security/rateLimiter';
import { isIpBlocked } from './lib/security/loginGuard';

// ĐỔI TỪ geo-IP sang Accept-Language — thân thiện hơn với người dùng thật:
// trình duyệt luôn gửi danh sách ngôn ngữ ưa thích theo vị trí/cài đặt của người
// dùng (header Accept-Language), nên detect chuẩn hơn cf-ipcountry (chỉ có khi
// qua Cloudflare mà site này không dùng).
const LOCALES = routing.locales;

// Phân tích Accept-Language: "fr-FR,fr;q=0.9,vi;q=0.8" → ["fr","vi",...] theo q-value
function parseAcceptLanguage(header: string | null): string[] {
  if (!header) return [];
  return header
    .split(',')
    .map((part) => {
      const [tag, quality] = part.trim().split(';');
      let q = quality && quality.startsWith('q=') ? parseFloat(quality.slice(2)) : 1;
      if (Number.isNaN(q)) q = 1;
      return { lang: tag.split('-')[0].toLowerCase(), q };
    })
    .filter(({ q }) => q > 0)
    .sort((a, b) => b.q - a.q)
    .map(({ lang }) => lang);
}

function resolveGeoDefaultLocale(req: NextRequest): (typeof routing.locales)[number] {
  // Cookie lưu lựa chọn trước — tôn trọng tuyệt đối
  const cookie = req.cookies.get('NEXT_LOCALE')?.value;
  if (cookie && (LOCALES as readonly string[]).includes(cookie)) {
    return cookie as (typeof routing.locales)[number];
  }

  // Ưu tiên Accept-Language hợp lệ, khớp với một locale site có
  const accepted = parseAcceptLanguage(req.headers.get('accept-language'));
  for (const lang of accepted) {
    if (lang === 'en') return 'en';
    if ((LOCALES as readonly string[]).includes(lang)) {
      return lang as (typeof routing.locales)[number];
    }
  }

  return routing.defaultLocale;
}

export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (pathname.startsWith('/api') || pathname.startsWith('/admin')) {
    const ip = req.headers.get('x-real-ip') ||
               req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               req.headers.get('x-vercel-ip-country-code') ||
               'unknown';

    if (await isIpBlocked(ip)) {
      return NextResponse.json(
        { error: 'Too many failed login attempts. Try again later.' },
        { status: 403 }
      );
    }

    if (pathname.startsWith('/api/admin')) {
      const { allowed, remaining } = await checkRateLimit(ip, pathname);
      if (!allowed) {
        return NextResponse.json(
          { error: 'Too many requests' },
          { status: 429, headers: { 'X-RateLimit-Remaining': remaining.toString(), 'Retry-After': '60' } }
        );
      }
    }

    return NextResponse.next();
  }

  const handleI18nRouting = createMiddleware({
    ...routing,
    defaultLocale: resolveGeoDefaultLocale(req),
  });
  return handleI18nRouting(req);
}

export const config = {
  matcher: [
    '/api/:path*',
    '/admin/:path*',
    '/((?!api|admin|go|_next|_vercel|.*\\..*).*)',
  ],
};