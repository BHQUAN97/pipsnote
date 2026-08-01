import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { checkRateLimit } from './lib/security/rateLimiter';
import { isIpBlocked } from './lib/security/loginGuard';

const handleI18nRouting = createMiddleware(routing);

export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // /api/** và /admin/** không có locale — giữ nguyên logic bảo mật hiện có, không đụng i18n.
  if (pathname.startsWith('/api') || pathname.startsWith('/admin')) {
    const ip = req.headers.get('cf-connecting-ip') ||
               req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               req.headers.get('x-real-ip') ||
               'unknown';

    // 1. Check IP block (login guard)
    if (await isIpBlocked(ip)) {
      return NextResponse.json(
        { error: 'Too many failed login attempts. Try again later.' },
        { status: 403 }
      );
    }

    // 2. Rate limit check (admin routes only)
    if (pathname.startsWith('/api/admin')) {
      const { allowed, remaining } = await checkRateLimit(ip, pathname);

      if (!allowed) {
        return NextResponse.json(
          { error: 'Too many requests' },
          {
            status: 429,
            headers: {
              'X-RateLimit-Remaining': remaining.toString(),
              'Retry-After': '60',
            },
          }
        );
      }
    }

    return NextResponse.next();
  }

  // Mọi path công khai còn lại (không phải /go, /api, /admin) → locale routing.
  return handleI18nRouting(req);
}

export const config = {
  matcher: [
    '/api/:path*',
    '/admin/:path*',
    '/((?!api|admin|go|_next|_vercel|.*\\..*).*)',
  ],
};
